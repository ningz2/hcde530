import { colorTokenForIndex } from "@/lib/color/palette";
import { repo, type UploadInputType } from "@/lib/repo/store";
import { RealAnonymizationService } from "@/domain/services/anonymization";
import { RealParserService } from "@/domain/services/parser";

const parser = new RealParserService();
const anonymizer = new RealAnonymizationService();

export type IngestResult = {
  uploadId: string;
  quoteCount: number;
  anonymizationApplied: boolean;
  rawRetained: false;
  participants: { anonymizedLabel: string; colorToken: string }[];
  maskingNotes: string[];
};

/**
 * Mock-to-real ingestion pipeline:
 *   parse -> anonymize (consent-aware) -> normalize to quote items -> persist
 *
 * Raw source discard policy is represented explicitly: the raw `payload` is only
 * used transiently for extraction and is never persisted. We record the discard
 * on the upload (`rawRetained: false`) and in the activity log.
 */
export async function ingestAndStore(params: {
  workspaceId: string;
  submittedByUserId: string;
  sourceType: UploadInputType;
  payload: string;
  filename?: string;
  consentGranted: boolean;
  optOut: boolean;
}): Promise<IngestResult> {
  const parsed = await parser.parse({
    sourceType: params.sourceType,
    payload: params.payload,
    filename: params.filename
  });

  const anonymized = await anonymizer.maskQuotes({
    quotes: parsed,
    consentGranted: params.consentGranted,
    optOut: params.optOut
  });

  const anonymizationApplied = params.consentGranted && !params.optOut;

  const upload = repo.createUpload({
    workspaceId: params.workspaceId,
    submittedByUserId: params.submittedByUserId,
    sourceType: params.sourceType,
    originalFilename: params.filename,
    anonymizationState: anonymizationApplied ? "APPLIED" : "SKIPPED",
    anonymizationOptOut: params.optOut,
    rawRetained: false
  });

  // Raw discard: the transient payload is intentionally not persisted anywhere.
  // Only normalized + (optionally) anonymized quote items below are stored.
  repo.logActivity({
    workspaceId: params.workspaceId,
    actorUserId: params.submittedByUserId,
    action: "raw_source_discarded",
    targetType: "Upload",
    targetId: upload.id
  });

  const participantTokens = new Map<string, string>();
  const allMaskingNotes = new Set<string>();

  for (const quote of anonymized) {
    const participant = repo.ensureParticipant({
      workspaceId: params.workspaceId,
      sourceLabel: quote.participantLabel,
      anonymizedLabel: quote.participantLabel,
      assignColorToken: (existingCount) => colorTokenForIndex(existingCount)
    });

    participantTokens.set(participant.anonymizedLabel, participant.colorToken);
    quote.maskingNotes.forEach((note) => allMaskingNotes.add(note));

    repo.createQuote({
      workspaceId: params.workspaceId,
      uploadId: upload.id,
      participantId: participant.id,
      content: quote.text,
      sourceRef: quote.sourceRef,
      piiMasked: quote.piiMasked,
      state: "ACTIVE"
    });
  }

  return {
    uploadId: upload.id,
    quoteCount: anonymized.length,
    anonymizationApplied,
    rawRetained: false,
    participants: [...participantTokens.entries()].map(([anonymizedLabel, colorToken]) => ({
      anonymizedLabel,
      colorToken
    })),
    maskingNotes: [...allMaskingNotes]
  };
}
