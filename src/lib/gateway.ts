import { readOpenClawConfig } from "@/lib/paths";

type ToolsInvokeRequest = {
  tool: string;
  action?: string;
  args?: Record<string, unknown>;
  sessionKey?: string;
  dryRun?: boolean;
};

type ToolsInvokeResponse = {
  ok: boolean;
  result?: unknown;
  error?: { message?: string } | string;
};

type GatewayConfigGetResult = {
  path: string;
  exists: boolean;
  raw: string;
  hash: string;
};

type ToolTextEnvelope = {
  ok: boolean;
  result: GatewayConfigGetResult;
};

async function getGatewayBaseUrlAndToken() {
  // Allow running ClawKitchen on a different host than the OpenClaw gateway.
  // Useful for remote dev/prod deployments where the gateway lives elsewhere.
  const envUrl = (process.env.OPENCLAW_GATEWAY_HTTP_URL || process.env.OPENCLAW_GATEWAY_URL || "").trim();
  const envToken = (process.env.OPENCLAW_GATEWAY_TOKEN || "").trim();

  const cfg = await readOpenClawConfig();
  const port = cfg.gateway?.port ?? 18789;
  const token = envToken || cfg.gateway?.auth?.token;
  if (!token) throw new Error("Missing gateway token. Set OPENCLAW_GATEWAY_TOKEN or gateway.auth.token in ~/.openclaw/openclaw.json");

  const baseUrl = envUrl || `http://127.0.0.1:${port}`;
  return { baseUrl, token };
}

export async function toolsInvoke<T = unknown>(req: ToolsInvokeRequest): Promise<T> {
  const { baseUrl, token } = await getGatewayBaseUrlAndToken();

  const res = await fetch(`${baseUrl}/tools/invoke`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });

  const json = (await res.json()) as ToolsInvokeResponse;
  if (!res.ok || !json.ok) {
    const msg =
      (typeof json.error === "object" && json.error?.message) ||
      (typeof json.error === "string" ? json.error : null) ||
      `tools/invoke failed (${res.status})`;
    throw new Error(msg);
  }

  return json.result as T;
}

import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

function sha256(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isRecord(base) || !isRecord(patch)) return patch;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) {
      delete out[k];
      continue;
    }
    out[k] = deepMerge(out[k], v);
  }
  return out;
}

async function configFilePath() {
  return path.join(process.env.HOME || "", ".openclaw", "openclaw.json");
}

async function gatewayConfigGetViaTool(): Promise<{ raw: string; hash: string }> {
  const toolResult = await toolsInvoke<{ content: Array<{ type: string; text?: string }> }>({
    tool: "gateway",
    args: { action: "config.get", raw: "{}" },
  });

  const text = toolResult?.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("gateway config.get: missing text payload");

  const parsed = JSON.parse(text) as ToolTextEnvelope;
  const raw = String(parsed?.result?.raw ?? "");
  const hash = String(parsed?.result?.hash ?? "");
  if (!raw) throw new Error("gateway config.get: missing result.raw");
  if (!hash) throw new Error("gateway config.get: missing result.hash");
  return { raw, hash };
}

async function gatewayConfigGetViaFile(): Promise<{ raw: string; hash: string }> {
  const p = await configFilePath();
  const raw = await fs.readFile(p, "utf8");
  return { raw, hash: sha256(raw) };
}

export async function gatewayConfigGet(): Promise<{ raw: string; hash: string }> {
  try {
    return await gatewayConfigGetViaTool();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Tool not available: gateway")) {
      return await gatewayConfigGetViaFile();
    }
    throw e;
  }
}

async function gatewayConfigPatchViaTool(patch: unknown, note?: string) {
  const { hash } = await gatewayConfigGetViaTool();
  const raw = JSON.stringify(patch, null, 2);

  return toolsInvoke({
    tool: "gateway",
    args: {
      action: "config.patch",
      raw,
      baseHash: hash,
      note: note ?? "ClawKitchen settings update",
      restartDelayMs: 1000,
    },
  });
}

async function gatewayConfigPatchViaFile(patch: unknown) {
  const p = await configFilePath();
  const existingRaw = await fs.readFile(p, "utf8");
  const existing = JSON.parse(existingRaw) as unknown;
  const next = deepMerge(existing, patch);
  const nextRaw = JSON.stringify(next, null, 2) + "\n";

  const backup = `${p}.bak.${Date.now()}`;
  await fs.writeFile(backup, existingRaw, "utf8");
  await fs.writeFile(p, nextRaw, "utf8");
  return { ok: true, note: "Wrote ~/.openclaw/openclaw.json directly; restart gateway to apply." };
}

export async function gatewayConfigPatch(patch: unknown, note?: string) {
  try {
    return await gatewayConfigPatchViaTool(patch, note);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Tool not available: gateway")) {
      return await gatewayConfigPatchViaFile(patch);
    }
    throw e;
  }
}
