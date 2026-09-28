"use client";
import { useRef, useState } from "react";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

export type Season = { id: string; name: string; is_active: boolean };
export type Team = { id: string; name: string; division: number | null };
export type PlayerOption = { id: string; name: string };
export type Membership = { id: string; player_id: string; player_name: string; historical: boolean };
export type Phase = "first_leg" | "second_leg" | "qualification";
export type PhaseOrder = { phase: Phase; player_ids: string[]; revision: number };
type Action = (form: FormData) => Promise<void>;
type Props = {
  seasons: Season[]; selectedSeasonId: string | null; teams: Team[];
  selectedTeamId: string | null; memberships: Membership[]; orders: PhaseOrder[];
  players: PlayerOption[]; isAdmin: boolean; createTeam: Action; renameTeam: Action;
  deleteTeam: Action; addMembership: Action; endMembership: Action; savePhaseOrder: Action;
};
const phases: { key: Phase; label: string }[] = [
  { key: "first_leg", label: "1.ª volta" },
  { key: "second_leg", label: "2.ª volta" },
  { key: "qualification", label: "Fase de apuramento" },
];
function initialOrders(members: Membership[], saved: PhaseOrder[]): Record<Phase, string[]> {
  const current = members.filter((m) => !m.historical).map((m) => m.player_id);
  const active = new Set(current);
  return Object.fromEntries(phases.map(({ key }) => {
    const previous = saved.find((s) => s.phase === key)?.player_ids ?? [];
    const valid = [...new Set(previous.filter((id) => active.has(id)))];
    return [key, [...valid, ...current.filter((id) => !valid.includes(id))]];
  })) as Record<Phase, string[]>;
}
function reorder(ids: string[], source: string, target: string): string[] {
  if (source === target || !ids.includes(source) || !ids.includes(target)) return ids;
  const next = ids.filter((id) => id !== source);
  next.splice(next.indexOf(target), 0, source);
  return next;
}
export function TeamsView({ seasons, selectedSeasonId, teams, selectedTeamId, memberships, orders,
  players, isAdmin, createTeam, renameTeam, deleteTeam, addMembership, endMembership,
  savePhaseOrder }: Props) {
  const [lists, setLists] = useState(() => initialOrders(memberships, orders));
  const [editing, setEditing] = useState<Team | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dragging, setDragging] = useState<{ phase: Phase; id: string } | null>(null);
  const editor = useRef<HTMLDialogElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const current = memberships.filter((m) => !m.historical);
  const previous = memberships.filter((m) => m.historical);
  const byId = new Map(current.map((m) => [m.player_id, m]));
  const team = teams.find((t) => t.id === selectedTeamId);
  function openEditor(value: Team | null) {
    setEditing(value); setEditorOpen(true);
    window.setTimeout(() => editor.current?.showModal(), 0);
  }
  function closeEditor() { editor.current?.close(); setEditorOpen(false); }
  function openDelete() { setDeleteOpen(true); window.setTimeout(() => confirmation.current?.showModal(), 0); }
  function closeDelete() { confirmation.current?.close(); setDeleteOpen(false); }
  function move(phase: Phase, source: string, target: string) {
    setLists((old) => ({ ...old, [phase]: reorder(old[phase], source, target) }));
  }
  return <>
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <form method="get"><label className="block text-sm font-medium">Época
            <select name="season" value={selectedSeasonId ?? ""}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="mt-2 block h-10 rounded-lg border border-[var(--border)] bg-white px-3">
              {seasons.length === 0 && <option value="">Sem épocas</option>}
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_active ? " (atual)" : ""}</option>)}
            </select></label></form>
          {selectedSeasonId && <form method="get">
            <input type="hidden" name="season" value={selectedSeasonId} />
            <label className="block text-sm font-medium">Equipa
              <select name="team" value={selectedTeamId ?? ""}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="mt-2 block h-10 min-w-48 rounded-lg border border-[var(--border)] bg-white px-3">
                {teams.length === 0 && <option value="">Sem equipas</option>}
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label></form>}
        </div>
        {isAdmin && selectedSeasonId && <button type="button" onClick={() => openEditor(null)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--club-green-700)] px-4 text-sm font-semibold text-white">
          <Plus size={17} aria-hidden="true" /> Nova equipa</button>}
      </div>
      {!selectedSeasonId && <p className="mt-6 text-sm text-[var(--muted)]">Cria primeiro uma época em Administração → Épocas.</p>}
      {selectedSeasonId && !team && <p className="mt-6 text-sm text-[var(--muted)]">Ainda não existem equipas nesta época.</p>}
      {team && selectedSeasonId && <>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
          <div><h2 className="text-xl font-semibold">{team.name}</h2>
            <p className="text-sm text-[var(--muted)]">{current.length} jogador(es) · {team.division ? `${team.division}.ª divisão` : "Divisão por definir"}</p></div>
          {isAdmin && <div className="flex gap-2">
            <button type="button" onClick={() => openEditor(team)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><Pencil size={15} /> Editar</button>
            <button type="button" onClick={openDelete} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700"><Trash2 size={15} /> Eliminar</button>
          </div>}
        </div>
        {isAdmin && <form action={addMembership} className="mt-5 flex flex-wrap items-end gap-2">
          <input type="hidden" name="seasonId" value={selectedSeasonId} />
          <input type="hidden" name="teamId" value={team.id} />
          <label className="text-sm font-medium">Adicionar jogador
            <select name="playerId" required defaultValue="" className="mt-1 block h-10 min-w-52 rounded-lg border border-[var(--border)] bg-white px-2">
              <option value="" disabled>Selecionar jogador</option>
              {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
          <button type="submit" disabled={players.length === 0} className="h-10 rounded-lg bg-[var(--club-green-700)] px-4 text-sm text-white disabled:opacity-50">Adicionar</button>
        </form>}
        <p className="mt-5 text-sm text-[var(--muted)]">As três listas incluem os mesmos jogadores. Arrasta dentro de uma lista ou usa as setas para reordenar.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {phases.map(({ key, label }) => {
            const ids = lists[key];
            const original = initialOrders(memberships, orders)[key];
            const dirty = ids.join(",") !== original.join(",");
            return <section key={key} aria-label={label} className="min-w-0 rounded-xl border border-[var(--border)] bg-slate-50 p-4">
              <div className="flex items-baseline justify-between gap-2"><h3 className="font-semibold text-[var(--club-green-700)]">{label}</h3>
                <span className="text-xs text-[var(--muted)]">{ids.length} jogadores</span></div>
              <ol className="mt-4 space-y-2">
                {ids.map((id, index) => {
                  const member = byId.get(id);
                  if (!member) return null;
                  return <li key={id} draggable={isAdmin}
                    onDragStart={(event) => { if (!isAdmin) return; setDragging({ phase: key, id }); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", id); }}
                    onDragOver={(event) => { if (isAdmin && dragging?.phase === key) event.preventDefault(); }}
                    onDrop={(event) => { event.preventDefault(); if (isAdmin && dragging?.phase === key) move(key, dragging.id, id); setDragging(null); }}
                    onDragEnd={() => setDragging(null)}
                    className={`flex min-h-12 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-2 py-2 text-sm ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}>
                    {isAdmin && <GripVertical size={16} className="shrink-0 text-slate-400" aria-hidden="true" />}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--club-green-50)] font-semibold text-[var(--club-green-700)]">{index + 1}</span>
                    <span className="min-w-0 flex-1 break-words">{member.player_name}</span>
                    {isAdmin && <span className="flex shrink-0 gap-1">
                      <button type="button" disabled={index === 0} onClick={() => move(key, id, ids[index - 1])}
                        aria-label={`Subir ${member.player_name} em ${label}`} className="rounded border border-[var(--border)] px-1.5 py-1 disabled:opacity-30">↑</button>
                      <button type="button" disabled={index === ids.length - 1} onClick={() => move(key, ids[index + 1], id)}
                        aria-label={`Descer ${member.player_name} em ${label}`} className="rounded border border-[var(--border)] px-1.5 py-1 disabled:opacity-30">↓</button>
                    </span>}
                  </li>;
                })}
              </ol>
              {ids.length === 0 && <p className="mt-4 text-sm text-[var(--muted)]">Sem jogadores. Adiciona jogadores à equipa.</p>}
              {isAdmin && <form action={savePhaseOrder} className="mt-4">
                <input type="hidden" name="seasonId" value={selectedSeasonId} />
                <input type="hidden" name="teamId" value={team.id} />
                <input type="hidden" name="phase" value={key} />
                <input type="hidden" name="playerIds" value={JSON.stringify(ids)} />
                <input type="hidden" name="revision" value={orders.find((o) => o.phase === key)?.revision ?? 0} />
                <button type="submit" disabled={!dirty} className="w-full rounded-lg bg-[var(--club-green-700)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40">Guardar ordem</button>
              </form>}
            </section>;
          })}
        </div>
        {isAdmin && current.length > 0 && <details className="mt-6 rounded-lg border border-[var(--border)] p-4">
          <summary className="cursor-pointer text-sm font-medium">Gerir jogadores da equipa ({current.length})</summary>
          <ul className="mt-3 divide-y divide-[var(--border)]">{current.map((m) => <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span>{m.player_name}</span><form action={endMembership}>
              <input type="hidden" name="seasonId" value={selectedSeasonId} />
              <input type="hidden" name="teamId" value={team.id} />
              <input type="hidden" name="membershipId" value={m.id} />
              <button type="submit" className="rounded border border-red-200 px-2 py-1 text-xs text-red-700">Remover jogador</button>
            </form></li>)}</ul>
        </details>}
        {previous.length > 0 && <details className="mt-3 rounded-lg border border-[var(--border)] p-4 text-sm">
          <summary className="cursor-pointer">Histórico de jogadores removidos ({previous.length})</summary>
          <ul className="mt-2 space-y-1 text-[var(--muted)]">{previous.map((m) => <li key={m.id}>{m.player_name}</li>)}</ul>
        </details>}
      </>}
    </section>
    {isAdmin && editorOpen && selectedSeasonId && <dialog ref={editor} onClose={() => setEditorOpen(false)}
      className="m-auto w-[min(94vw,460px)] rounded-xl border border-[var(--border)] bg-white p-0 shadow-2xl backdrop:bg-slate-950/45">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-5"><h2 className="font-semibold">{editing ? "Editar equipa" : "Nova equipa"}</h2>
        <button type="button" onClick={closeEditor} aria-label="Fechar"><X size={18} /></button></div>
      <form action={editing ? renameTeam : createTeam} className="space-y-4 p-5">
        <input type="hidden" name="seasonId" value={selectedSeasonId} />
        {editing && <input type="hidden" name="teamId" value={editing.id} />}
        <label className="block text-sm font-medium">Nome da equipa
          <input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ""}
            className="mt-2 block h-10 w-full rounded-lg border border-[var(--border)] px-3" /></label>
        <label className="block text-sm font-medium">Divisão do campeonato
          <select name="division" required defaultValue={editing?.division ?? ""}
            className="mt-2 block h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3">
            <option value="" disabled>Selecionar divisão</option>
            <option value="1">1.ª divisão</option><option value="2">2.ª divisão</option>
          </select></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={closeEditor} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancelar</button>
          <button type="submit" className="rounded-lg bg-[var(--club-green-700)] px-4 py-2 text-sm text-white">Guardar</button></div>
      </form>
    </dialog>}
    {isAdmin && deleteOpen && team && selectedSeasonId && <dialog ref={confirmation} onClose={() => setDeleteOpen(false)}
      className="m-auto w-[min(94vw,440px)] rounded-xl border border-[var(--border)] bg-white p-6 shadow-2xl backdrop:bg-slate-950/45">
      <h2 className="font-semibold">Eliminar equipa</h2><p className="mt-3 text-sm">Eliminar {team.name}? Uma equipa com histórico de jogadores não pode ser eliminada.</p>
      <form action={deleteTeam} className="mt-5 flex justify-end gap-2">
        <input type="hidden" name="seasonId" value={selectedSeasonId} /><input type="hidden" name="teamId" value={team.id} />
        <button type="button" onClick={closeDelete} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancelar</button>
        <button type="submit" className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white">Eliminar</button>
      </form>
    </dialog>}
  </>;
}
