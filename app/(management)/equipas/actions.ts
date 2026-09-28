"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const path = "/equipas";
function go(seasonId: string, status: string, teamId?: string): never {
  const query = new URLSearchParams({ season: seasonId, status });
  if (teamId) query.set("team", teamId);
  redirect(`${path}?${query.toString()}`);
}
function validId(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && uuid.test(value);
}
function code(error: unknown): string | undefined {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code) : undefined;
}
function refresh() {
  revalidatePath(path);
  revalidatePath("/jogadores");
  revalidatePath("/dashboard");
  revalidatePath("/jogos");
}

export async function createTeam(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const rawName = form.get("name");
  const division = form.get("division");
  if (!validId(season) || typeof rawName !== "string") redirect(path);
  if (division !== "1" && division !== "2") go(season, "invalid");
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) go(season, "invalid");
  const sql = getDatabase();
  try {
    await sql`INSERT INTO public.teams (season_id, name, division) VALUES (${season}::uuid, ${name}, ${Number(division)})`;
  } catch (error) {
    if (code(error) === "23505") go(season, "duplicate");
    if (code(error) === "23503") go(season, "invalid");
    throw error;
  }
  refresh();
  go(season, "created");
}

export async function renameTeam(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const team = form.get("teamId");
  const rawName = form.get("name");
  const division = form.get("division");
  if (!validId(season) || !validId(team) || typeof rawName !== "string") redirect(path);
  if (division !== "1" && division !== "2") go(season, "invalid", team);
  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120) go(season, "invalid");
  const sql = getDatabase();
  try {
    const rows = await sql`UPDATE public.teams SET name = ${name}, division = ${Number(division)}, updated_at = now()
      WHERE id = ${team}::uuid AND season_id = ${season}::uuid RETURNING id`;
    if (!rows.length) go(season, "missing");
  } catch (error) {
    if (code(error) === "23505") go(season, "duplicate", team);
    if (code(error) === "23514") go(season, "division-locked", team);
    throw error;
  }
  refresh();
  go(season, "renamed", team);
}

export async function deleteTeam(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const team = form.get("teamId");
  if (!validId(season) || !validId(team)) redirect(path);
  const sql = getDatabase();
  try {
    const rows = await sql`DELETE FROM public.teams WHERE id = ${team}::uuid
      AND season_id = ${season}::uuid RETURNING id`;
    if (!rows.length) go(season, "missing");
  } catch (error) {
    if (code(error) === "23503") go(season, "related");
    throw error;
  }
  refresh();
  go(season, "deleted");
}

export async function addMembership(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const team = form.get("teamId");
  const player = form.get("playerId");
  if (!validId(season) || !validId(team) || !validId(player)) redirect(path);
  const sql = getDatabase();
  try {
    const rows = await sql`INSERT INTO public.team_memberships (season_id, team_id, player_id)
      SELECT t.season_id, t.id, p.id FROM public.teams t CROSS JOIN public.players p
      WHERE t.id = ${team}::uuid AND t.season_id = ${season}::uuid
        AND p.id = ${player}::uuid AND p.is_active = true RETURNING id`;
    if (!rows.length) go(season, "invalid-player", team);
  } catch (error) {
    if (code(error) === "23505") go(season, "already-assigned", team);
    if (code(error) === "23503") go(season, "invalid-player", team);
    throw error;
  }
  refresh();
  go(season, "added", team);
}

export async function endMembership(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const team = form.get("teamId");
  const membership = form.get("membershipId");
  if (!validId(season) || !validId(team) || !validId(membership)) redirect(path);
  const sql = getDatabase();
  const rows = await sql`UPDATE public.team_memberships SET ended_at = now()
    WHERE id = ${membership}::uuid AND season_id = ${season}::uuid
      AND team_id = ${team}::uuid AND ended_at IS NULL RETURNING id`;
  if (!rows.length) go(season, "missing", team);
  refresh();
  go(season, "removed", team);
}

export async function savePhaseOrder(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const team = form.get("teamId");
  const phase = form.get("phase");
  const raw = form.get("playerIds");
  const revision = form.get("revision");
  if (!validId(season) || !validId(team) || typeof phase !== "string" ||
      !["first_leg", "second_leg", "qualification"].includes(phase) ||
      typeof raw !== "string" || raw.length > 40000 ||
      typeof revision !== "string" || !/^(0|[1-9]\d{0,8})$/.test(revision)) redirect(path);
  let ids: unknown;
  try { ids = JSON.parse(raw); } catch { go(season, "invalid-order"); }
  if (!Array.isArray(ids) || ids.length > 300 ||
      !ids.every((id) => typeof id === "string" && uuid.test(id)) ||
      new Set(ids).size !== ids.length) go(season, "invalid-order");
  const sql = getDatabase();
  const rows = await sql`SELECT public.save_team_phase_order(
    ${team}::uuid, ${season}::uuid, ${phase}, ${JSON.stringify(ids)}::jsonb,
    ${Number(revision)}::integer) AS saved`;
  if (!rows[0]?.saved) go(season, "order-conflict");
  refresh();
  const params = new URLSearchParams({ season, team, status: "order-saved" });
  redirect(`/equipas?${params.toString()}`);
}
