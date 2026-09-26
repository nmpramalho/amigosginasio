import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, description, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--club-green-50)] text-[var(--club-green-700)]">
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </div>
      </div>
      <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-[var(--muted)]">{description}</p>
    </article>
  );
}
