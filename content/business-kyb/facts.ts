// AUTHORED-BY Claude Opus 5.5
/**
 * The facts of the business KYB demo (flows.md section 3). Everyone here is fictional:
 * Northwind Logistics LLC, its four owners, Halyard LEI Services, Alder Bank and Brackenridge
 * Bank. The LEI is illustrative: prefix 9999, valid check digits, flagged in the credential.
 */

import { buildIllustrativeLei, type LegalForm } from "@mortgage/data-model";
import { DAY as MORTGAGE_DAY } from "../mortgage/facts.js";

/** The tour's demo id (`?tour=business-kyb`, `PodEvent.tour.demo`). */
export const DEMO = "business-kyb";

/** The holder: Northwind's pod, operated in the wallet by Jordan Blake. */
export const HOLDER = "northwind" as const;

/** Simulated days, after the mortgage story on the same calendar. */
export const DAY = Object.freeze({
  register: MORTGAGE_DAY.revoke + 8,
  onboarding: MORTGAGE_DAY.revoke + 9,
  credit: MORTGAGE_DAY.revoke + 12,
  sale: MORTGAGE_DAY.revoke + 30,
});

export const ENTITY = Object.freeze({
  address: Object.freeze({
    addressLocality: "Kansas City",
    addressRegion: "MO",
    postalCode: "64105",
    streetAddress: "1180 Freight Yard Road",
  }),
  legalForm: "LLC" as LegalForm,
  legalName: "Northwind Logistics LLC",
  lei: buildIllustrativeLei("NWLOGISTICS001"),
});

export const OFFICERS = Object.freeze([
  Object.freeze({ jobTitle: "Managing member", name: "Jordan Blake" }),
]);

/** The control person of 31 CFR 1010.230(d)(2): the managing member. */
export const CONTROL_PERSON = "Jordan Blake";

export interface Owner {
  readonly name: string;
  readonly bps: number;
}

/** The owners at onboarding, largest share first (the committed order). */
export const OWNERS_BEFORE: readonly Owner[] = Object.freeze([
  { bps: 4200, name: "Jordan Blake" },
  { bps: 2800, name: "Priya Nandakumar" },
  { bps: 1800, name: "Marcus Webb" },
  { bps: 1200, name: "Dana Reyes" },
]);

/** Step 9: Marcus Webb sells his 18 percent to Jordan Blake. */
export const OWNERS_AFTER: readonly Owner[] = Object.freeze([
  { bps: 6000, name: "Jordan Blake" },
  { bps: 2800, name: "Priya Nandakumar" },
  { bps: 1200, name: "Dana Reyes" },
]);

/** The CDD Rule's ownership threshold, 25 percent. */
export const THRESHOLD_BPS = 2500;

/** Where Northwind keeps its register credentials. */
export const PATHS = Object.freeze({
  anchors: "credentials/anchors/",
  arrayAnchor: "credentials/anchors/owner-array",
  credentials: "credentials/",
  identity: "credentials/org-identity",
  inbox: "inbox/",
  officers: "credentials/officer-authorisation",
  ownership: "credentials/beneficial-ownership",
});

/** The Tier A anchor of the owner at `rank` (1 = largest share). */
export const shareAnchorPath = (rank: number) => `credentials/anchors/owner-${rank}`;

/** How long the register's credentials are valid. */
export const CREDENTIAL_VALID_DAYS = 365;

export const percent = (bps: number) => `${(bps / 100).toLocaleString("en-US")}%`;
