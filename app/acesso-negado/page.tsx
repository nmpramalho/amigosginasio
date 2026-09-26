import Link from "next/link";
import { ShieldX } from "lucide-react";
import { signOut } from "@/auth";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
      <section className="w-full max-w-md rounded-xl border border-[var(--border)] bg-white p-8 text-center">
        <ShieldX size={36} strokeWidth={1.8} className="mx-auto text-[var(--club-green-700)]" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold">Acesso não autorizado</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Esta conta Google não está autorizada. Contacta o administrador da associação.</p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
          <button type="submit" className="mt-6 rounded-lg bg-[var(--club-green-700)] px-5 py-2.5 text-sm font-medium text-white">Terminar sessão</button>
        </form>
        <Link href="/" className="mt-4 block text-sm text-[var(--club-green-700)]">Voltar ao início</Link>
      </section>
    </main>
  );
}
