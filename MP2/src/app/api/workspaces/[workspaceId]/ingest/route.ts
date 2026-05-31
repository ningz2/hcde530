import { createTraceId } from "@/lib/api/trace";
import { authorizeWorkspaceAction } from "@/lib/api/guards";
import { extractAndStore } from "@/domain/services/normalization";
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

    const result = await extractAndStore({
      workspaceId,
      submittedByUserId: session.identity.userId,
      sourceType: input.sourceType,
      payload: input.content,
      filename: input.filename
    });

    if (result.codeCount === 0) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "We couldn't find any codes in that data. For CSV, include a 'code' column (optionally 'quote', 'memo', 'participant'); for text, put one code per line.",
        400
      );
    }

    return ok(
      {
        workspaceId,
        ingestion: {
          uploadId: result.uploadId,
          // Raw discarded after extraction; masking decision happens in the next step.
          status: "EXTRACTED_PENDING_CONSENT",
          rawRetained: false,
          codeCount: result.codeCount,
          participants: result.participants
        }
      },
      201
    );
  } catch (error) {
    return toErrorResponse(error, traceId);
  }
}
