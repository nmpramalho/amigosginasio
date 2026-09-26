type PageHeadingProps = {
  title: string;
  description: string;
};

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
