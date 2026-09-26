import type { Metadata } from "next";
import { requireAdmin } from "@/lib/access";
import { getDatabase } from "@/lib/db";
import { PageHeading } from "@/components/ui/page-heading";
import { createUser, updateUser } from "./actions";

export const metadata: Metadata = { title: "Administração" };

type UserRow = { id: string; email: string; name: string; role: string; active: boolean };
type AttemptRow = { id: number; email: string; created_at: Date };

export default async function AdministrationPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const admin = await requireAdmin();
  const sql = getDatabase();
  const [users, attempts] = await Promise.all([
    sql`SELECT id, email, name, role, active FROM users ORDER BY name ASC`,
    sql`SELECT id, email, created_at FROM access_attempts ORDER BY created_at DESC LIMIT 20`,
  ]);
  const { status } = await searchParams;
  return (
    <>
      <PageHeading title="Administração" description="Gestão de acessos à plataforma." />
      {status === "saved" && <p role="status" className="mb-5 rounded-lg bg-[var(--club-green-50)] p-3 text-sm text-[var(--club-green-700)]">Alterações guardadas.</p>}
      {status === "invalid" && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">Verifica os dados introduzidos.</p>}
      {status === "self" && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">Não podes retirar o teu próprio acesso de administrador.</p>}
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Autorizar utilizador</h2>
        <form action={createUser} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_160px_auto] md:items-end">
          <label className="text-sm font-medium">Nome
            <input name="name" required minLength={2} maxLength={120} className="mt-2 block h-10 w-full rounded-lg border border-[var(--border)] px-3" />
          </label>
          <label className="text-sm font-medium">Email Google
            <input name="email" type="email" required className="mt-2 block h-10 w-full rounded-lg border border-[var(--border)] px-3" />
          </label>
          <label className="text-sm font-medium">Perfil
            <select name="role" defaultValue="user" className="mt-2 block h-10 w-full rounded-lg border border-[var(--border)] px-3">
              <option value="user">Utilizador</option><option value="captain">Capitão</option><option value="admin">Administrador</option>
            </select>
          </label>
          <button type="submit" className="h-10 rounded-lg bg-[var(--club-green-700)] px-4 text-sm font-medium text-white">Adicionar</button>
        </form>
      </section>
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Utilizadores autorizados</h2>
        <div className="mt-4 space-y-3">
          {(users as UserRow[]).map((user) => (
            <form key={user.id} action={updateUser} className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] p-4">
              <input type="hidden" name="id" value={user.id} />
              <div className="min-w-48 flex-1"><p className="text-sm font-medium">{user.name}{user.id === admin.id ? " (tu)" : ""}</p><p className="break-all text-xs text-[var(--muted)]">{user.email}</p></div>
              <label className="text-xs">Perfil
                <select name="role" defaultValue={user.role} className="ml-2 rounded-md border border-[var(--border)] px-2 py-2 text-sm">
                  <option value="user">Utilizador</option><option value="captain">Capitão</option><option value="admin">Administrador</option>
                </select>
              </label>
              <label className="text-xs">Estado
                <select name="active" defaultValue={String(user.active)} className="ml-2 rounded-md border border-[var(--border)] px-2 py-2 text-sm">
                  <option value="true">Ativo</option><option value="false">Inativo</option>
                </select>
              </label>
              <button type="submit" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-slate-50">Guardar</button>
            </form>
          ))}
        </div>
      </section>
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Tentativas não autorizadas</h2>
        <div className="mt-4 space-y-2 text-sm">
          {(attempts as AttemptRow[]).length === 0 ? <p className="text-[var(--muted)]">Sem tentativas registadas.</p> :
            (attempts as AttemptRow[]).map((attempt) => (
              <p key={attempt.id} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border)] py-2">
                <span className="break-all">{attempt.email}</span>
                <time className="text-[var(--muted)]">{new Date(attempt.created_at).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</time>
              </p>
            ))}
        </div>
      </section>
    </>
  );
}
