import { NextResponse } from "next/server";
import { toolsInvoke } from "@/lib/gateway";

import fs from "node:fs/promises";
import path from "node:path";

type MappingStateV1 = {
  version: 1;
  entries: Record<string, { installedCronId: string; orphaned?: boolean }>;
};

export async function POST(req: Request) {
  const body = (await req.json()) as { id?: string };
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const result = await toolsInvoke({ tool: "cron", args: { action: "remove", jobId: id } });

  // Best-effort provenance cleanup: mark any mapping entry that references this cron id as orphaned.
  // Source of truth is team workspaces' notes/cron-jobs.json written at scaffold time.
  const orphanedIn: Array<{ teamId: string; mappingPath: string; keys: string[] }> = [];

  try {
    // Find base workspace path via gateway config.
    const cfg = await toolsInvoke<{ content: Array<{ type: string; text?: string }> }>({
      tool: "gateway",
      args: { action: "config.get", raw: "{}" },
    });
    const cfgText = cfg?.content?.find((c) => c.type === "text")?.text ?? "";
    const env = cfgText ? (JSON.parse(cfgText) as { result?: { raw?: string } }) : null;
    const raw = String(env?.result?.raw ?? "");
    const parsedRaw = raw ? (JSON.parse(raw) as { agents?: { defaults?: { workspace?: string } } }) : null;
    const baseWorkspace = String(parsedRaw?.agents?.defaults?.workspace ?? "").trim();

    if (baseWorkspace) {
      const baseHome = path.resolve(baseWorkspace, "..");
      const entries = await fs.readdir(baseHome, { withFileTypes: true });

      for (const ent of entries) {
        if (!ent.isDirectory()) continue;
        if (!ent.name.startsWith("workspace-")) continue;

        const teamId = ent.name.replace(/^workspace-/, "");
        const teamJsonPath = path.join(baseHome, ent.name, "team.json");
        const mappingPath = path.join(baseHome, ent.name, "notes", "cron-jobs.json");

        try {
          await fs.stat(teamJsonPath);
        } catch {
          continue;
        }

        let changed = false;
        const keys: string[] = [];
        try {
          const rawMapping = await fs.readFile(mappingPath, "utf8");
          const mapping = JSON.parse(rawMapping) as MappingStateV1;
          if (!mapping || mapping.version !== 1 || !mapping.entries) continue;

          for (const [k, v] of Object.entries(mapping.entries)) {
            if (String(v?.installedCronId ?? "").trim() === id && !v.orphaned) {
              mapping.entries[k] = { ...v, orphaned: true };
              changed = true;
              keys.push(k);
            }
          }

          if (changed) {
            await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2) + "\n", "utf8");
            orphanedIn.push({ teamId, mappingPath, keys });
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true, id, result, orphanedIn });
}
