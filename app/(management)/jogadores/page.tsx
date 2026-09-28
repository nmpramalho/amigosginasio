import type { Metadata } from "next";
import { requireUser } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { PlayersList, type Player, type LinkedUser } from "./players-list";
import { createPlayer, updatePlayer, deletePlayer } from "./actions";

export const metadata: Metadata = { title: "Jogadores" };

const notices: Record<string, { message: string; error?: boolean }> = {
  created: { message: "Jogador criado com sucesso." },
  updated: { message: "Jogador atualizado com sucesso." },
  deleted: { message: "Jogador eliminado com sucesso." },
  invalid: { message: "Confirma os dados da ficha e tenta novamente.", error: true },
  duplicate: { message: "O número de afiliado ou o login já está associado a outro jogador.", error: true },
  related: { message: "Este jogador tem dados relacionados e não pode ser eliminado.", error: true },
  missing: { message: "O jogador já não existe.", error: true },
  "user-invalid": { message: "O login selecionado já não está ativo ou não existe.", error: true },
  "photo-invalid": { message: "A fotografia deve ser JPG, PNG ou WebP, até 2 MB.", error: true },
};

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const sql = getDatabase();

  // Current team is resolved from the active season; never stored on players.
  // Query contact and login details only for admins, not merely hide them in the browser.
  const players = isAdmin
    ? await sql`SELECT p.id, p.name, p.federation_number, p.contact_email,
          p.mobile_phone, p.user_id, p.is_active, p.photo_key IS NOT NULL AS has_photo,
          u.email AS login_email, p.updated_at, t.name AS team_name
        FROM public.players p LEFT JOIN public.users u ON u.id = p.user_id
        LEFT JOIN public.team_memberships m ON m.player_id = p.id AND m.ended_at IS NULL
          AND m.season_id = (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1)
        LEFT JOIN public.teams t ON t.id = m.team_id
        ORDER BY p.name, p.id`
    : await sql`SELECT p.id, p.name, p.federation_number, p.is_active,
          p.photo_key IS NOT NULL AS has_photo, p.updated_at, t.name AS team_name
        FROM public.players p
        LEFT JOIN public.team_memberships m ON m.player_id = p.id AND m.ended_at IS NULL
          AND m.season_id = (SELECT id FROM public.seasons WHERE is_active = true LIMIT 1)
        LEFT JOIN public.teams t ON t.id = m.team_id
        ORDER BY p.name, p.id`;
  const users = isAdmin
    ? await sql`SELECT id, name, email FROM public.users WHERE active = true ORDER BY name, email`
    : [];
  const { status } = await searchParams;
  const notice = status ? notices[status] : undefined;

  return (
    <>
      <PageHeading title="Jogadores" description="Jogadores da Associação dos Amigos do Ginásio." />
      {notice && <p role={notice.error ? "alert" : "status"}
        className={`mb-5 rounded-lg p-3 text-sm ${notice.error ? "bg-red-50 text-red-700" : "bg-[var(--club-green-50)] text-[var(--club-green-700)]"}`}>
        {notice.message}
      </p>}
      <PlayersList players={players as Player[]} users={users as LinkedUser[]}
        isAdmin={isAdmin} createAction={createPlayer}
        updateAction={updatePlayer} deleteAction={deletePlayer} />
    </>
  );
}
