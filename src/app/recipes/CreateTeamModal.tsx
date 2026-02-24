"use client";

import { useEffect, useMemo, useState } from "react";
import { slugifyId } from "@/lib/slugify";
import { CreateModalShell } from "./CreateModalShell";

export function CreateTeamModal({
  open,
  recipeId,
  recipeName,
  teamId,
  setTeamId,
  installCron,
  setInstallCron,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  recipeId: string;
  recipeName: string;
  teamId: string;
  setTeamId: (v: string) => void;
  installCron: boolean;
  setInstallCron: (v: boolean) => void;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [idTouched, setIdTouched] = useState(false);

  const derivedId = useMemo(() => slugifyId(teamName), [teamName]);
  const effectiveId = idTouched ? teamId : derivedId;

  useEffect(() => {
    if (!open) return;
    if (!idTouched) setTeamId(derivedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Sync derivedId to teamId when user hasn't touched; setTeamId stable.
  }, [derivedId, open, idTouched]);

  useEffect(() => {
    if (!open) return;
    setIdTouched(false);
    setTeamName("");
    setTeamId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reset form when modal closes; reset setters intentionally omitted.
  }, [open]);

  return (
    <CreateModalShell
      open={open}
      title="Create team"
      recipeId={recipeId}
      recipeName={recipeName}
      error={error}
      busy={busy}
      canConfirm={!!effectiveId.trim()}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Create team"
    >
      <div className="mt-4">
        <label className="text-sm font-medium text-[color:var(--ck-text-primary)]">Team name</label>
        <input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Crypto Team"
          className="mt-2 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--ck-text-primary)] placeholder:text-[color:var(--ck-text-tertiary)]"
          autoFocus
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-[color:var(--ck-text-primary)]">Team id</label>
        <input
          value={effectiveId}
          onChange={(e) => {
            setIdTouched(true);
            setTeamId(e.target.value);
          }}
          placeholder="e.g. my-team"
          className="mt-2 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--ck-text-primary)] placeholder:text-[color:var(--ck-text-tertiary)]"
        />
        <div className="mt-2 text-xs text-[color:var(--ck-text-tertiary)]">
          This will scaffold ~/.openclaw/workspace-&lt;teamId&gt; and add the team to config.
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-[color:var(--ck-text-secondary)]">
        <input type="checkbox" checked={installCron} onChange={(e) => setInstallCron(e.target.checked)} />
        Install cron jobs from this recipe
      </label>
    </CreateModalShell>
  );
}
