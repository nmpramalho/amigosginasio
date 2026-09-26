import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-6 py-12">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--club-green-600)]" />
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white px-8 py-10 text-center shadow-[0_18px_55px_rgba(22,86,52,0.09)] sm:px-12 sm:py-12">
        <Image
          src="/club-logo.svg"
          alt="Logótipo do Clube Amigos do Ginásio"
          width={112}
          height={112}
          priority
          className="mx-auto h-28 w-28"
        />

        <div className="mt-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--club-green-600)]">
            Bilhar 3 Tabelas
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Clube Amigos do Ginásio
          </h1>
          <p className="mt-3 text-base text-[var(--muted)]">Sistema de Gestão</p>
        </div>

        <Link
          href="/dashboard"
          className="mt-9 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--club-green-700)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--club-green-800)]"
          aria-label="Entrar com Google, demonstração visual"
        >
          <LogIn aria-hidden="true" size={18} strokeWidth={1.8} />
          Entrar com Google
        </Link>

        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Nesta versão, o botão permite apenas visualizar o skeleton da aplicação.
        </p>
      </section>
    </main>
  );
}
