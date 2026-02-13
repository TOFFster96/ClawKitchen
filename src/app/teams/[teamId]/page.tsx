import Link from "next/link";
import TeamEditor from "./team-editor";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto mb-4 flex max-w-6xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-[color:var(--ck-text-secondary)] transition-colors hover:text-[color:var(--ck-text-primary)]"
        >
          ← Home
        </Link>
        <div className="text-xs text-[color:var(--ck-text-tertiary)]">Team: {teamId}</div>
      </div>

      <TeamEditor teamId={teamId} />
    </main>
  );
}
