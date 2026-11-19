// AUTHORED-BY Claude Opus 5.5
/** Pure view logic for the Recorder's office: the public search filter and display formats. */

export interface Searchable {
  readonly reference: string;
  readonly name: string;
  readonly grantors: readonly string[];
  readonly grantees: readonly string[];
  readonly parcel: string;
}

export type SearchField = "any" | "name" | "parcel" | "instrument";

/** Case-insensitive match of `query` against the chosen field; an empty query matches all. */
export function matches(record: Searchable, query: string, field: SearchField = "any"): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const names = [...record.grantors, ...record.grantees];
  const haystack: Record<SearchField, string[]> = {
    any: [record.reference, record.name, record.parcel, ...names],
    instrument: [record.reference],
    name: names,
    parcel: [record.parcel],
  };
  return haystack[field].some((value) => value.toLowerCase().includes(needle));
}

export function recordedOn(date: Date): string {
  return date.toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  });
}
