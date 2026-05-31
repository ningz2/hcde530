import { z, type ZodTypeAny } from "zod";
import { ApiError } from "@/lib/errors/types";

export async function parseJsonBody<S extends ZodTypeAny>(
  request: Request,
  schema: S
): Promise<z.infer<S>> {
  const json = await request.json().catch(() => {
    throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
  });

  const result = schema.safeParse(json);

  if (!result.success) {
    throw new ApiError("VALIDATION_ERROR", "Request validation failed.", 400, {
      issues: result.error.issues
    });
  }

  return result.data;
}
