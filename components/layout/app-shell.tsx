"use client";

import { useState } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import type { AccessRole } from "@/lib/access-lookup";

type AppShellProps = Readonly<{
  children: React.ReactNode;
  user: { name: string; role: AccessRole };
}>;

export function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} isAdmin={user.role === "admin"} />
      <div className="min-h-screen lg:pl-[var(--sidebar-width)]">
        <Header onOpenMenu={() => setMobileOpen(true)} userName={user.name} />
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
