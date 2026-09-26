import "server-only";
import { getDatabase } from "@/lib/db";

export type AccessRole = "admin" | "captain" | "user";
export type AuthorizedUser = {
  id: string;
  email: string;
  name: string;
  role: AccessRole;
  active: boolean;
};

export async function findAuthorizedUser(email: string): Promise<AuthorizedUser | null> {
  const sql = getDatabase();
  const rows = await sql`SELECT id, email, name, role, active FROM users WHERE lower(email) = lower(${email}) LIMIT 1`;
  return (rows[0] as AuthorizedUser | undefined) ?? null;
}
