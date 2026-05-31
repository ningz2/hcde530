import { authProviders } from "@/lib/auth/providers";
import { ok } from "@/lib/errors/http";

export async function GET() {
  return ok({ providers: authProviders });
}
