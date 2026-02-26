import { listTickets } from "@/lib/tickets";
import { TicketsBoardClient } from "@/app/tickets/TicketsBoardClient";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const tickets = await listTickets();
  return <TicketsBoardClient tickets={tickets} />;
}
