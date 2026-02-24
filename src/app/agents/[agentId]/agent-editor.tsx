"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { IdentityTab, ConfigTab, SkillsTab, FilesTab } from "./agent-editor-tabs";

type AgentListItem = {
  id: string;
  identityName?: string;
  workspace?: string;
  model?: string;
  isDefault?: boolean;
};

type FileListResponse = { ok?: boolean; files?: unknown[] };

type FileEntry = { name: string; missing: boolean };

async function loadAgentFilesAndSkills(
  agentId: string,
  setters: {
    setAgentFiles: (f: Array<FileEntry & { required?: boolean; rationale?: string }>) => void;
    setSkillsList: (s: string[]) => void;
    setAvailableSkills: (s: string[]) => void;
    setSelectedSkill: (s: string) => void;
    setAgentFilesLoading: (v: boolean) => void;
    setSkillsLoading: (v: boolean) => void;
  }
): Promise<void> {
  setters.setAgentFilesLoading(true);
  setters.setSkillsLoading(true);
  try {
    const [filesRes, skillsRes, availableSkillsRes] = await Promise.all([
      fetch(`/api/agents/files?agentId=${encodeURIComponent(agentId)}`, { cache: "no-store" }),
      fetch(`/api/agents/skills?agentId=${encodeURIComponent(agentId)}`, { cache: "no-store" }),
      fetch("/api/skills/available", { cache: "no-store" }),
    ]);

    let installedSkills: string[] = [];
    try {
      const filesJson = (await filesRes.json()) as FileListResponse;
      if (filesRes.ok && filesJson.ok) {
        const files = Array.isArray(filesJson.files) ? filesJson.files : [];
        setters.setAgentFiles(
          files.map((f) => {
            const entry = f as { name?: unknown; missing?: unknown };
            return {
              name: String(entry.name ?? ""),
              missing: Boolean(entry.missing),
              required: Boolean((entry as { required?: unknown }).required),
              rationale:
                typeof (entry as { rationale?: unknown }).rationale === "string"
                  ? ((entry as { rationale?: string }).rationale as string)
                  : undefined,
            };
          }),
        );
      }
    } catch {
      // ignore
    }
    try {
      const skillsJson = (await skillsRes.json()) as { ok?: boolean; skills?: unknown[] };
      if (skillsRes.ok && skillsJson.ok) {
        installedSkills = Array.isArray(skillsJson.skills) ? (skillsJson.skills as string[]) : [];
        setters.setSkillsList(installedSkills);
      }
    } catch {
      // ignore
    }
    try {
      const availableSkillsJson = (await availableSkillsRes.json()) as { ok?: boolean; skills?: unknown[] };
      if (availableSkillsRes.ok && availableSkillsJson.ok) {
        const list = Array.isArray(availableSkillsJson.skills) ? (availableSkillsJson.skills as string[]) : [];
        setters.setAvailableSkills(list);
        const first = list.find((s) => !installedSkills.includes(s));
        setters.setSelectedSkill(first ?? list[0] ?? "");
      }
    } catch {
      // ignore
    }
  } finally {
    setters.setAgentFilesLoading(false);
    setters.setSkillsLoading(false);
  }
}

function DeleteAgentModal({
  open,
  agentId,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  agentId: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmationModal
      open={open}
      onClose={onClose}
      title="Delete agent"
      error={error ?? undefined}
      confirmLabel="Delete"
      confirmBusyLabel="Deleting…"
      onConfirm={onConfirm}
      busy={busy}
    >
      <p className="mt-2 text-sm text-[color:var(--ck-text-secondary)]">
        Delete agent <code className="font-mono">{agentId}</code>? This will remove its workspace/state.
      </p>
    </ConfirmationModal>
  );
}

