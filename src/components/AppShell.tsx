"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";

function TopNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-[var(--ck-radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors text-[color:var(--ck-text-secondary)] hover:bg-[color:var(--ck-bg-glass)] hover:text-[color:var(--ck-text-primary)]"
    >
      {label}
    </Link>
  );
}

function SideNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-[var(--ck-radius-sm)] bg-white/10 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)]"
          : "rounded-[var(--ck-radius-sm)] px-3 py-2 text-sm font-medium text-[color:var(--ck-text-secondary)] transition-colors hover:bg-white/5 hover:text-[color:var(--ck-text-primary)]"
      }
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  // Incremental rollout: only team routes use the full-screen left-nav shell for now.
  const useLeftNavShell = pathname.startsWith("/teams/");

  if (!useLeftNavShell) {
    return (
      <ToastProvider>
        <div className="min-h-screen">
          <header className="sticky top-0 z-50 border-b border-[color:var(--ck-border-subtle)] bg-[color:var(--ck-bg-glass)] backdrop-blur-[var(--ck-glass-blur)]">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <Link href="/" className="text-sm font-semibold tracking-tight">
                  Claw Kitchen
                </Link>
                <nav className="hidden items-center gap-1 sm:flex">
                  <TopNavLink href="/recipes" label="Recipes" />
                  <TopNavLink href="/tickets" label="Tickets" />
                  <TopNavLink href="/goals" label="Goals" />
                  {/* Channels hidden for release */}
                  <TopNavLink href="/cron-jobs" label="Cron jobs" />
                  <TopNavLink href="/settings" label="Settings" />
                </nav>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://github.com/JIGGAI/ClawRecipes/tree/main/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[var(--ck-radius-sm)] px-3 py-1.5 text-sm font-medium text-[color:var(--ck-text-secondary)] transition-colors hover:bg-[color:var(--ck-bg-glass)] hover:text-[color:var(--ck-text-primary)]"
                >
                  Docs
                </a>
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </div>
      </ToastProvider>
    );
  }

  const sideItems = [
    { href: "/recipes", label: "Recipes" },
    { href: "/tickets", label: "Tickets" },
    { href: "/goals", label: "Goals" },
    { href: "/cron-jobs", label: "Cron jobs" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <ToastProvider>
      <div className="h-dvh w-dvw overflow-hidden">
        <div className="flex h-full">
          <aside className="flex w-64 shrink-0 flex-col border-r border-[color:var(--ck-border-subtle)] bg-[color:var(--ck-bg-glass)] backdrop-blur-[var(--ck-glass-blur)]">
            <div className="flex h-14 items-center justify-between gap-2 border-b border-[color:var(--ck-border-subtle)] px-4">
              <Link href="/" className="text-sm font-semibold tracking-tight">
                Claw Kitchen
              </Link>
              <ThemeToggle />
            </div>

            <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2">
              <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ck-text-tertiary)]">
                Navigation
              </div>
              {sideItems.map((it) => (
                <SideNavLink
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={pathname === it.href || pathname.startsWith(it.href + "/")}
                />
              ))}
            </nav>

            <div className="border-t border-[color:var(--ck-border-subtle)] p-3">
              <a
                href="https://github.com/JIGGAI/ClawRecipes/tree/main/docs"
                target="_blank"
                rel="noreferrer"
                className="block rounded-[var(--ck-radius-sm)] px-3 py-2 text-sm font-medium text-[color:var(--ck-text-secondary)] transition-colors hover:bg-white/5 hover:text-[color:var(--ck-text-primary)]"
              >
                Docs
              </a>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-h-0 flex-1 overflow-auto">{children}</main>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
