"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";

const destination = "/administracao/epocas";

export async function createSeason(formData: FormData): Promise<void> {
  await requireAdmin();
  const rawYear = formData.get("startYear");
  const year = typeof rawYear === "string" && /^\d{4}$/.test(rawYear) ? Number(rawYear) : NaN;
  if (!Number.isInteger(year) || year < 1900 || year > 2199) {
    redirect(`${destination}?status=invalid`);
  }

  const sql = getDatabase();
  const name = `${year}/${year + 1}`;
  const rows = await sql`
    INSERT INTO public.seasons (name, start_year, end_year)
    VALUES (${name}, ${year}, ${year + 1})
    ON CONFLICT DO NOTHING RETURNING id
  `;
  if (rows.length === 0) redirect(`${destination}?status=duplicate`);
  revalidatePath(destination);
  redirect(`${destination}?status=created`);
}

export async function activateSeason(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("seasonId");
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    redirect(`${destination}?status=invalid`);
  }

  const sql = getDatabase();
  const target = await sql`SELECT id, is_active FROM public.seasons WHERE id = ${id}::uuid LIMIT 1`;
  if (target.length === 0) redirect(`${destination}?status=missing`);
  if (target[0].is_active === true) redirect(`${destination}?status=already-active`);

  // A single database transaction prevents a state with no active season.
  // The unique partial index additionally protects against concurrent activations.
  try {
    await sql.transaction([
      sql`UPDATE public.seasons SET is_active = false, updated_at = now() WHERE is_active = true`,
      sql`UPDATE public.seasons SET is_active = true, updated_at = now() WHERE id = ${id}::uuid`,
    ]);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as Error & { code?: string }).code === "23505") {
      redirect(`${destination}?status=conflict`);
    }
    throw error;
  }
  revalidatePath(destination);
  revalidatePath("/dashboard");
  redirect(`${destination}?status=activated`);
}
