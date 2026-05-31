import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { ingestAndStore } from "@/domain/services/normalization";
import { ApiError } from "@/lib/errors/types";
import { toErrorResponse, ok } from "@/lib/errors/http";
import { parseJsonBody } from "@/lib/validation/request";
import { ingestSchema } from "@/lib/validation/workspace";

type RouteProps = {
  params: Promise<{ workspaceId: string }>;
};

const supportedSliceTypes = new Set(["CSV", "TXT", "PASTED_TEXT"]);

export async function POST(request: Request, { params }: RouteProps) {
  const traceId = createTraceId();

  try {
    const { workspaceId } = await params;
    const { session } = await authorizeWorkspaceAction(workspaceId, "workspace.write");

    const input = await parseJsonBody(request, ingestSchema);

    if (!supportedSliceTypes.has(input.sourceType)) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "DOC/DOCX parsing is not implemented yet. Use CSV, TXT, or pasted text.",
        400
      );
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new ApiError("VALIDATION_ERROR", "Provide pasted text or file content to ingest.", 400);
    }

    const result = await ingestAndStore({
      workspaceId,
      submittedByUserId: session.identity.userId,
      sourceType: input.sourceType,
      payload: input.content,
      filename: input.filename,
      consentGranted: input.consentAnonymization,
      optOut: input.optOutAnonymization
    });

    return ok(
      {
        workspaceId,
        ingestion: {
          uploadId: result.uploadId,
          status: result.anonymizationApplied ? "ANONYMIZED" : "STORED_WITHOUT_MASKING",
          rawRetained: result.rawRetained,
          anonymizationApplied: result.anonymizationApplied,
          quoteCount: result.quoteCount,
          participants: result.participants,
          maskingNotes: result.maskingNotes
        }
      },
      201
    );
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