export default function AgentEditor({ agentId, returnTo }: { agentId: string; returnTo?: string }) {
  const router = useRouter();
  const [agent, setAgent] = useState<AgentListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  // Split concerns: avoid file-load errors showing up in the Skills notice area.
  const [pageMsg, setPageMsg] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [skillMsg, setSkillMsg] = useState<string>("");
  const [skillError, setSkillError] = useState<string>("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"identity" | "config" | "skills" | "files">("identity");

  const [name, setName] = useState<string>("");
  const [emoji, setEmoji] = useState<string>("");
  const [theme, setTheme] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");

  const [model, setModel] = useState<string>("");

  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [installingSkill, setInstallingSkill] = useState(false);

  const [agentFiles, setAgentFiles] = useState<Array<FileEntry & { required?: boolean; rationale?: string }>>([]);
  const [agentFilesLoading, setAgentFilesLoading] = useState(false);
  const [showOptionalFiles, setShowOptionalFiles] = useState(false);
  const [fileName, setFileName] = useState<string>("SOUL.md");
  const [fileContent, setFileContent] = useState<string>("");

  const teamId = agentId.includes("-") ? agentId.split("-").slice(0, -1).join("-") : "";

  useEffect(() => {
    (async () => {
      setLoading(true);
      setPageMsg("");
      try {
        const agentsRes = await fetch("/api/agents", { cache: "no-store" });
        const agentsJson = (await agentsRes.json()) as { agents?: unknown[] };
        const list = Array.isArray(agentsJson.agents) ? (agentsJson.agents as AgentListItem[]) : [];
        const found = list.find((a) => a.id === agentId) ?? null;
        setAgent(found);
        setName(found?.identityName ?? "");
        setModel(found?.model ?? "");

        setLoading(false);

        void loadAgentFilesAndSkills(agentId, {
          setAgentFiles,
          setSkillsList,
          setAvailableSkills,
          setSelectedSkill,
          setAgentFilesLoading,
          setSkillsLoading,
        });
      } catch (e: unknown) {
        setPageMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [agentId]);

  async function onSaveIdentity() {
    setSaving(true);
    setPageMsg("");
    try {
      const res = await fetch("/api/agents/identity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, name, emoji, theme, avatar }),
      });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(json.message || json.error || "Save failed");
      setPageMsg("Saved identity via openclaw agents set-identity");
    } catch (e: unknown) {
      setPageMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveConfig() {
    setSaving(true);
    setPageMsg("");

    try {
      const res = await fetch("/api/agents/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, patch: { model } }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Save config failed");
      setPageMsg("Saved agent config (model) and restarted gateway");
    } catch (e: unknown) {
      setPageMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onLoadAgentFile(nextName: string) {
    // Update selection immediately so the UI reflects what the user clicked,
    // even if the network request fails.
    setFileName(nextName);
    setFileContent("");

    setLoadingFile(true);
    setFileError("");
    try {
      const res = await fetch(
        `/api/agents/file?agentId=${encodeURIComponent(agentId)}&name=${encodeURIComponent(nextName)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string; content?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load file");
      setFileContent(String(json.content ?? ""));
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFile(false);
    }
  }

  // When entering the Files tab, load the current file immediately (default: IDENTITY.md).
  useEffect(() => {
    if (activeTab !== "files") return;
    if (!agentFiles.length) return;

    const exists = agentFiles.some((f) => f.name === fileName);
    const fallback = agentFiles[0]?.name;
    const target = exists ? fileName : fallback;
    if (!target) return;

    if (target !== fileName) {
      setFileName(target);
      setFileContent("");
    }

    if (!fileContent) {
      onLoadAgentFile(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Load file when entering Files tab; onLoadAgentFile and fileContent intentionally omitted.
  }, [activeTab, agentId, agentFiles.length]);

  function defaultFileContent(name: string) {
    switch (name) {
      case "SOUL.md":
        return "# SOUL.md\n\n";
      case "AGENTS.md":
        return "# AGENTS.md\n\n";
      case "TOOLS.md":
        return "# TOOLS.md\n\n";
      case "STATUS.md":
        return "# STATUS.md\n\n- (empty)\n";
      case "NOTES.md":
        return "# NOTES.md\n\n- (empty)\n";
      case "IDENTITY.md":
        return "# IDENTITY.md\n\n- **Name:**\n- **Creature:**\n- **Vibe:**\n- **Emoji:**\n- **Avatar:**\n";
      case "USER.md":
        return "# USER.md\n\n";
      case "HEARTBEAT.md":
        return "# HEARTBEAT.md\n\n# Keep this file empty (or with only comments) to skip heartbeat API calls.\n";
      default:
        return "";
    }
  }

  async function onSaveAgentFile() {
    setSaving(true);
    setFileError("");
    try {
      const res = await fetch("/api/agents/file", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, name: fileName, content: fileContent }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save file");

      // Refresh the file list so missing/mtime updates immediately.
      const r = await fetch(`/api/agents/files?agentId=${encodeURIComponent(agentId)}`, { cache: "no-store" });
      const j = await r.json();
      if (r.ok && j.ok && Array.isArray(j.files)) {
        setAgentFiles(j.files);
      }
      // No-op: saving a file doesn't need a global notice.
    } catch (e: unknown) {
      setFileError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onCreateMissingFile(name: string) {
    setFileName(name);
    setFileError("");
    setFileContent(defaultFileContent(name));
    await onSaveAgentFile();
  }

  async function onDeleteAgent() {
    setDeleteBusy(true);
    setDeleteError(null);
    setPageMsg("");

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}`, { method: "DELETE" });
      const json = (await res.json()) as { ok?: boolean; error?: string; message?: string; stderr?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || json.message || json.stderr || "Delete failed");

      window.location.href = "/";
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : String(e));
      setDeleteBusy(false);
    }
  }

  // Initial load only gates the minimal state (agent exists). Files/skills stream in.
  if (loading) return <div className="ck-glass mx-auto max-w-4xl p-6">Loading…</div>;
  if (!agent) return <div className="ck-glass mx-auto max-w-4xl p-6">Agent not found: {agentId}</div>;

  return (
    <div className="ck-glass mx-auto max-w-4xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent editor</h1>
          <div className="mt-1 text-xs text-[color:var(--ck-text-secondary)]">
            {agent.id}
            {agent.isDefault ? " • default" : ""}
            {agent.model ? ` • ${agent.model}` : ""}
          </div>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setDeleteError(null);
            setDeleteOpen(true);
          }}
          className="rounded-[var(--ck-radius-sm)] border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-100 shadow-[var(--ck-shadow-1)] hover:bg-red-500/15 disabled:opacity-50"
        >
          Delete agent
        </button>
      </div>
      {agent.workspace ? (
        <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">Workspace: {agent.workspace}</div>
      ) : null}
      {teamId ? <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">Team: {teamId}</div> : null}

      {pageMsg ? (
        <div className="mt-4 rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 p-3 text-sm text-[color:var(--ck-text-primary)]">
          {pageMsg}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: "identity", label: "Identity" },
            { id: "config", label: "Config" },
            { id: "skills", label: "Skills" },
            { id: "files", label: "Files" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={
              activeTab === t.id
                ? "rounded-[var(--ck-radius-sm)] bg-[var(--ck-accent-red)] px-3 py-2 text-sm font-medium text-white shadow-[var(--ck-shadow-1)]"
                : "rounded-[var(--ck-radius-sm)] border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[color:var(--ck-text-primary)] shadow-[var(--ck-shadow-1)] hover:bg-white/10"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {activeTab === "identity" && (
          <IdentityTab
            name={name}
            emoji={emoji}
            theme={theme}
            avatar={avatar}
            saving={saving}
            returnTo={returnTo}
            onNameChange={setName}
            onEmojiChange={setEmoji}
            onThemeChange={setTheme}
            onAvatarChange={setAvatar}
            onSave={onSaveIdentity}
            router={router}
          />
        )}
        {activeTab === "config" && (
          <ConfigTab
            model={model}
            saving={saving}
            onModelChange={setModel}
            onSave={onSaveConfig}
          />
        )}
        {activeTab === "skills" && (
          <SkillsTab
            agentId={agentId}
            skillsList={skillsList}
            availableSkills={availableSkills}
            skillsLoading={skillsLoading}
            selectedSkill={selectedSkill}
            installingSkill={installingSkill}
            skillError={skillError}
            skillMsg={skillMsg}
            onSelectedSkillChange={setSelectedSkill}
            onInstallSkill={async () => {
              setInstallingSkill(true);
              setSkillMsg("");
              setSkillError("");
              try {
                const res = await fetch("/api/agents/skills/install", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ agentId, skill: selectedSkill }),
                });
                const json = await res.json();
                if (!res.ok || !json.ok) throw new Error(json.error || "Failed to install skill");
                setSkillMsg(`Installed skill: ${selectedSkill}`);
                const r = await fetch(`/api/agents/skills?agentId=${encodeURIComponent(agentId)}`, { cache: "no-store" });
                const j = await r.json();
                if (r.ok && j.ok) setSkillsList(Array.isArray(j.skills) ? j.skills : []);
              } catch (e: unknown) {
                setSkillError(e instanceof Error ? e.message : String(e));
              } finally {
                setInstallingSkill(false);
              }
            }}
          />
        )}
        {activeTab === "files" && (
          <FilesTab
            agentFiles={agentFiles}
            agentFilesLoading={agentFilesLoading}
            showOptionalFiles={showOptionalFiles}
            fileName={fileName}
            fileContent={fileContent}
            loadingFile={loadingFile}
            saving={saving}
            fileError={fileError}
            onShowOptionalChange={setShowOptionalFiles}
            onLoadFile={onLoadAgentFile}
            onFileContentChange={setFileContent}
            onSaveFile={onSaveAgentFile}
            onCreateMissingFile={onCreateMissingFile}
          />
        )}
      </div>

      <DeleteAgentModal
        open={deleteOpen}
        agentId={agentId}
        busy={deleteBusy}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDeleteAgent()}
      />
    </div>
  );
}
