import { type DemoParty, demoParties } from "@/lib/grants/client";
import { GRANT_PARTIES, type GrantPartyId } from "@/lib/server/config";

/** "Primary mortgage lender — modelled on …" → "Primary mortgage lender". */
export function shortPartyLabel(label: string): string {
  return label.split(" — ")[0] ?? label;
}

/** ["read", "write"] → "Read and write"; [] → "No access". */
export function describeModes(modes: readonly string[]): string {
  if (modes.length === 0) return "No access";
  const words = modes.map((mode) => mode.toLowerCase());
  const last = words[words.length - 1] ?? "";
  const phrase = words.length === 1 ? last : `${words.slice(0, -1).join(", ")} and ${last}`;
  return `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)}`;
}

/** The demo party a WebID names, if it is one of the Data Vault's grantable parties. */
export function partyForWebId(webId: string): DemoParty | undefined {
  return demoParties().find((party) => party.webid === webId);
}

/** The modes Data Vault grants a party on the loan file, as a lowercase phrase. */
export function grantedAccessPhrase(id: GrantPartyId): string {
  const definition = GRANT_PARTIES[id];
  const modes = ["read"];
  if (definition.write) modes.push("write");
  if (definition.control) modes.push("control");
  return describeModes(modes).toLowerCase();
}
