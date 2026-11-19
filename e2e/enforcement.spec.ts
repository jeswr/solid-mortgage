// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 3 (build-plan.md §4): access control is real. For each organisation, a read
 * of a resource outside its grant (design.md §b.4) is answered 403 by the pod server; an
 * anonymous read of any private resource is refused. Every refusal is paired with a control
 * read by the pod's owner that succeeds, so a 403 can never stand in for a missing resource.
 *
 * Checked twice, each from fresh demo data: at the seed, and with the grants in force (the
 * guided path walked up to, not including, the revoke at step 22).
 */
import { expect, type Page, test } from "@playwright/test";
import { appActingAs, podOwners } from "./support/journey.ts";
import { podRequest, waitForSeed } from "./support/pod.ts";
import {
  type AppSlug,
  actsAs,
  ORG_SLUGS,
  type OrgSlug,
  openApp,
  type PodOwner,
} from "./support/site.ts";
import { loadMortgageTour } from "./support/tour-content.ts";
import { walkTour } from "./support/walk.ts";

/**
 * Resources on Alex's pod outside each organisation's grant (design.md §b.4), most telling
 * first. The first one that exists is used.
 */
const OUTSIDE_GRANT: Readonly<Record<Exclude<OrgSlug, "wallet">, string[]>> = {
  payroll: ["/credentials/", "/inbox/"], // G1 is Append: it can deliver, never read
  bank: ["/credentials/", "/inbox/"], // G2 Append
  bureau: ["/credentials/", "/inbox/"], // G3 Append
  lender: ["/banking/", "/mortgage/closing/", "/inbox/"], // G4 never covers banking
  "lender-desk": ["/banking/", "/mortgage/closing/", "/inbox/"], // same organisation as lender
  "lender-b": ["/credentials/", "/inbox/"], // a proof, no grant
  aus: ["/banking/", "/property/", "/inbox/"], // onward: three credentials only
  appraisal: ["/credentials/", "/inbox/"], // G5: two property resources
  title: ["/credentials/", "/inbox/"], // G6: profile card, purchase agreement
  insurer: ["/credentials/", "/inbox/"], // G7: property facts
  county: ["/property/", "/credentials/", "/inbox/"], // the public register, no grant
  servicer: ["/credentials/", "/inbox/"], // G8: contact, insurance, payment mandate
};

/**
 * Private resources on Alex's pod (design.md §b.4) for the anonymous checks. Her profile card is
 * one: organisations read it under G4 and G6 only (content/mortgage/seed.ts).
 */
const ALEX_PRIVATE = [
  "/profile/card",
  "/profile/contact",
  "/identity/",
  "/credentials/",
  "/property/",
  "/mortgage/juniper/",
  "/mortgage/closing/",
  "/mortgage/servicing/",
  "/insurance/",
  "/banking/",
  "/inbox/",
  "/policies/",
  "/consents/",
  "/.acl",
];

/** Must exist from the seed (design.md §b.4: seeded identity, credentials, property, inbox). */
const SEEDED = ["/identity/", "/credentials/", "/property/", "/inbox/"];

const refused = (status: number) => status === 401 || status === 403;

async function checkEnforcement(page: Page): Promise<void> {
  const problems: string[] = [];
  const ownerStatus = new Map<string, number>();
  const ownerRead = async (owner: PodOwner, path: string) => {
    const key = `${owner} ${path}`;
    if (!ownerStatus.has(key)) {
      ownerStatus.set(key, (await podRequest(page, appActingAs(owner), owner, path)).status);
    }
    return ownerStatus.get(key) as number;
  };

  for (const path of SEEDED) {
    const status = await ownerRead("alex", path);
    if (status !== 200) problems.push(`Alex (wallet) cannot read her own ${path}: ${status}`);
  }

  // Each organisation, outside its grant on Alex's pod.
  for (const [org, candidates] of Object.entries(OUTSIDE_GRANT) as Array<[AppSlug, string[]]>) {
    let path: string | undefined;
    for (const candidate of candidates) {
      if ((await ownerRead("alex", candidate)) === 200) {
        path = candidate;
        break;
      }
    }
    if (path === undefined) {
      problems.push(
        `${org}: none of ${candidates.join(", ")} exists on Alex's pod to test against`,
      );
      continue;
    }
    const { status } = await podRequest(page, org, "alex", path);
    if (status !== 403)
      problems.push(`${org} read alex:${path} outside its grant: ${status}, expected 403`);
  }

  // Each organisation, on another organisation's private ACL document.
  const owners = podOwners().filter((owner) => owner !== "alex");
  for (const [i, org] of ORG_SLUGS.filter((slug) => slug !== "wallet").entries()) {
    const self = actsAs(org);
    const rotated = [...owners.slice((i + 1) % owners.length), ...owners];
    const victim = rotated.find((owner) => owner !== self);
    if (victim === undefined) continue;
    const path = "/profile/card.acl";
    const control = await ownerRead(victim, path);
    if (control !== 200) {
      problems.push(`${victim} cannot read its own ${path}: ${control}`);
      continue;
    }
    const { status } = await podRequest(page, org, victim, path);
    if (status !== 403) problems.push(`${org} read ${victim}:${path}: ${status}, expected 403`);
  }

  // Anonymous: every private resource that exists is refused; an organisation's WebID is not.
  for (const path of ALEX_PRIVATE) {
    if ((await ownerRead("alex", path)) !== 200) continue;
    const { status } = await podRequest(page, null, "alex", path);
    if (!refused(status))
      problems.push(`anonymous read of alex:${path}: ${status}, expected 401 or 403`);
  }
  for (const owner of podOwners()) {
    for (const path of ["/.acl", "/profile/card.acl", "/"]) {
      if ((await ownerRead(owner, path)) !== 200) continue;
      const { status } = await podRequest(page, null, owner, path);
      if (!refused(status))
        problems.push(`anonymous read of ${owner}:${path}: ${status}, expected 401 or 403`);
    }
    if (owner === "alex") continue; // checked with ALEX_PRIVATE above
    const card = await podRequest(page, null, owner, "/profile/card");
    if (card.status !== 200)
      problems.push(`anonymous read of the public WebID ${owner}:/profile/card: ${card.status}`);
  }

  expect(problems, "enforcement failures").toEqual([]);
}

test("3 Enforcement at the seed: reads outside a grant are 403, anonymous reads refused", async ({
  page,
}) => {
  await openApp(page, "wallet");
  await waitForSeed(page);
  await checkEnforcement(page);
});

test("3 Enforcement with grants in force (steps 1 to 21 walked)", async ({ page }) => {
  test.setTimeout(30 * 60_000);
  const tour = await loadMortgageTour();
  const result = await walkTour(page, tour, { to: 21 });
  expect(result.error, "walking the guided path to step 21").toBeUndefined();
  await checkEnforcement(page);
});
