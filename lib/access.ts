import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findAuthorizedUser, type AuthorizedUser } from "@/lib/access-lookup";

export async function requireUser(): Promise<AuthorizedUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return redirect("/");
  const user = await findAuthorizedUser(email);
  if (!user?.active) return redirect("/acesso-negado");
  return user;
}

export async function requireAdmin(): Promise<AuthorizedUser> {
  const user = await requireUser();
  if (user.role !== "admin") return redirect("/dashboard");
  return user;
}
