"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";

export type Player = {
  id: string;
  name: string;
  federation_number: string | null;
  contact_email?: string | null;
  mobile_phone?: string | null;
  user_id?: string | null;
  login_email?: string | null;
  team_name?: string | null;
  is_active: boolean;
  has_photo: boolean;
  updated_at: string;
};

export type LinkedUser = { id: string; name: string; email: string };

type Action = (formData: FormData) => Promise<void>;
type Props = {
  players: Player[];
  users: LinkedUser[];
  isAdmin: boolean;
  createAction: Action;
  updateAction: Action;
  deleteAction: Action;
};

export function PlayersList({ players, users, isAdmin, createAction, updateAction, deleteAction }: Props) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Player | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [removing, setRemoving] = useState<Player | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);

  const term = search.trim().toLocaleLowerCase("pt-PT");
  const visible = players.filter((player) =>
    [player.name, player.federation_number, player.team_name,
      ...(isAdmin ? [player.contact_email, player.login_email] : [])].some((value) =>
      value?.toLocaleLowerCase("pt-PT").includes(term),
    ),
  );

  function openEditor(player: Player | null) {
    setEditing(player);
    setShowModal(true);
    window.setTimeout(() => dialog.current?.showModal(), 0);
  }

  function closeEditor() {
    dialog.current?.close();
    setShowModal(false);
  }

  function openDelete(player: Player) {
    setRemoving(player);
    setShowDelete(true);
    window.setTimeout(() => deleteDialog.current?.showModal(), 0);
  }

  function closeDelete() {
    deleteDialog.current?.close();
    setShowDelete(false);
  }

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block">
            <span className="sr-only">{isAdmin ? "Filtrar jogadores por nome, email ou número de afiliado" : "Filtrar jogadores por nome ou número de afiliado"}</span>
            <Search
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtro"
              className="h-10 w-64 max-w-[75vw] rounded-lg border border-[var(--border)] bg-white pl-10 pr-3 text-sm placeholder:text-slate-400"
            />
          </label>
          <button
            type="button"
            onClick={() => setSearch("")}
            disabled={search.length === 0}
            className="h-10 rounded-lg border border-[var(--border)] px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Limpar filtro
          </button>
          <span className="text-sm text-[var(--muted)]">{visible.length} de {players.length}</span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => openEditor(null)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--club-green-700)] px-4 text-sm font-semibold text-white hover:bg-[var(--club-green-800)]"
          >
            <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Novo
          </button>
        )}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <th scope="col" className="py-3 pr-4 font-medium">Jogador</th>
              <th scope="col" className="py-3 pr-4 font-medium">N.º de afiliado FPB</th>
              <th scope="col" className="py-3 pr-4 font-medium">Equipa</th>
              {isAdmin && <>
                <th scope="col" className="py-3 pr-4 font-medium">Contacto</th>
                <th scope="col" className="py-3 pr-4 font-medium">Login</th>
              </>}
              <th scope="col" className="py-3 pr-4 font-medium">Estado</th>
              {isAdmin && <th scope="col" className="py-3 text-right font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((player) => (
              <tr key={player.id} className="border-b border-[var(--border)] last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {player.has_photo ? (
                      <Image
                        src={`/api/players/${player.id}/photo?v=${encodeURIComponent(player.updated_at)}`}
                        alt={`Fotografia de ${player.name}`}
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                    )}
                    <span className="font-medium">{player.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">{player.federation_number || "—"}</td>
                <td className="py-3 pr-4 text-[var(--muted)]">{player.team_name ?? "Por atribuir"}</td>
                {isAdmin && <>
                  <td className="py-3 pr-4">
                    <span className="block break-all">{player.contact_email || "—"}</span>
                    {player.mobile_phone && <span className="block text-xs text-[var(--muted)]">{player.mobile_phone}</span>}
                  </td>
                  <td className="break-all py-3 pr-4">{player.login_email || "—"}</td>
                </>}
                <td className="py-3 pr-4">{player.is_active ? "Ativo" : "Inativo"}</td>
                {isAdmin && (
                  <td className="whitespace-nowrap py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEditor(player)}
                      aria-label={`Editar ${player.name}`}
                      className="mr-2 inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1.5 hover:bg-slate-50"
                    >
                      <Pencil size={15} strokeWidth={1.8} aria-hidden="true" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => openDelete(player)}
                      aria-label={`Eliminar ${player.name}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" /> Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            {players.length === 0 ? "Ainda não existem jogadores registados." : "Nenhum jogador corresponde ao filtro."}
          </p>
        )}
      </div>

      {isAdmin && showModal && (
        <dialog
          ref={dialog}
          onClose={() => setShowModal(false)}
          className="m-auto max-h-[90vh] w-[min(94vw,620px)] overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-0 shadow-2xl backdrop:bg-slate-950/45"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-lg font-semibold">{editing ? "Editar jogador" : "Novo jogador"}</h2>
            <button type="button" onClick={closeEditor} aria-label="Fechar janela" className="rounded-lg p-2 hover:bg-slate-100">
              <X size={19} strokeWidth={1.8} />
            </button>
          </div>
          <form
            key={editing?.id ?? "new"}
            action={editing ? updateAction : createAction}
            className="grid gap-4 px-6 py-5 sm:grid-cols-2"
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className="text-sm font-medium sm:col-span-2">Nome *
              <input name="name" required minLength={2} maxLength={120} defaultValue={editing?.name ?? ""}
                className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] px-3" />
            </label>
            <label className="text-sm font-medium">N.º de afiliado FPB
              <input name="federationNumber" maxLength={30} defaultValue={editing?.federation_number ?? ""}
                className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] px-3" />
            </label>
            <label className="text-sm font-medium">Telemóvel
              <input name="mobilePhone" type="tel" maxLength={25} defaultValue={editing?.mobile_phone ?? ""}
                className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] px-3" />
            </label>
            <label className="text-sm font-medium sm:col-span-2">Email de contacto
              <input name="contactEmail" type="email" maxLength={254} defaultValue={editing?.contact_email ?? ""}
                className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] px-3" />
            </label>
            <label className="text-sm font-medium sm:col-span-2">Associar a um login
              <select name="userId" defaultValue={editing?.user_id ?? ""}
                className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3">
                <option value="">Sem login associado</option>
                {users.filter((user) => !players.some((player) => player.user_id === user.id && player.id !== editing?.id))
                  .map((user) => <option key={user.id} value={user.id}>{user.name} ({user.email})</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Estado
              <select name="isActive" defaultValue={String(editing?.is_active ?? true)}
                className="mt-1 block h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3">
                <option value="true">Ativo</option><option value="false">Inativo</option>
              </select>
            </label>
            <label className="text-sm font-medium">Fotografia (JPG, PNG ou WebP, até 2 MB)
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-xs file:mr-2 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-3 file:py-2" />
            </label>
            {editing?.has_photo && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="removePhoto" value="true" /> Remover fotografia atual
              </label>
            )}
            <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4 sm:col-span-2">
              <button type="button" onClick={closeEditor}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" className="rounded-lg bg-[var(--club-green-700)] px-4 py-2 text-sm font-semibold text-white">Guardar</button>
            </div>
          </form>
        </dialog>
      )}

      {isAdmin && showDelete && removing && (
        <dialog ref={deleteDialog} onClose={() => setShowDelete(false)}
          className="m-auto w-[min(94vw,440px)] rounded-xl border border-[var(--border)] bg-white p-6 shadow-2xl backdrop:bg-slate-950/45">
          <h2 className="text-lg font-semibold">Eliminar jogador</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Eliminar definitivamente {removing.name}? Se existirem dados associados, a eliminação será recusada.
          </p>
          <form action={deleteAction} className="mt-6 flex justify-end gap-2">
            <input type="hidden" name="id" value={removing.id} />
            <button type="button" onClick={closeDelete}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancelar</button>
            <button type="submit" className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Eliminar</button>
          </form>
        </dialog>
      )}
    </section>
  );
}
