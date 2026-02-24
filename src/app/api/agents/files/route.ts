import { NextResponse } from "next/server";
import { resolveAgentWorkspace } from "@/lib/agents";
import { listWorkspaceFiles } from "@/lib/api-route-helpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const agentId = String(searchParams.get("agentId") ?? "").trim();
  if (!agentId) return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 });

  const ws = await resolveAgentWorkspace(agentId);

  const candidates = [
    { name: "SOUL.md", required: true, rationale: "Agent persona/instructions" },
    { name: "AGENTS.md", required: true, rationale: "Agent operating rules" },
    { name: "TOOLS.md", required: true, rationale: "Agent local notes" },
    { name: "STATUS.md", required: false, rationale: "Optional current status snapshot" },
    { name: "NOTES.md", required: false, rationale: "Optional scratchpad" },
    { name: "IDENTITY.md", required: false, rationale: "Optional identity (name/emoji/avatar)" },
    { name: "USER.md", required: false, rationale: "Optional user profile" },
    { name: "HEARTBEAT.md", required: false, rationale: "Optional periodic checklist" },
    { name: "MEMORY.md", required: false, rationale: "Optional curated memory" },
  ];

  const files = await listWorkspaceFiles(ws, candidates);
  return NextResponse.json({ ok: true, agentId, workspace: ws, files });
}
