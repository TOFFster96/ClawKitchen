"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

type ChannelConfig = Record<string, unknown>;

type ChannelsResponse = {
  ok: boolean;
  channels?: Record<string, unknown>;
  bindings?: unknown[];
  error?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function Button({
  children,
  onClick,
  kind,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind?: "primary" | "danger";
  disabled?: boolean;
}) {
  const base =
    "rounded-[var(--ck-radius-sm)] px-3 py-2 text-sm font-medium transition disabled:opacity-50 " +
    (kind === "primary"
      ? "bg-[var(--ck-accent-red)] text-white"
      : kind === "danger"
        ? "border border-red-400/40 text-red-200 hover:bg-red-500/10"
        : "border border-[color:var(--ck-border-subtle)] hover:bg-[color:var(--ck-bg-glass)]");
  return (
    <button className={base} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function DeleteBindingModal({
  open,
  provider,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  provider: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[color:var(--ck-bg-glass-strong)] p-5 shadow-[var(--ck-shadow-2)]">
            <div className="text-lg font-semibold text-[color:var(--ck-text-primary)]">Delete binding</div>
            <p className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">
              Delete channel binding <code className="font-mono">{provider}</code>?
            </p>

            {error ? (
              <div className="mt-4 rounded-[var(--ck-radius-sm)] border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)] hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="rounded-[var(--ck-radius-sm)] bg-[var(--ck-accent-red)] px-3 py-2 text-sm font-medium text-white shadow-[var(--ck-shadow-1)] hover:bg-[var(--ck-accent-red-hover)] disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AddBindingModal({
  open,
  value,
  error,
  onClose,
  onChange,
  onConfirm,
}: {
  open: boolean;
  value: string;
  error?: string | null;
  onClose: () => void;
  onChange: (v: string) => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[color:var(--ck-bg-glass-strong)] p-5 shadow-[var(--ck-shadow-2)]">
            <div className="text-lg font-semibold text-[color:var(--ck-text-primary)]">Add binding</div>
            <p className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">
              Enter the provider id (e.g. <code className="font-mono">telegram</code>, <code className="font-mono">whatsapp</code>).
            </p>

            <label className="mt-4 block text-xs font-medium text-[color:var(--ck-text-secondary)]">Provider id</label>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-1 w-full rounded-[var(--ck-radius-sm)] border border-white/10 bg-black/25 px-3 py-2 text-sm text-[color:var(--ck-text-primary)] font-mono"
              placeholder="telegram"
            />

            {error ? (
              <div className="mt-3 text-sm text-red-200">{error}</div>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)] hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!value.trim()}
                onClick={onConfirm}
                className="rounded-[var(--ck-radius-sm)] bg-[var(--ck-accent-red)] px-3 py-2 text-sm font-medium text-white shadow-[var(--ck-shadow-1)] hover:bg-[var(--ck-accent-red-hover)] disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function ChannelsClient() {
  const [channels, setChannels] = useState<Record<string, unknown>>({});
  const [bindings, setBindings] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>("telegram");
  const [configJson, setConfigJson] = useState<string>("{\n  \"enabled\": true\n}\n");
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addProviderId, setAddProviderId] = useState("telegram");
  const [addError, setAddError] = useState<string | null>(null);

  async function fetchBindings(): Promise<
    | { ok: true; channels: Record<string, unknown>; bindings: unknown[] }
    | { ok: false; error: string }
  > {
    const res = await fetch("/api/channels/bindings", { cache: "no-store" });
    const data = (await res.json()) as ChannelsResponse;
    if (!res.ok || !data?.ok) {
      return { ok: false, error: String(data?.error ?? `Failed to load channels (${res.status})`) };
    }
    const ch = isRecord(data.channels) ? data.channels : {};
    const b = Array.isArray(data.bindings) ? data.bindings : [];
    return { ok: true, channels: ch, bindings: b };
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBindings();
      if (!result.ok) {
        setError(result.error);
        setChannels({});
        setBindings([]);
        setLoading(false);
        return;
      }
      setChannels(result.channels);
      setBindings(result.bindings);
      setLoading(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setChannels({});
      setBindings([]);
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const providers = useMemo(() => {
    const keys = Object.keys(channels);
    keys.sort();
    return keys.filter((k) => channels[k] != null);
  }, [channels]);

  function selectProvider(p: string) {
    setProvider(p);
    const cfg = channels[p];
    setConfigJson(JSON.stringify(cfg ?? {}, null, 2) + "\n");
  }

  async function upsert() {
    setSaving(true);
    setError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(configJson);
    } catch {
      setError("Config must be valid JSON");
      setSaving(false);
      return;
    }
    if (!isRecord(parsed)) {
      setError("Config must be a JSON object");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/channels/bindings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: provider.trim(), config: parsed }),
    });
    const data = (await res.json()) as ChannelsResponse;
    if (!res.ok || !data?.ok) {
      setError(String(data?.error ?? "Failed to save"));
      setSaving(false);
      return;
    }

    await refresh();
    setSaving(false);
  }

  async function doDelete(p: string) {
    setDeleteBusy(true);
    setDeleteError(null);

    const res = await fetch("/api/channels/bindings", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: p }),
    });
    const data = (await res.json()) as ChannelsResponse;
    if (!res.ok || !data?.ok) {
      setDeleteError(String(data?.error ?? "Failed to delete"));
      setDeleteBusy(false);
      return;
    }

    setDeleteOpen(false);
    await refresh();
    setDeleteBusy(false);
  }

  function openAddBinding() {
    setAddError(null);
    setAddProviderId("telegram");
    setAddOpen(true);
  }

  function confirmAddBinding() {
    const next = addProviderId.trim();
    if (!next) return;

    if (!/^[-a-z0-9_.]+$/i.test(next)) {
      setAddError("Provider id contains invalid characters");
      return;
    }

    setProvider(next);
    setConfigJson("{\n  \"enabled\": true\n}\n");
    setAddOpen(false);
  }

  const selectedConfig = useMemo(() => {
    const v = channels[provider];
    return isRecord(v) ? (v as ChannelConfig) : null;
  }, [channels, provider]);

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <p className="mt-1 text-sm text-[color:var(--ck-text-secondary)]">
            Source of truth: OpenClaw gateway config (patched via <code className="font-mono">gateway config.patch</code>).
            Some changes may require a gateway restart depending on provider.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => void refresh()} disabled={saving}>
            Refresh
          </Button>
          <Button kind="primary" onClick={openAddBinding} disabled={saving}>
            Add binding
          </Button>
        </div>
      </div>

      {error ? <div className="ck-glass p-4 text-sm text-red-300">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="ck-glass p-4">
          <div className="text-sm font-medium">Channel configs</div>
          {loading ? (
            <div className="mt-3 text-sm text-[color:var(--ck-text-secondary)]">Loading…</div>
          ) : providers.length === 0 ? (
            <div className="mt-3 text-sm text-[color:var(--ck-text-secondary)]">No bindings configured.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {providers.map((p) => (
                <button
                  key={p}
                  className={
                    "flex w-full items-center justify-between rounded-[var(--ck-radius-sm)] border px-3 py-2 text-left text-sm " +
                    (p === provider
                      ? "border-[var(--ck-accent-red)] bg-[color:var(--ck-bg-glass)]"
                      : "border-[color:var(--ck-border-subtle)] hover:bg-[color:var(--ck-bg-glass)]")
                  }
                  onClick={() => selectProvider(p)}
                >
                  <span className="font-mono">{p}</span>
                  <span className="text-xs text-[color:var(--ck-text-tertiary)]">edit</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ck-glass p-4 lg:col-span-2">
          <div className="ck-glass-strong p-3">
            <div className="text-sm font-medium">Routing bindings (read-only)</div>
            <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">
              These are message routing bindings in <code className="font-mono">openclaw.json</code>.
            </div>
            {loading ? (
              <div className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">Loading…</div>
            ) : bindings.length === 0 ? (
              <div className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">No bindings found.</div>
            ) : (
              <ul className="mt-2 space-y-1 text-xs text-[color:var(--ck-text-secondary)]">
                {bindings.slice(0, 20).map((b, i) => (
                  <li key={i} className="font-mono">
                    {JSON.stringify(b)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Edit</div>
              <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">
                Provider: <code className="font-mono">{provider}</code>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                kind="danger"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
                disabled={saving}
              >
                Delete
              </Button>
              <Button kind="primary" onClick={() => void upsert()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs text-[color:var(--ck-text-tertiary)]">Config (JSON)</div>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="mt-2 h-[420px] w-full rounded-[var(--ck-radius-sm)] border border-[color:var(--ck-border-subtle)] bg-transparent px-3 py-2 font-mono text-sm"
              placeholder={"{\n  \"enabled\": true\n}"}
            />
            <div className="mt-2 text-xs text-[color:var(--ck-text-tertiary)]">
              Validation:
              <ul className="list-disc pl-5">
                <li>Telegram requires <code className="font-mono">botToken</code>.</li>
                <li>Other providers can be edited as raw JSON in v1.</li>
              </ul>
            </div>

            {selectedConfig ? (
              <div className="mt-3 text-xs text-[color:var(--ck-text-tertiary)]">
                Current keys: <code className="font-mono">{Object.keys(selectedConfig).join(", ") || "(none)"}</code>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>

    <DeleteBindingModal
      open={deleteOpen}
      provider={provider}
      busy={deleteBusy}
      error={deleteError}
      onClose={() => setDeleteOpen(false)}
      onConfirm={() => void doDelete(provider)}
    />

    <AddBindingModal
      open={addOpen}
      value={addProviderId}
      error={addError}
      onClose={() => setAddOpen(false)}
      onChange={(v) => setAddProviderId(v)}
      onConfirm={confirmAddBinding}
    />
    </>
  );
}
