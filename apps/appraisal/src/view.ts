// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for Plumbline: where an order sits on the board, and display formats. */

export const STAGES = ["New", "Assigned", "Inspected", "In review", "Delivered"] as const;
export type Stage = (typeof STAGES)[number];

export interface StageInput {
  /** Juniper's order is readable (it was shared with Plumbline when placed). */
  readonly orderReadable: boolean;
  /** A service-order message is in Plumbline's inbox. */
  readonly orderReceived: boolean;
  /** The appraiser has ticked every inspection item in the field app (this device only). */
  readonly inspected: boolean;
  /** The signed report is in Plumbline's store. */
  readonly reported: boolean;
  /** Juniper marked its order delivered after checking the report. */
  readonly delivered: boolean;
}

/**
 * The board column. Assignment is automatic on receipt (panel rotation), so a readable order is
 * already Assigned; a message without a readable order is New.
 */
export function stageOf(input: StageInput): Stage | undefined {
  if (input.reported) return input.delivered ? "Delivered" : "In review";
  if (input.orderReadable) return input.inspected ? "Inspected" : "Assigned";
  if (input.orderReceived) return "New";
  return undefined;
}

/** What may happen next on the field app's Submit button. */
export function canSubmit(input: StageInput & { readonly factsReadable: boolean }): boolean {
  return input.orderReadable && input.factsReadable && !input.reported;
}

export const INSPECTION_ITEMS = [
  "Exterior walk-around and photographs",
  "Interior rooms measured against the floor area on record",
  "Roof, heating and plumbing condition noted",
  "Site, easements and neighbourhood observed",
] as const;

export function usd(amount: number | undefined): string {
  return amount === undefined ? "—" : `$${amount.toLocaleString("en-US")}`;
}

export function shortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

/** The plain-word name of a message-kind IRI (the part after the last hyphen). */
export function messageKindLabel(iri: string): string {
  const name = iri.slice(iri.lastIndexOf("-") + 1);
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}
