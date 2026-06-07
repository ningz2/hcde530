import { colorTokenForIndex } from "@/lib/color/palette";
import { repo, type UploadInputType } from "@/lib/repo/store";
import { maskText } from "@/domain/services/anonymization";
import { RealParserService, UNASSIGNED_PARTICIPANT } from "@/domain/services/parser";

const parser = new RealParserService();

export type ExtractResult = {
  uploadId: string;
  codeCount: number;
  participants: { anonymizedLabel: string; colorToken: string }[];
};

export type AnonymizationResult = {
  totalCodes: number;
  /** Codes that actually had identifiers removed (some field changed). */
  maskedCount: number;
  applied: boolean;
  /** Distinct categories of identifiers found, e.g. ["email", "name"]. */
  categories: string[];
  maskingNotes: string[];
};

/**
 * Step 1 of the pipeline: parse the raw input and store normalized code items
 * (each with optional quote/memo context).
 *
 * Masking is deliberately NOT applied here — consent is a separate step. The raw
 * source payload is used only transiently for extraction and is never persisted
 * (`rawRetained: false`); only normalized code items are stored, initially in a
 * PENDING_CONSENT state.
 */
export async function extractAndStore(params: {
  workspaceId: string;
  submittedByUserId: string;
  sourceType: UploadInputType;
  payload: string;
  filename?: string;
}): Promise<ExtractResult> {
  const parsed = await parser.parse({
    sourceType: params.sourceType,
    payload: params.payload,
    filename: params.filename
  });

  const upload = await repo.createUpload({
    workspaceId: params.workspaceId,
    submittedByUserId: params.submittedByUserId,
    sourceType: params.sourceType,
    originalFilename: params.filename,
    anonymizationState: "PENDING_CONSENT",
    anonymizationOptOut: false,
    rawRetained: false
  });

  await repo.logActivity({
    workspaceId: params.workspaceId,
    actorUserId: params.submittedByUserId,
    action: "raw_source_discarded",
    targetType: "Upload",
    targetId: upload.id
  });

  const participantTokens = new Map<string, string>();

  // When a file has no participant column, treat the whole file as one
  // participant using the file name. This lets users upload one file per
  // participant and still get participant-aware colors and emphasis.
  const fileParticipant = participantFromFilename(params.filename);

  for (const item of parsed) {
    const label =
      item.participantLabel && item.participantLabel !== UNASSIGNED_PARTICIPANT
        ? item.participantLabel
        : fileParticipant ?? item.participantLabel;

    const participant = await repo.ensureParticipant({
      workspaceId: params.workspaceId,
      sourceLabel: label,
      anonymizedLabel: label,
      assignColorToken: (existingCount) => colorTokenForIndex(existingCount)
    });

    participantTokens.set(participant.anonymizedLabel, participant.colorToken);

    await repo.createCode({
      workspaceId: params.workspaceId,
      uploadId: upload.id,
      participantId: participant.id,
      code: item.code,
      quote: item.quote,
      memo: item.memo,
      sourceRef: item.sourceRef,
      piiMasked: false,
      state: "ACTIVE"
    });
  }

  return {
    uploadId: upload.id,
    codeCount: parsed.length,
    participants: [...participantTokens.entries()].map(([anonymizedLabel, colorToken]) => ({
      anonymizedLabel,
      colorToken
    }))
  };
}

/** Derive a participant label from a file name (strip path + extension). */
function participantFromFilename(filename?: string): string | undefined {
  if (!filename) return undefined;
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const withoutExt = base.replace(/\.[^.]+$/, "").trim();
  return withoutExt || undefined;
}

/**
 * Step 2 of the pipeline: apply the user's anonymization decision to the stored
 * quotes. Default product behavior is masking ON; the user may explicitly skip.
 */
export async function applyAnonymization(params: {
  workspaceId: string;
  applyMasking: boolean;
}): Promise<AnonymizationResult> {
  const codes = await repo.listCodes(params.workspaceId);
  const notes = new Set<string>();
  const categories = new Set<string>();
  let maskedCount = 0;

  if (params.applyMasking) {
    for (const item of codes) {
      if (item.piiMasked) {
        continue;
      }
      // Mask direct identifiers across all fields; skip name detection on the
      // code label (it caused false positives like "Customer" -> [NAME]).
      const maskedCode = maskText(item.code, { maskNames: false });
      const maskedQuote = item.quote ? maskText(item.quote) : undefined;
      const maskedMemo = item.memo ? maskText(item.memo) : undefined;

      const changed =
        maskedCode.text !== item.code ||
        (maskedQuote ? maskedQuote.text !== item.quote : false) ||
        (maskedMemo ? maskedMemo.text !== item.memo : false);

      await repo.updateCode(item.id, {
        code: maskedCode.text,
        quote: maskedQuote?.text ?? item.quote,
        memo: maskedMemo?.text ?? item.memo,
        piiMasked: true
      });

      [maskedCode, maskedQuote, maskedMemo].forEach((result) => {
        result?.notes.forEach((note) => notes.add(note));
        result?.categories.forEach((category) => categories.add(category));
      });

      if (changed) {
        maskedCount += 1;
      }
    }
  } else {
    notes.add("Masking skipped: codes stored as provided.");
  }

  for (const upload of await repo.listUploads(params.workspaceId)) {
    await repo.updateUpload(upload.id, {
      anonymizationState: params.applyMasking ? "APPLIED" : "SKIPPED",
      anonymizationOptOut: !params.applyMasking
    });
  }

  await repo.logActivity({
    workspaceId: params.workspaceId,
    action: params.applyMasking ? "anonymization_applied" : "anonymization_skipped",
    targetType: "Workspace",
    targetId: params.workspaceId
  });

  return {
    totalCodes: codes.length,
    maskedCount: params.applyMasking ? maskedCount : 0,
    applied: params.applyMasking,
    categories: [...categories],
    maskingNotes: [...notes]
  };
}
