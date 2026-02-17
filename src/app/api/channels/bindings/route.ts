import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

async function configPath() {
  const home = process.env.HOME || "";
  if (!home) throw new Error("HOME is not set");
  return path.join(home, ".openclaw", "openclaw.json");
}

async function readConfig(): Promise<Record<string, unknown>> {
  const p = await configPath();
  const raw = await fs.readFile(p, "utf8");
  const parsed = safeJsonParse(raw);
  return isRecord(parsed) ? parsed : {};
}

async function writeConfig(next: Record<string, unknown>, note: string) {
  const p = await configPath();
  const tmp = `${p}.tmp`;
  const bak = `${p}.bak.${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2) + "\n", "utf8");
  await fs.copyFile(p, bak).catch(() => {});
  await fs.rename(tmp, p);

  // Restart gateway so channel bindings take effect.
  // (Some providers require restart; we keep it simple + consistent.)
  await execFileAsync("openclaw", ["gateway", "restart"], { timeout: 120000 });

  return { ok: true, note };
}

export async function GET() {
  try {
    const root = await readConfig();
    const channels = isRecord(root.channels) ? root.channels : {};
    const bindingsRaw = (root as Record<string, unknown>).bindings;
    const bindings = Array.isArray(bindingsRaw) ? bindingsRaw : [];
    return NextResponse.json({ ok: true, channels, bindings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

type UpsertBody = {
  provider: string;
  config: Record<string, unknown>;
};

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as UpsertBody;
    const provider = String(body?.provider ?? "").trim();
    if (!provider) return NextResponse.json({ ok: false, error: "provider is required" }, { status: 400 });

    const cfg = isRecord(body?.config) ? body.config : null;
    if (!cfg) return NextResponse.json({ ok: false, error: "config must be an object" }, { status: 400 });

    // v1 validation (Telegram as reference)
    if (provider === "telegram") {
      const botToken = String(cfg.botToken ?? "").trim();
      if (!botToken) return NextResponse.json({ ok: false, error: "telegram.botToken is required" }, { status: 400 });
    }

    const root = await readConfig();
    const nextChannels = { ...(isRecord(root.channels) ? (root.channels as Record<string, unknown>) : {}), [provider]: cfg };
    const next = { ...root, channels: nextChannels };

    await writeConfig(next, `ClawKitchen Channels upsert: ${provider}`);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

type DeleteBody = { provider: string };

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as DeleteBody;
    const provider = String(body?.provider ?? "").trim();
    if (!provider) return NextResponse.json({ ok: false, error: "provider is required" }, { status: 400 });

    const root = await readConfig();
    const prevChannels = isRecord(root.channels) ? (root.channels as Record<string, unknown>) : {};
    const nextChannels = { ...prevChannels };
    delete nextChannels[provider];
    const next = { ...root, channels: nextChannels };

    await writeConfig(next, `ClawKitchen Channels delete: ${provider}`);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
