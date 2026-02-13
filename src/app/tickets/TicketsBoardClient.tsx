"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TicketStage, TicketSummary } from "@/lib/tickets";

type DoneRange = "all" | "today" | "this-week" | "this-month" | "last-month" | "custom";

const STAGES: { key: TicketStage; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "in-progress", label: "In progress" },
  { key: "testing", label: "Testing" },
  { key: "done", label: "Done" },
];

function formatAge(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date) {
  // Monday-start week
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function toDateInputValue(d: Date) {
  // yyyy-mm-dd
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDateInputValue(v: string) {
  // Treat as local date
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function TicketsBoardClient({ tickets }: { tickets: TicketSummary[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [doneRange, setDoneRange] = useState<DoneRange>("all");
  const [doneCustomStart, setDoneCustomStart] = useState<string>(toDateInputValue(new Date()));
  const [doneCustomEnd, setDoneCustomEnd] = useState<string>(toDateInputValue(new Date()));

  const byStage = useMemo(() => {
    const now = new Date();

    let doneStart: Date | null = null;
    let doneEnd: Date | null = null;

    if (doneRange === "today") {
      doneStart = startOfDay(now);
      doneEnd = endOfDay(now);
    } else if (doneRange === "this-week") {
      doneStart = startOfWeek(now);
      doneEnd = endOfDay(now);
    } else if (doneRange === "this-month") {
      doneStart = startOfMonth(now);
      doneEnd = endOfDay(now);
    } else if (doneRange === "last-month") {
      const s = startOfMonth(now);
      s.setMonth(s.getMonth() - 1);
      doneStart = s;
      const e = startOfMonth(now);
      e.setDate(0); // last day of previous month
      doneEnd = endOfDay(e);
    } else if (doneRange === "custom") {
      const s = parseDateInputValue(doneCustomStart);
      const e = parseDateInputValue(doneCustomEnd);
      doneStart = s ? startOfDay(s) : null;
      doneEnd = e ? endOfDay(e) : null;
    }

    const map: Record<TicketStage, TicketSummary[]> = {
      backlog: [],
      "in-progress": [],
      testing: [],
      done: [],
    };

    for (const t of tickets) {
      if (doneStart && doneEnd) {
        const updatedAt = new Date(t.updatedAt);
        if (updatedAt < doneStart || updatedAt > doneEnd) continue;
      }
      map[t.stage].push(t);
    }

    for (const s of Object.keys(map) as TicketStage[]) {
      map[s].sort((a, b) => a.number - b.number);
    }
    return map;
  }, [tickets, doneRange, doneCustomStart, doneCustomEnd]);

  async function move(ticket: TicketSummary, to: TicketStage) {
    setError(null);
    const res = await fetch("/api/tickets/move", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket: ticket.id, to }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? `Move failed (${res.status})`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 text-xs text-[color:var(--ck-text-secondary)]">
            Updated filter
            <select
              className="rounded border border-[color:var(--ck-border-subtle)] bg-transparent px-2 py-1 text-xs"
              value={doneRange}
              onChange={(e) => setDoneRange(e.target.value as DoneRange)}
            >
              <option value="all">All</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {doneRange === "custom" ? (
            <div className="flex items-center gap-2 text-xs text-[color:var(--ck-text-secondary)]">
              <input
                type="date"
                value={doneCustomStart}
                onChange={(e) => setDoneCustomStart(e.target.value)}
                className="rounded border border-[color:var(--ck-border-subtle)] bg-transparent px-2 py-1 text-xs"
              />
              <span>→</span>
              <input
                type="date"
                value={doneCustomEnd}
                onChange={(e) => setDoneCustomEnd(e.target.value)}
                className="rounded border border-[color:var(--ck-border-subtle)] bg-transparent px-2 py-1 text-xs"
              />
            </div>
          ) : null}

          <div className="text-sm text-[color:var(--ck-text-secondary)]">{isPending ? "Updating…" : ""}</div>
        </div>
      </div>

      {error ? (
        <div className="ck-glass border border-[color:var(--ck-border-strong)] p-3 text-sm text-[color:var(--ck-text-primary)]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {STAGES.map(({ key, label }) => (
          <section key={key} className="ck-glass p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
              <span className="text-xs text-[color:var(--ck-text-tertiary)]">
                {byStage[key].length}
              </span>
            </div>

            <div className="space-y-2">
              {byStage[key].length === 0 ? (
                <div className="rounded-[var(--ck-radius-sm)] border border-dashed border-[color:var(--ck-border-subtle)] p-3 text-xs text-[color:var(--ck-text-tertiary)]">
                  Empty
                </div>
              ) : null}

              {byStage[key].map((t) => (
                <div
                  key={t.id}
                  className="rounded-[var(--ck-radius-sm)] border border-[color:var(--ck-border-subtle)] bg-[color:var(--ck-bg-glass-strong)] p-3"
                >
                  <a
                    href={`/tickets/${encodeURIComponent(t.id)}`}
                    className="block text-sm font-medium text-[color:var(--ck-text-primary)] hover:underline"
                  >
                    {String(t.number).padStart(4, "0")} — {t.title}
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--ck-text-secondary)]">
                    <span>{t.owner ? `Owner: ${t.owner}` : "Owner: —"}</span>
                    <span>·</span>
                    <span>Age: {formatAge(t.ageHours)}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <label className="text-xs text-[color:var(--ck-text-tertiary)]">
                      Move
                      <select
                        className="ml-2 rounded border border-[color:var(--ck-border-subtle)] bg-transparent px-2 py-1 text-xs"
                        defaultValue={t.stage}
                        onChange={(e) => {
                          const to = e.target.value as TicketStage;
                          startTransition(() => {
                            move(t, to)
                              .then(() => router.refresh())
                              .catch((err) => setError(err.message));
                          });
                        }}
                      >
                        {STAGES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-xs text-[color:var(--ck-text-tertiary)]">
        Source of truth: development-team markdown tickets (via openclaw recipes move-ticket).
      </p>
    </div>
  );
}
