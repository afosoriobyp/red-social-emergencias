import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" || session.role === "coordinador" ? "/dashboard" : "/");
  }
  return <AuthForm />;
}