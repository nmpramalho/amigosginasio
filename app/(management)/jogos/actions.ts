"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const phases = ["first_leg", "second_leg", "qualification"];

function invalid(): never {
  redirect("/jogos?status=invalid");
}

function validId(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && uuid.test(value);
}

function cleanText(form: FormData, key: string, min: number, max: number): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length >= min && cleaned.length <= max ? cleaned : null;
}

function parseDate(form: FormData): string | null {
  const date = form.get("date");
  const hour = form.get("hour");
  const minute = form.get("minute");
  if (typeof date !== "string" || typeof hour !== "string" || typeof minute !== "string") return null;
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (!parts || !/^(?:[01]\d|2[0-3])$/.test(hour) || !/^(?:00|15|30|45)$/.test(minute)) return null;
  const day = Number(parts[1]);
  const month = Number(parts[2]);
  const year = Number(parts[3]);
  if (year < 1900 || year > 2199 || month < 1 || month > 12 ||
      day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return `${parts[3]}-${parts[2]}-${parts[1]}T${hour}:${minute}`;
}

function numberField(form: FormData, key: string, min: number, max: number): number | null {
  const raw = form.get(key);
  if (raw === "") return null;
  if (typeof raw !== "string" || !/^(0|[1-9]\d{0,2})$/.test(raw)) throw new Error("Número inválido");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error("Número inválido");
  return value;
}

export async function createMatch(form: FormData): Promise<void> {
  await requireAdmin();
  const season = form.get("seasonId");
  const team = form.get("teamId");
  const opponent = cleanText(form, "opponent", 2, 120);
  const round = cleanText(form, "round", 1, 80);
  const date = parseDate(form);
  const phase = form.get("phase");
  const home = form.get("home");
  const venue = form.get("venue");

  if (!validId(season) || !validId(team) || !opponent || !round || !date ||
      typeof phase !== "string" || !phases.includes(phase) ||
      (home !== "true" && home !== "false") ||
      typeof venue !== "string" || venue.trim().length > 120) invalid();

  const sql = getDatabase();
  const rows = await sql`
    INSERT INTO public.team_matches
      (season_id, team_id, opponent_name, division, phase, round_label,
       is_home, original_at, scheduled_at, venue)
    SELECT t.season_id, t.id, ${opponent}::text, t.division, ${phase}::text,
           ${round}::text, ${home === "true"},
           ${date}::timestamp AT TIME ZONE 'Europe/Lisbon',
           ${date}::timestamp AT TIME ZONE 'Europe/Lisbon',
           ${venue.trim() || null}::text
    FROM public.teams t
    WHERE t.id = ${team}::uuid AND t.season_id = ${season}::uuid
      AND t.division IN (1, 2)
    RETURNING id
  `;
  if (!rows.length) invalid();
  revalidatePath("/jogos");
  revalidatePath("/dashboard");
  redirect("/jogos?status=created");
}

export async function saveMatch(form: FormData): Promise<void> {
  const actor = await requireAdmin();
  const match = form.get("matchId");
  const team = form.get("teamId");
  const opponent = cleanText(form, "opponent", 2, 120);
  const date = parseDate(form);
  const venue = form.get("venue");
  const phase = form.get("phase");
  const round = cleanText(form, "round", 1, 80);
  const home = form.get("home");

  if (!validId(match) || !validId(team) || !opponent || !date || !round ||
      typeof venue !== "string" || venue.trim().length > 120 ||
      typeof phase !== "string" || !phases.includes(phase) ||
      (home !== "true" && home !== "false")) invalid();

  const selectedIds = [1, 2, 3, 4].map((position) => form.get(`player${position}`));
  if (selectedIds.every((id) => id === "" || id === null)) {
    // Do not silently discard scores or opponent names if a partial lineup was cleared.
    if ([1, 2, 3, 4].some((position) =>
      ["opponentPlayer", "localCaroms", "opponentCaroms", "localInnings", "opponentInnings"]
        .some((key) => String(form.get(`${key}${position}`) ?? "").trim() !== ""))) invalid();
    const sql = getDatabase();
    const rows = await sql`
      SELECT public.save_team_match_details_only(
        ${match}::uuid, ${team}::uuid, ${opponent}::text, ${date}::timestamp,
        ${venue.trim()}::text, ${phase}::text, ${round}::text,
        ${home === "true"}::boolean, ${actor.id}::uuid
      ) AS result`;
    const result = rows[0]?.result;
    if (result !== "saved") {
      const status = result === "team" || result === "missing-or-lineup" ? result : "invalid";
      redirect(`/jogos?status=${status}&match=${match}`);
    }
    revalidatePath("/jogos");
    revalidatePath("/dashboard");
    redirect("/jogos?status=saved");
  }
  if (selectedIds.some((id) => !validId(id))) invalid();
  let games: {
    position: number;
    playerId: string;
    opponentPlayer: string | null;
    localCaroms: number | null;
    opponentCaroms: number | null;
    localInnings: number | null;
    opponentInnings: number | null;
  }[];

  try {
    games = [1, 2, 3, 4].map((position) => {
      const playerId = form.get(`player${position}`);
      const opponentPlayer = form.get(`opponentPlayer${position}`);
      if (!validId(playerId) || typeof opponentPlayer !== "string" ||
          opponentPlayer.trim().length > 120) throw new Error("Jogador inválido");

      const localCaroms = numberField(form, `localCaroms${position}`, 0, 999);
      const opponentCaroms = numberField(form, `opponentCaroms${position}`, 0, 999);
      const localInnings = numberField(form, `localInnings${position}`, 1, 999);
      const opponentInnings = numberField(form, `opponentInnings${position}`, 1, 999);
      const numbers = [localCaroms, opponentCaroms, localInnings, opponentInnings];
      if (numbers.some((value) => value !== null) &&
          (numbers.some((value) => value === null) || opponentPlayer.trim().length < 2)) {
        throw new Error("Resultado incompleto");
      }
      return {
        position, playerId, opponentPlayer: opponentPlayer.trim() || null,
        localCaroms, opponentCaroms, localInnings, opponentInnings,
      };
    });
  } catch {
    invalid();
  }

  if (new Set(games.map((game) => game.playerId)).size !== 4) invalid();

  const sql = getDatabase();
  const rows = await sql`
    SELECT public.save_team_match_modal_v3(
      ${match}::uuid,
      ${team}::uuid,
      ${opponent}::text,
      ${date}::timestamp,
      ${venue.trim()}::text,
      ${phase}::text,
      ${round}::text,
      ${home === "true"}::boolean,
      ${JSON.stringify(games)}::jsonb,
      ${actor.id}::uuid
    ) AS result
  `;
  const result = rows[0]?.result;
  if (result !== "saved") {
    const allowed = ["missing", "team", "order", "membership", "score", "invalid"];
    const status = typeof result === "string" && allowed.includes(result) ? result : "invalid";
    redirect(`/jogos?status=${status}&match=${match}`);
  }
  // Never report success if the four lineup rows are not actually persisted.
  const persisted = await sql`SELECT position,player_id FROM public.team_match_games
    WHERE match_id=${match}::uuid ORDER BY position`;
  if (persisted.length !== 4 || persisted.some((row, index) =>
    Number(row.position) !== index + 1 || String(row.player_id) !== games[index].playerId)) {
    redirect(`/jogos?status=not-persisted&match=${match}`);
  }
  revalidatePath("/jogos");
  revalidatePath("/dashboard");
  redirect("/jogos?status=saved");
}

// A database function archives a snapshot before deleting related rows atomically.
export async function deleteMatch(form: FormData): Promise<void> {
  const actor = await requireAdmin();
  const match = form.get("matchId");
  if (!validId(match)) invalid();
  const sql = getDatabase();
  const rows = await sql`SELECT public.delete_team_match_with_audit(${match}::uuid, ${actor.id}::uuid) AS deleted`;
  if (!rows[0]?.deleted) redirect("/jogos?status=missing");
  revalidatePath("/jogos");
  revalidatePath("/dashboard");
  revalidatePath("/estatisticas");
  redirect("/jogos?status=deleted");
}
