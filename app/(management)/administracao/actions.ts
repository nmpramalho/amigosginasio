"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";

const allowedRoles = ["admin", "captain", "user"] as const;

export async function createUser(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "user");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || name.length > 120 || !allowedRoles.some((item) => item === role)) {
    redirect("/administracao?status=invalid");
  }
  const sql = getDatabase();
  await sql`INSERT INTO users (email, name, role) VALUES (${email}, ${name}, ${role}) ON CONFLICT (email) DO NOTHING`;
  revalidatePath("/administracao");
  redirect("/administracao?status=saved");
}

export async function updateUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const active = formData.get("active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !allowedRoles.some((item) => item === role)) redirect("/administracao?status=invalid");
  if (id === admin.id && (!active || role !== "admin")) redirect("/administracao?status=self");
  const sql = getDatabase();
  await sql`UPDATE users SET role = ${role}, active = ${active}, updated_at = now() WHERE id = ${id}::uuid`;
  revalidatePath("/administracao");
  redirect("/administracao?status=saved");
}
