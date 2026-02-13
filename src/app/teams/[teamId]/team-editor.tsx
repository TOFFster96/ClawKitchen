"use client";

import { useEffect, useMemo, useState } from "react";

type RecipeListItem = {
  id: string;
  name: string;
  kind: "agent" | "team";
  source: "builtin" | "workspace";
};

type RecipeDetail = RecipeListItem & {
  content: string;
  filePath: string | null;
};

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TeamEditor({ teamId }: { teamId: string }) {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>(`custom-${teamId}`);
  const [toName, setToName] = useState<string>(`Custom ${teamId}`);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");

  const teamRecipes = useMemo(
    () => recipes.filter((r) => r.kind === "team"),
    [recipes]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMessage("");
      try {
        const res = await fetch("/api/recipes", { cache: "no-store" });
        const json = await res.json();
        const list = (json.recipes ?? []) as RecipeListItem[];
        setRecipes(list);

        // Prefer a recipe with id matching the teamId; fallback to first team recipe.
        const preferred = list.find((r) => r.kind === "team" && r.id === teamId);
        const fallback = list.find((r) => r.kind === "team");
        const pick = preferred ?? fallback;
        if (pick) setFromId(pick.id);
      } catch (e: unknown) {
        setMessage(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [teamId]);

  async function onLoadSource() {
    if (!fromId) return;
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch(`/api/recipes/${encodeURIComponent(fromId)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load recipe");
      const r = json.recipe as RecipeDetail;
      setContent(r.content);
      setMessage(`Loaded source recipe: ${r.id}`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCustom(overwrite: boolean) {
    const f = fromId.trim();
    const id = toId.trim();
    if (!f) return setMessage("Source recipe id is required");
    if (!id) return setMessage("Custom recipe id is required");

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/recipes/clone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fromId: f, toId: id, toName: toName.trim() || undefined, overwrite }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setContent(json.content as string);
      setMessage(`Saved custom team recipe to workspace recipes: ${json.filePath}`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ck-glass mx-auto max-w-4xl p-6">Loading…</div>;

  return (
    <div className="ck-glass mx-auto max-w-6xl p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Team editor</h1>
      <p className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">
        Phase v2 (thin slice): bootstrap a <strong>custom team recipe</strong> for this installed team, without
        modifying builtin recipes.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="ck-glass-strong p-4">
          <div className="text-sm font-medium text-[color:var(--ck-text-primary)]">Source team recipe</div>
          <label className="mt-3 block text-xs font-medium text-[color:var(--ck-text-secondary)]">From</label>
          <select
            className="mt-1 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm text-[color:var(--ck-text-primary)]"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            {teamRecipes.map((r) => (
              <option key={`${r.source}:${r.id}`} value={r.id}>
                {r.id} ({r.source})
              </option>
            ))}
          </select>
          <button
            onClick={onLoadSource}
            className="mt-3 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)] shadow-[var(--ck-shadow-1)] transition-colors hover:bg-white/10 active:bg-white/15"
          >
            Load source markdown
          </button>
        </div>

        <div className="ck-glass-strong p-4">
          <div className="text-sm font-medium text-[color:var(--ck-text-primary)]">Custom recipe target</div>
          <label className="mt-3 block text-xs font-medium text-[color:var(--ck-text-secondary)]">To id</label>
          <input
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="mt-1 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm text-[color:var(--ck-text-primary)]"
          />

          <label className="mt-3 block text-xs font-medium text-[color:var(--ck-text-secondary)]">To name</label>
          <input
            value={toName}
            onChange={(e) => setToName(e.target.value)}
            className="mt-1 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm text-[color:var(--ck-text-primary)]"
          />

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              disabled={saving}
              onClick={() => onSaveCustom(false)}
              className="rounded-[var(--ck-radius-sm)] bg-[var(--ck-accent-red)] px-3 py-2 text-sm font-medium text-white shadow-[var(--ck-shadow-1)] transition-colors hover:bg-[var(--ck-accent-red-hover)] active:bg-[var(--ck-accent-red-active)] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save (create)"}
            </button>
            <button
              disabled={saving}
              onClick={() => onSaveCustom(true)}
              className="rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)] shadow-[var(--ck-shadow-1)] transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-50"
            >
              Save (overwrite)
            </button>
            <button
              disabled={!content}
              onClick={() => downloadTextFile(`${toId || "custom-team"}.md`, content)}
              className="rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)] shadow-[var(--ck-shadow-1)] transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-50"
            >
              Export recipe (download)
            </button>
          </div>
        </div>

        <div className="ck-glass-strong p-4">
          <div className="text-sm font-medium text-[color:var(--ck-text-primary)]">Next sub-areas (not yet)</div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[color:var(--ck-text-secondary)]">
            <li>Agents add/remove</li>
            <li>Skills</li>
            <li>Cron jobs</li>
            <li>Edit team-created files (SOUL.md, etc.)</li>
          </ul>
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/20 p-3 text-sm text-[color:var(--ck-text-primary)]">
          {message}
        </div>
      ) : null}

      <div className="mt-6 ck-glass-strong p-4">
        <div className="text-sm font-medium text-[color:var(--ck-text-primary)]">Recipe markdown</div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-2 h-[55vh] w-full resize-none rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 p-3 font-mono text-xs text-[color:var(--ck-text-primary)]"
          spellCheck={false}
        />
        <p className="mt-2 text-xs text-[color:var(--ck-text-tertiary)]">
          This editor currently bootstraps the custom recipe by cloning a source team recipe and patching frontmatter
          (id/name). Next: make edits to the body and write it back to the workspace recipe file.
        </p>
      </div>
    </div>
  );
}
