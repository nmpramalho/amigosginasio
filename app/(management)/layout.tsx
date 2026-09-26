import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/access";

export default async function ManagementLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  return <AppShell user={{ name: user.name, role: user.role }}>{children}</AppShell>;
}
