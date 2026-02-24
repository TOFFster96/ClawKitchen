"use client";

import { useEffect, useMemo, useState } from "react";
import { slugifyId } from "@/lib/slugify";
import { CreateModalShell } from "./CreateModalShell";

function getAvailabilityBorderClass(state: string): string {
  if (state === "available") return "border-emerald-400/50";
  if (state === "taken") return "border-red-400/60";
  return "border-white/10";
}

function getAvailabilityHint(state: string): string {
  if (state === "taken") return "That id is already taken.";
  if (state === "available") return "Id is available.";
  return "This will scaffold ~/.openclaw/workspace/agents/<agentId> and add the agent to config.";
}

type Availability =
  | { state: "empty" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken"; reason?: string };

export function CreateAgentModal({
  open,
  recipeId,
  recipeName,
  agentId,
  setAgentId,
  agentName,
  setAgentName,
  existingRecipeIds,
  existingAgentIds,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  recipeId: string;
  recipeName: string;
  agentId: string;
  setAgentId: (v: string) => void;
  agentName: string;
  setAgentName: (v: string) => void;
  existingRecipeIds: string[];
  existingAgentIds: string[];
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [idTouched, setIdTouched] = useState(false);
  const [availability, setAvailability] = useState<Availability>({ state: "empty" });

  const derivedId = useMemo(() => slugifyId(agentName), [agentName]);
  const effectiveId = idTouched ? agentId : derivedId;

  useEffect(() => {
    if (!open) return;
    if (!idTouched) setAgentId(derivedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Sync derivedId to agentId when user hasn't touched; setAgentId stable.
  }, [derivedId, open, idTouched]);

  useEffect(() => {
    if (!open) return;
    setIdTouched(false);
    setAgentName("");
    setAgentId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reset form when modal closes; reset setters intentionally omitted.
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const v = String(effectiveId ?? "").trim();
    if (!v) {
      setAvailability({ state: "empty" });
      return;
    }
    if (existingRecipeIds.includes(v)) {
      setAvailability({ state: "taken", reason: "recipe-id-collision" });
      return;
    }
    if (existingAgentIds.includes(v)) {
      setAvailability({ state: "taken", reason: "agent-exists" });
      return;
    }
    setAvailability({ state: "available" });

    const t = setTimeout(() => {
      void (async () => {
        setAvailability({ state: "checking" });
        try {
          const res = await fetch(`/api/ids/check?kind=agent&id=${encodeURIComponent(v)}`, { cache: "no-store" });
          const json = (await res.json()) as { ok?: boolean; available?: boolean; reason?: string };
          if (!res.ok || !json.ok) throw new Error(String((json as { error?: unknown }).error ?? "Failed to check id"));
          if (json.available) setAvailability({ state: "available" });
          else setAvailability({ state: "taken", reason: json.reason });
        } catch {
          setAvailability({ state: "available" });
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [effectiveId, open, existingRecipeIds, existingAgentIds]);

  return (
    <CreateModalShell
      open={open}
      title="Create agent"
      recipeId={recipeId}
      recipeName={recipeName}
      error={error}
      busy={busy}
      canConfirm={
        !!effectiveId.trim() &&
        availability.state !== "taken" &&
        availability.state !== "checking"
      }
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel="Create agent"
    >
      <div className="mt-4">
        <label className="text-sm font-medium text-[color:var(--ck-text-primary)]">Agent name</label>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="e.g. Crypto Onchain"
          className="mt-2 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--ck-text-primary)] placeholder:text-[color:var(--ck-text-tertiary)]"
          autoFocus
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-[color:var(--ck-text-primary)]">Agent id</label>
        <input
          value={effectiveId}
          onChange={(e) => {
            setIdTouched(true);
            setAgentId(e.target.value);
          }}
          placeholder="e.g. crypto-onchain"
          className={
            "mt-2 w-full rounded-[var(--ck-radius-sm)] border bg-white/5 px-3 py-2 text-sm text-[color:var(--ck-text-primary)] placeholder:text-[color:var(--ck-text-tertiary)] " +
            getAvailabilityBorderClass(availability.state)
          }
        />
        <div className="mt-2 text-xs text-[color:var(--ck-text-tertiary)]">
          {getAvailabilityHint(availability.state)}
        </div>
      </div>
    </CreateModalShell>
  );
}
