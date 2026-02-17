"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewGoalPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, title, status: "planned", tags: [], teams: [], body: "" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error ?? "Failed to create goal");
      setSaving(false);
      return;
    }
    router.push(`/goals/${encodeURIComponent(id)}`);
  }

  return (
    <div className="space-y-4">
      <Link href="/goals" className="text-sm font-medium hover:underline">
        ← Back
      </Link>

      <div className="ck-glass p-6 space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Create goal</h1>

        <div>
          <div className="text-xs text-[color:var(--ck-text-tertiary)]">ID</div>
          <input
            className="mt-1 w-full rounded-[var(--ck-radius-sm)] border border-[color:var(--ck-border-subtle)] bg-transparent px-3 py-2 text-sm font-mono"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="increase-trial-activation"
          />
          <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">
            Lowercase letters, numbers, hyphens. Stored as <code className="font-mono">{id || "<id>"}.md</code>.
          </div>
        </div>

        <div>
          <div className="text-xs text-[color:var(--ck-text-tertiary)]">Title</div>
          <input
            className="mt-1 w-full rounded-[var(--ck-radius-sm)] border border-[color:var(--ck-border-subtle)] bg-transparent px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Increase trial activation"
          />
        </div>

        {error ? <div className="text-sm text-red-300">{error}</div> : null}

        <button
          onClick={() => void create()}
          disabled={saving}
          className="rounded-[var(--ck-radius-sm)] bg-[var(--ck-accent-red)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}
