import { runOpenClaw } from "@/lib/openclaw";
import HomeClient from "./HomeClient";

type AgentListItem = {
  id: string;
  identityName?: string;
  workspace?: string;
  model?: string;
  isDefault?: boolean;
};

async function getAgents(): Promise<AgentListItem[]> {
  const { stdout } = await runOpenClaw(["agents", "list", "--json"]);
  return JSON.parse(stdout) as AgentListItem[];
}

export default async function Home() {
  const agents = await getAgents();
  return <HomeClient agents={agents} />;
}
