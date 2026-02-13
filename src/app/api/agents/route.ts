import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

type Team = { id: string; name: string };

type Agent = {
  id: string;
  teamId: string | null;
  role: string | null;
};

function getHomeDir() {
  return process.env.HOME || "/home/control";
}

async function listDirectories(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function getInstalledTeams(): Promise<Team[]> {
  const openclawRoot = path.join(getHomeDir(), ".openclaw");
  const all = await listDirectories(openclawRoot);

  // Convention: team workspaces are stored as ~/.openclaw/workspace-<teamId>
  const teams = all
    .filter((d) => d.startsWith("workspace-") && d !== "workspace-main")
    .map((d) => d.slice("workspace-".length))
    // Only treat these as teams if the workspace looks like a team recipe workspace.
    // (We keep this permissive: any non-main workspace can represent a team install.)
    .filter(Boolean)
    .map((id) => ({ id, name: id }));

  teams.sort((a, b) => a.id.localeCompare(b.id));
  return teams;
}

async function getInstalledAgents(teams: Team[]): Promise<Agent[]> {
  const agentsRoot = path.join(getHomeDir(), ".openclaw", "agents");
  const ids = await listDirectories(agentsRoot);

  const teamIds = new Set(teams.map((t) => t.id));

  const agents: Agent[] = ids.map((id) => {
    // Team agents are conventionally named <teamId>-<role>
    const teamMatch = teams.find((t) => id.startsWith(`${t.id}-`));

    const teamId = teamMatch ? teamMatch.id : null;
    const role = teamId ? id.slice(teamId.length + 1) : null;

    return {
      id,
      teamId: teamId && teamIds.has(teamId) ? teamId : null,
      role,
    };
  });

  agents.sort((a, b) => a.id.localeCompare(b.id));
  return agents;
}

export async function GET() {
  try {
    const teams = await getInstalledTeams();
    const agents = await getInstalledAgents(teams);

    return NextResponse.json({ teams, agents });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to list installed agents",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
