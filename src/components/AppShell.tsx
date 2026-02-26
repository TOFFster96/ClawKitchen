"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";

function SideNavLink({
  href,
  label,
  icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={
        active
          ? "flex items-center gap-2 rounded-[var(--ck-radius-sm)] bg-white/10 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)]"
          : "flex items-center gap-2 rounded-[var(--ck-radius-sm)] px-3 py-2 text-sm font-medium text-[color:var(--ck-text-secondary)] transition-colors hover:bg-white/5 hover:text-[color:var(--ck-text-primary)]"
      }
    >
      <span className={collapsed ? "mx-auto" : ""}>{icon}</span>
      {collapsed ? null : <span>{label}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const currentTeamId = useMemo(() => {
    const m = pathname.match(/^\/teams\/([^/]+)(?:\/|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [pathname]);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const v = localStorage.getItem("ck-leftnav-collapsed");
      return v === "1";
    } catch {
      return false;
    }
  });

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem("ck-leftnav-collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Minimal team list (for switcher). We rely on existing /api/recipes.
  const [teamIds, setTeamIds] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/recipes", { cache: "no-store" });
        const json = await res.json();
        const items = Array.isArray(json.recipes) ? (json.recipes as Array<{ id: string; kind: string }>) : [];
        const teams = items.filter((r) => r.kind === "team").map((r) => r.id).sort();
        setTeamIds(teams);
      } catch {
        setTeamIds([]);
      }
    })();
  }, []);

  const teamNav = currentTeamId
    ? [
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=recipe`, label: "Overview", icon: "🏷️" },
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=workflows`, label: "Workflows", icon: "🗺️" },
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=agents`, label: "Agents", icon: "🧑‍🍳" },
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=files`, label: "Files", icon: "📁" },
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=skills`, label: "Skills", icon: "🧰" },
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=cron`, label: "Cron", icon: "⏱️" },
        { href: `/teams/${encodeURIComponent(currentTeamId)}?tab=orchestrator`, label: "Orchestrator", icon: "🎛️" },
        { href: `/tickets`, label: "Tickets", icon: "🧾" },
        { href: `/goals?team=${encodeURIComponent(currentTeamId)}`, label: "Goals", icon: "🎯" },
      ]
    : [];

  const globalNav = [
    { href: `/`, label: "Home", icon: "🏠" },
    { href: `/recipes`, label: "Recipes", icon: "📜" },
    { href: `/tickets`, label: "Tickets", icon: "🧾" },
    { href: `/goals`, label: "Goals", icon: "🎯" },
    { href: `/cron-jobs`, label: "Cron jobs", icon: "⏱️" },
    { href: `/settings`, label: "Settings", icon: "⚙️" },
  ];

  const sideWidth = collapsed ? "w-16" : "w-72";

  return (
    <ToastProvider>
      <div className="flex h-dvh w-dvw overflow-hidden">
        <aside className={`flex shrink-0 flex-col border-r border-[color:var(--ck-border-subtle)] bg-[color:var(--ck-bg-glass)] backdrop-blur-[var(--ck-glass-blur)] ${sideWidth}`}>
          <div className="flex h-14 items-center justify-between gap-2 border-b border-[color:var(--ck-border-subtle)] px-3">
            <Link href="/" className="text-sm font-semibold tracking-tight" title="Home">
              {collapsed ? "CK" : "Claw Kitchen"}
            </Link>
            <button
              onClick={toggleCollapsed}
              className="rounded-[var(--ck-radius-sm)] px-2 py-1 text-sm text-[color:var(--ck-text-secondary)] hover:bg-white/5 hover:text-[color:var(--ck-text-primary)]"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "»" : "«"}
            </button>
          </div>

          <div className="border-b border-[color:var(--ck-border-subtle)] p-2">
            {collapsed ? (
              <button
                className="w-full rounded-[var(--ck-radius-sm)] bg-white/5 px-2 py-2 text-xs font-medium text-[color:var(--ck-text-secondary)] hover:bg-white/10"
                title={currentTeamId ? `Team: ${currentTeamId}` : "Select team"}
                onClick={() => {
                  if (teamIds[0]) router.push(`/teams/${encodeURIComponent(teamIds[0])}`);
                }}
              >
                👥
              </button>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ck-text-tertiary)]">
                  Team
                </div>
                <select
                  value={currentTeamId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) router.push(`/teams/${encodeURIComponent(id)}`);
                  }}
                  className="w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-2 py-2 text-sm text-[color:var(--ck-text-primary)]"
                >
                  <option value="">(select)</option>
                  {teamIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <nav className="min-h-0 flex-1 overflow-auto p-2">
            {currentTeamId ? (
              <>
                <div className={collapsed ? "px-2 pb-2 pt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ck-text-tertiary)]" : "px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ck-text-tertiary)]"}>
                  Team
                </div>
                {teamNav.map((it) => (
                  <SideNavLink
                    key={it.href}
                    href={it.href}
                    label={it.label}
                    icon={<span aria-hidden>{it.icon}</span>}
                    collapsed={collapsed}
                    active={pathname.startsWith(`/teams/${encodeURIComponent(currentTeamId)}`) && it.href.includes("tab=") ? it.href.includes("tab=") : pathname === it.href}
                  />
                ))}
              </>
            ) : null}

            <div className={collapsed ? "mt-4 px-2 pb-2 pt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ck-text-tertiary)]" : "mt-4 px-2 pb-2 pt-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ck-text-tertiary)]"}>
              Global
            </div>
            {globalNav.map((it) => (
              <SideNavLink
                key={it.href}
                href={it.href}
                label={it.label}
                icon={<span aria-hidden>{it.icon}</span>}
                collapsed={collapsed}
                active={pathname === it.href || pathname.startsWith(it.href + "/")}
              />
            ))}
          </nav>

          <div className="flex items-center justify-between gap-2 border-t border-[color:var(--ck-border-subtle)] p-2">
            <a
              href="https://github.com/JIGGAI/ClawRecipes/tree/main/docs"
              target="_blank"
              rel="noreferrer"
              className={
                collapsed
                  ? "mx-auto rounded-[var(--ck-radius-sm)] px-2 py-2 text-sm text-[color:var(--ck-text-secondary)] hover:bg-white/5 hover:text-[color:var(--ck-text-primary)]"
                  : "rounded-[var(--ck-radius-sm)] px-3 py-2 text-sm font-medium text-[color:var(--ck-text-secondary)] hover:bg-white/5 hover:text-[color:var(--ck-text-primary)]"
              }
              title="Docs"
            >
              {collapsed ? "📖" : "Docs"}
            </a>
            {collapsed ? null : <ThemeToggle />}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="h-full overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
