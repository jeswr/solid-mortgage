/**
 * The Mode-1 (in-browser pod) grant rail: the SAME engine as the server rail,
 * run client-side against the visitor's own simulated pod — real WAC ACL
 * documents and real DPV receipts written into the in-browser pod, inside the
 * disclosed simulation (decision 0015 mode table: Mode 1 has no cross-
 * principal boundary to enforce, and the UI must keep saying so).
 *
 * Party identities here are the sm-20 persona convention's `.example` org
 * IRIs (RFC 2606-reserved; the lender id matches the persona fixtures' own
 * underwriting org) — in Mode 2 the SERVER rail resolves parties to the
 * operator-configured real service WebIDs instead.
 */
import type { GrantPartyId } from "../server/config";
import { GRANT_PARTIES, GRANT_PARTY_IDS } from "../server/config";
import {
  type ConsentReceiptView,
  changeContainerAccess,
  type GrantStanding,
  readConsentLedger,
  readGrantStandings,
} from "./engine";

/** Demo party WebIDs for the Mode-1 simulation (persona `.example` style). */
export const DEMO_PARTY_WEBIDS: Readonly<Record<GrantPartyId, string>> = {
  "lender-boa": "https://lender.example/orgs/underwriting#id",
  "lender-53": "https://lender53.example/orgs/prequal#id",
  gse: "https://gse.example/orgs/automated-underwriting#id",
  closing: "https://closing.example/orgs/eclose#id",
  servicer: "https://servicer.example/orgs/servicing#id",
};

export interface DemoParty {
  readonly id: GrantPartyId;
  readonly label: string;
  readonly webid: string;
}

export function demoParties(): DemoParty[] {
  return GRANT_PARTY_IDS.map((id) => ({
    id,
    label: GRANT_PARTIES[id].label,
    webid: DEMO_PARTY_WEBIDS[id],
  }));
}

export interface ClientGrantOptions {
  /** The in-browser pod session fetch (`session.authFetch`). */
  readonly podFetch: typeof fetch;
  readonly podBase: string;
  readonly webId: string;
}

export function changeDemoGrant(
  party: GrantPartyId,
  action: "grant" | "revoke",
  options: ClientGrantOptions,
): Promise<ConsentReceiptView> {
  const definition = GRANT_PARTIES[party];
  return changeContainerAccess(
    options.podBase,
    options.webId,
    DEMO_PARTY_WEBIDS[party],
    action,
    { write: definition.write, control: definition.control },
    { podFetch: options.podFetch },
  );
}

export function readDemoStandings(options: ClientGrantOptions): Promise<readonly GrantStanding[]> {
  return readGrantStandings(options.podBase, options.webId, { podFetch: options.podFetch });
}

export function readDemoLedger(
  options: ClientGrantOptions,
): Promise<readonly ConsentReceiptView[]> {
  return readConsentLedger(options.podBase, options.webId, { podFetch: options.podFetch });
}
