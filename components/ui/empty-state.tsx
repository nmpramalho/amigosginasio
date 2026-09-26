import { Construction } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--club-green-50)] text-[var(--club-green-700)]">
          <Construction size={21} strokeWidth={1.8} aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
    </section>
  );
}
