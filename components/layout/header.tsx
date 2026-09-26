"use client";

import { usePathname } from "next/navigation";
import { Menu, UserRound } from "lucide-react";
import { pageTitles } from "./navigation";

type HeaderProps = {
  onOpenMenu: () => void;
};

export function Header({ onOpenMenu }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Sistema de Gestão";

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={21} strokeWidth={1.8} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-[var(--foreground)] sm:text-lg">{title}</h1>
          <p className="hidden text-xs text-[var(--muted)] sm:block">Associação dos Amigos do Ginásio</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-700">Convidado</p>
          <p className="text-xs text-slate-400">Sem autenticação</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-slate-50 text-slate-500">
          <UserRound size={18} strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
