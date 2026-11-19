// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for Sextant: the file checklist, what may happen next, display formats. */

export interface FileFlags {
  readonly ordered: boolean;
  readonly committed: boolean;
  readonly closed: boolean;
  readonly recorded: boolean;
}

export interface ChecklistItem {
  readonly label: string;
  readonly done: boolean;
}

/** The escrow officer's checklist, in the order the work happens. */
export function checklist(flags: FileFlags): ChecklistItem[] {
  return [
    { done: flags.ordered, label: "Order received from the lender" },
    { done: flags.committed, label: "Title searched, commitment issued" },
    { done: flags.closed, label: "Closing held, documents signed" },
    { done: flags.closed, label: "Funds disbursed from escrow" },
    { done: flags.recorded, label: "Deed and mortgage recorded" },
  ];
}

/** Issue is offered once the order is in and no commitment has gone out. */
export function canCommit(flags: FileFlags): boolean {
  return flags.ordered && !flags.committed;
}

/** Sign is offered once the commitment is out and the signing has not happened. */
export function canSign(flags: FileFlags): boolean {
  return flags.committed && !flags.closed;
}

export function usd(amount: number): string {
  const sign = amount < 0 ? "minus " : "";
  return `${sign}$${Math.abs(amount).toLocaleString("en-US")}`;
}

export function longDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}
