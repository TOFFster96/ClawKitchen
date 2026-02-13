import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { NextResponse } from "next/server";
import { getWorkspaceRecipesDir } from "@/lib/paths";

function splitFrontmatter(md: string) {
  if (!md.startsWith("---\n")) throw new Error("Recipe markdown must start with YAML frontmatter (---)");
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("Recipe frontmatter not terminated (---)");
  const yamlText = md.slice(4, end + 1);
  const rest = md.slice(end + 5);
  return { yamlText, rest };
}

function normalizeRole(role: string) {
  const r = role.trim();
  if (!r) throw new Error("role is required");
  if (!/^[a-z][a-z0-9-]{0,62}$/i.test(r)) throw new Error("role must be alphanumeric/dash");
  return r;
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    recipeId?: string;
    op?: "add" | "remove";
    role?: string;
    name?: string;
  };

  const recipeId = String(body.recipeId ?? "").trim();
  const op = body.op;
  if (!recipeId) return NextResponse.json({ ok: false, error: "recipeId is required" }, { status: 400 });
  if (op !== "add" && op !== "remove") {
    return NextResponse.json({ ok: false, error: "op must be add|remove" }, { status: 400 });
  }

  const role = normalizeRole(String(body.role ?? ""));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  const dir = await getWorkspaceRecipesDir();
  const filePath = path.join(dir, `${recipeId}.md`);

  const md = await fs.readFile(filePath, "utf8");
  const { yamlText, rest } = splitFrontmatter(md);
  const fm = (YAML.parse(yamlText) ?? {}) as Record<string, unknown>;

  const kind = String(fm.kind ?? "");
  if (kind && kind !== "team") {
    return NextResponse.json({ ok: false, error: `recipe kind must be team (got ${kind})` }, { status: 400 });
  }

  const agentsRaw = fm.agents;
  const agents: Array<Record<string, unknown>> = Array.isArray(agentsRaw)
    ? (agentsRaw as Array<Record<string, unknown>>)
    : [];

  let nextAgents = agents.slice();

  if (op === "remove") {
    nextAgents = nextAgents.filter((a) => String(a.role ?? "") !== role);
  } else {
    // add or update by role
    const next = {
      ...agents.find((a) => String(a.role ?? "") === role),
      role,
      ...(name ? { name } : {}),
    };
    const idx = nextAgents.findIndex((a) => String(a.role ?? "") === role);
    if (idx === -1) nextAgents.push(next);
    else nextAgents[idx] = next;
  }

  // Keep stable order by role.
  nextAgents.sort((a, b) => String(a.role ?? "").localeCompare(String(b.role ?? "")));

  const nextFm = { ...fm, agents: nextAgents };
  const nextYaml = YAML.stringify(nextFm).trimEnd();
  const nextMd = `---\n${nextYaml}\n---\n${rest}`;

  await fs.writeFile(filePath, nextMd, "utf8");

  return NextResponse.json({ ok: true, recipeId, filePath, agents: nextAgents, content: nextMd });
}
