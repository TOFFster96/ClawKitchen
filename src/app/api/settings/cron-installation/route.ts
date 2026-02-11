import { NextResponse } from "next/server";
import { runOpenClaw } from "@/lib/openclaw";

const CFG_PATH = "plugins.entries.recipes.config.cronInstallation";

export async function GET() {
  const { stdout, stderr } = await runOpenClaw(["config", "get", CFG_PATH]);
  const value = stdout.trim();
  return NextResponse.json({ ok: true, path: CFG_PATH, value, stderr });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as { value?: string };
  const value = String(body.value ?? "").trim();
  if (!value || !["off", "prompt", "on"].includes(value)) {
    return NextResponse.json({ ok: false, error: "value must be one of: off|prompt|on" }, { status: 400 });
  }

  const { stdout, stderr } = await runOpenClaw(["config", "set", CFG_PATH, value]);
  return NextResponse.json({ ok: true, path: CFG_PATH, value, stdout, stderr });
}
