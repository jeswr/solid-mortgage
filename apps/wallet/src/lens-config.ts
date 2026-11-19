// AUTHORED-BY Claude Opus 5.5
/**
 * What the Solid Lens needs to label the mortgage journey on the wallet's pages: Alex's drawers
 * in plain words, the grant handles (G1 to G8) from the grant specification, and where its
 * Grants tab and journey ledger link to.
 */
import { GRANT_CODES, GRANTS } from "@mortgage/content/mortgage/grants";
import { ALEX_DRAWERS } from "@mortgage/content/mortgage/seed";
import { appUrl } from "@mortgage/demo-kit/urls";
import type { MountOptions } from "@mortgage/tour/mount";
import { labelOfPath } from "./explain.ts";

type LensOptions = NonNullable<MountOptions["lens"]>;

export const LENS: LensOptions = {
  drawers: ALEX_DRAWERS.filter((path) => path.split("/").length === 2).map((path) => ({
    label: labelOfPath(path),
    path: `/${path}`,
  })),
  grants: Object.fromEntries(
    GRANT_CODES.map((code) => [
      `/policies/${code.toLowerCase()}`,
      { label: code, purpose: GRANTS[code].name, until: GRANTS[code].endLabel },
    ]),
  ),
  grantsHref: appUrl("wallet", "sharing"),
  ledgerHref: appUrl("welcome", "journey"),
  recordDrawers: ["/inbox/", "/policies/", "/consents/"],
  revokeCaveat:
    "{org} still holds the records it is required to keep. What has ended is its access to {holder}'s data at source.",
};
