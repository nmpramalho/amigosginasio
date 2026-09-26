"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { navigationSections } from "./navigation";

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu de navegação"
        className={`fixed inset-0 z-40 bg-slate-950/35 transition-opacity lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        aria-label="Navegação principal"
        className={`fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col border-r border-[var(--border)] bg-white transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[var(--header-height)] items-center gap-3 border-b border-[var(--border)] px-5">
          <Image src="/club-logo.svg" alt="" width={36} height={36} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">Amigos do Ginásio</p>
            <p className="truncate text-xs text-[var(--muted)]">Bilhar 3 Tabelas</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--muted)] hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <div className="space-y-6">
            {navigationSections.map((section) => (
              <section key={section.label} aria-labelledby={`nav-${section.label}`}>
                <h2
                  id={`nav-${section.label}`}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                >
                  {section.label}
                </h2>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                            active
                              ? "bg-[var(--club-green-50)] text-[var(--club-green-700)]"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <p className="text-xs font-medium text-slate-600">Project Skeleton V1</p>
          <p className="mt-1 text-xs text-slate-400">Estrutura visual</p>
        </div>
      </aside>
    </>
  );
}
