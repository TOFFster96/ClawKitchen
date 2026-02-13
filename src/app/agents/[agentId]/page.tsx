import Link from "next/link";
import AgentEditor from "./agent-editor";

export default async function AgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-[color:var(--ck-text-secondary)] transition-colors hover:text-[color:var(--ck-text-primary)]"
        >
          ← Home
        </Link>
        <div className="text-xs text-[color:var(--ck-text-tertiary)]">Agent: {agentId}</div>
      </div>

      <AgentEditor agentId={agentId} />
    </main>
  );
}
