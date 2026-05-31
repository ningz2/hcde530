import { colorTokenForIndex } from "@/lib/color/palette";
import { repo, type UploadInputType } from "@/lib/repo/store";
import { maskText } from "@/domain/services/anonymization";
import { RealParserService } from "@/domain/services/parser";

const parser = new RealParserService();

export type ExtractResult = {
  uploadId: string;
  quoteCount: number;
  participants: { anonymizedLabel: string; colorToken: string }[];
};

export type AnonymizationResult = {
  totalQuotes: number;
  maskedCount: number;
  applied: boolean;
  maskingNotes: string[];
};

/**
 * Step 1 of the pipeline: parse the raw input and store normalized quote items.
 *
 * Masking is deliberately NOT applied here — consent is a separate step. The raw
 * source payload is used only transiently for extraction and is never persisted
 * (`rawRetained: false`); only normalized quote items are stored, initially in a
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

  const upload = repo.createUpload({
    workspaceId: params.workspaceId,
    submittedByUserId: params.submittedByUserId,
    sourceType: params.sourceType,
    originalFilename: params.filename,
    anonymizationState: "PENDING_CONSENT",
    anonymizationOptOut: false,
    rawRetained: false
  });

  repo.logActivity({
    workspaceId: params.workspaceId,
    actorUserId: params.submittedByUserId,
    action: "raw_source_discarded",
    targetType: "Upload",
    targetId: upload.id
  });

  const participantTokens = new Map<string, string>();

  for (const quote of parsed) {
    const participant = repo.ensureParticipant({
      workspaceId: params.workspaceId,
      sourceLabel: quote.participantLabel,
      anonymizedLabel: quote.participantLabel,
      assignColorToken: (existingCount) => colorTokenForIndex(existingCount)
    });

    participantTokens.set(participant.anonymizedLabel, participant.colorToken);

    repo.createQuote({
      workspaceId: params.workspaceId,
      uploadId: upload.id,
      participantId: participant.id,
      content: quote.text,
      sourceRef: quote.sourceRef,
      piiMasked: false,
      state: "ACTIVE"
    });
  }

  return {
    uploadId: upload.id,
    quoteCount: parsed.length,
    participants: [...participantTokens.entries()].map(([anonymizedLabel, colorToken]) => ({
      anonymizedLabel,
      colorToken
    }))
  };
}

/**
 * Step 2 of the pipeline: apply the user's anonymization decision to the stored
 * quotes. Default product behavior is masking ON; the user may explicitly skip.
 */
export function applyAnonymization(params: {
  workspaceId: string;
  applyMasking: boolean;
}): AnonymizationResult {
  const quotes = repo.listQuotes(params.workspaceId);
  const notes = new Set<string>();
  let maskedCount = 0;

  if (params.applyMasking) {
    for (const quote of quotes) {
      if (quote.piiMasked) {
        maskedCount += 1;
        continue;
      }
      const { text, notes: quoteNotes } = maskText(quote.content);
      repo.updateQuote(quote.id, { content: text, piiMasked: true });
      quoteNotes.forEach((note) => notes.add(note));
      maskedCount += 1;
    }
  } else {
    notes.add("Masking skipped: quotes stored as provided.");
  }

  for (const upload of repo.listUploads(params.workspaceId)) {
    repo.updateUpload(upload.id, {
      anonymizationState: params.applyMasking ? "APPLIED" : "SKIPPED",
      anonymizationOptOut: !params.applyMasking
    });
  }

  repo.logActivity({
    workspaceId: params.workspaceId,
    action: params.applyMasking ? "anonymization_applied" : "anonymization_skipped",
    targetType: "Workspace",
    targetId: params.workspaceId
  });

  return {
    totalQuotes: quotes.length,
    maskedCount: params.applyMasking ? maskedCount : 0,
    applied: params.applyMasking,
    maskingNotes: [...notes]
  };
}
