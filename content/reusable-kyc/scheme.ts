// AUTHORED-BY Claude Opus 5.5
/**
 * The fictional Keelstone Reliance Scheme's published list of trusted KYC issuers, as Pennant
 * keeps it: a copy in Pennant's own pod (`card-issuer:/scheme/trusted-issuers`), read by
 * Pennant's verifier and by nobody else. The list stands for the reliance agreement between the
 * institutions (flows.md section 8): Alder Bank's entry names the agreement and when it took
 * effect. It is not a statement that a signature alone is enough.
 */

import { buildTrustedIssuerList, TrustedIssuerList } from "@mortgage/data-model";
import { DataFactory } from "n3";
import {
  podUrl,
  putResource,
  readDataset,
  readText,
  statusOf,
  type World,
  webid,
} from "../mortgage/world.js";
import { ORGS } from "../orgs.js";
import { ATTESTATION_CLASS } from "./attestation.js";
import { SCHEME } from "./facts.js";

const CARD = "card-issuer" as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Where Pennant keeps its copy of the list (pod-relative). */
export const TRUSTED_LIST_PATH = "scheme/trusted-issuers";

export function trustedListUrl(world: Pick<World, "podOrigin">): string {
  return podUrl(world, CARD, TRUSTED_LIST_PATH);
}

/** The list's title, as the verifier screen shows it. */
export const TRUSTED_LIST_NAME = `${SCHEME.name}: trusted KYC issuers`;

/** Write Pennant's copy of the list, unless it is already there. Returns whether it wrote. */
export async function ensureTrustedList(world: World): Promise<boolean> {
  const card = world.fetchAs(CARD);
  const url = trustedListUrl(world);
  if ((await statusOf(card, url)) === 200) return false;
  const published = world.calendar.clock(SCHEME.listPublishedDay, "00:00");
  await putResource(
    card,
    buildTrustedIssuerList({
      about: ATTESTATION_CLASS,
      datePublished: published,
      entries: [
        {
          agreement: SCHEME.agreement,
          issuer: webid(world, "bank"),
          name: ORGS.bank.organisation,
          validFrom: world.calendar.clock(SCHEME.bankListedDay, "00:00"),
        },
      ],
      iri: url,
      name: TRUSTED_LIST_NAME,
      publisherName: SCHEME.name,
      validThrough: new Date(published.getTime() + SCHEME.listValidDays * DAY_MS),
    }),
  );
  return true;
}

/** Pennant's copy of the list, as Turtle (what the verifier is given). */
export function readTrustedListText(world: World): Promise<string> {
  return readText(world.fetchAs(CARD), trustedListUrl(world));
}

/** Pennant's copy of the list, read with the typed wrapper. */
export async function readTrustedList(world: World): Promise<TrustedIssuerList> {
  const url = trustedListUrl(world);
  return new TrustedIssuerList(url, await readDataset(world.fetchAs(CARD), url), DataFactory);
}
