import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionContext();
  if (session.identity) {
    redirect("/");
  }

  return <LoginForm />;
}
