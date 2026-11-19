// AUTHORED-BY Claude Opus 5.5
/**
 * Where the small business loan starts: after demo 3. The site has one seed (the mortgage's) and
 * the welcome page's "Try it yourself" resets the pods, so a visitor who starts here finds no
 * Northwind credentials. The first step brings the pods to demo 3's due diligence state, once:
 *
 * - Halyard LEI Services' identity, officer and ownership credentials in Northwind's
 *   `credentials/` drawer, issued on demo 3's register day by demo 3's own functions (with their
 *   issuance records and status lists), so Brackenridge checks exactly what demo 3 issued;
 * - Northwind's inbox (any signed-in agent may add to it) and Brackenridge's;
 * - the Department of Revenue's key and status list (State Online Services' issuer, shared with
 *   the moving-house demo).
 *
 * Demo 3's grants, due diligence record and later steps are not replayed: the loan reuses the
 * credentials, not the earlier banks' access. A visitor who played demo 3 first keeps its state;
 * each part checks the pod first, so running this twice changes nothing.
 */

import { issueIdentity, issueOfficers, issueOwnership } from "../business-kyb/journey.js";
import { prepareBusinessKyb } from "../business-kyb/register.js";
import { statusListUrl } from "../mortgage/issuers.js";
import { podUrl, statusOf, type World } from "../mortgage/world.js";
import { DAY, HOLDER, PATHS } from "./facts.js";
import { ensureInbox } from "./grants.js";
import { ensureStateIssuer } from "./tax.js";

const on = (world: World, day: number): World => ({ ...world, day });

/** Is the story's starting point in the pods? */
export async function isPrepared(world: World): Promise<boolean> {
  const [ownership, state] = await Promise.all([
    statusOf(world.fetchAs(HOLDER), podUrl(world, HOLDER, PATHS.ownership)),
    statusOf(world.fetchAs("state"), statusListUrl(world, "state")),
  ]);
  return ownership === 200 && state === 200;
}

/**
 * Bring the pods to demo 3's end of due diligence. Returns `false` when they were already there.
 * Runs as the visitor's own browser (every owner's fetch), never by an organisation agent.
 */
export async function prepareSmallBusinessLoan(world: World): Promise<boolean> {
  if (await isPrepared(world)) return false;
  const register = on(world, DAY.register);
  await prepareBusinessKyb(register);
  await issueIdentity(register);
  await issueOfficers(register);
  await issueOwnership(register);
  await ensureInbox(world);
  await ensureStateIssuer(on(world, DAY.cashFlow));
  world.note({
    kind: "org-to-org",
    org: "wallet",
    refs: [podUrl(world, HOLDER, PATHS.identity), podUrl(world, HOLDER, PATHS.ownership)],
    text: "Northwind's register credentials from the business onboarding demo are in its pod: identity, officers and ownership. The loan reuses them; nothing is collected again.",
  });
  return true;
}
