import type { BuyerState, EventRow } from "./event";

export type BuyerAction = { label: string; href?: string; join?: boolean; disabled?: boolean };

export function getBuyerAction(event: EventRow, buyer: BuyerState): BuyerAction {
  if (buyer.state === "CONFIRMED") return { label: "View my tickets", href: "/queue" };
  if (buyer.state === "RESERVED") return { label: "Continue checkout", href: "/queue" };
  if (buyer.state === "REVIEW_REQUIRED") return { label: "Awaiting organizer review", disabled: true };
  if (buyer.state === "BLOCKED") return { label: "Contact organizer", disabled: true };
  if (buyer.state === "SOLD_OUT" || event.status === "SOLD_OUT") return { label: "Sold out", disabled: true };
  if (buyer.state === "NOT_SIGNED_IN") return { label: "Create account or sign in", href: "#demo-account" };
  if (["QUEUED", "ADMITTED"].includes(buyer.state)) return { label: "View your place", href: "/queue" };
  if (["ENTRY_OPEN", "SELLING"].includes(event.status) && Date.now() >= new Date(event.entry_opens_at).getTime() && Date.now() < new Date(event.entry_closes_at).getTime()) {
    return { label: "Join the first-come line", join: true };
  }
  return { label: "Entry is closed", disabled: true };
}
