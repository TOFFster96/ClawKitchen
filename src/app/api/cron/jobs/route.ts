import { NextResponse } from "next/server";
import { toolsInvoke } from "@/lib/gateway";

type CronToolResult = {
  content: Array<{ type: string; text?: string }>;
};

export async function GET() {
  try {
    const result = await toolsInvoke<CronToolResult>({
      tool: "cron",
      args: { action: "list", includeDisabled: true },
    });

    const text = result?.content?.find((c) => c.type === "text")?.text;
    if (!text) {
      return NextResponse.json({ ok: true, jobs: [] });
    }

    const parsed = JSON.parse(text) as { jobs?: unknown[] };
    return NextResponse.json({ ok: true, jobs: parsed.jobs ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
