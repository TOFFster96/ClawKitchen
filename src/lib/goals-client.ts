/** Client-safe goal types and utils (no node deps). */

export type GoalStatus = "planned" | "active" | "done";

export type GoalFrontmatter = {
  id: string;
  title: string;
  status: GoalStatus;
  tags: string[];
  teams: string[];
  updatedAt: string;
};

/** Parses comma-separated string into trimmed non-empty array. */
export function parseCommaList(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
