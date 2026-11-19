// AUTHORED-BY Claude Opus 5.5
/**
 * What each of the twelve steps of flows.md section 3 does to the pods, as plain functions over
 * a `World`. The pages call them: the wallet as Northwind, the registry as Halyard, the bank and
 * the business-lender as themselves. Where a step has another party's part in line (a bank's
 * request arriving, a back office reading on a change), the page's world reaches that party with
 * `world.fetchAs(owner)`, which the Lens shows as that party's agent. The headless test runs the
 * same functions in order against the real wasm. Copy lives in `tour.ts`.
 */

import type { World } from "../mortgage/world.js";
import {
  type DealDesk,
  type DueDiligence,
  dealDesk,
  type Reread,
  readDealSheet,
  recordDealSource,
  rereadOwnership,
  runDueDiligence,
} from "./banks.js";
import { DAY, OWNERS_AFTER, PATHS } from "./facts.js";
import {
  approveKybRequest,
  KYB_GRANTS,
  type KybGrantCode,
  kybGrantRecords,
  pendingRequest,
  requestKybAccess,
  withdrawKybGrant,
} from "./grants.js";
import {
  challengeIsLive,
  findChallenge,
  openChallenge,
  proveToLender,
  verifyAtLender,
} from "./proof.js";
import {
  holderUrl,
  type Issued,
  issueBeneficialOwnership,
  issuedVersions,
  issueOfficerAuthorisation,
  issueOrganisationalIdentity,
  prepareBusinessKyb,
  type RegisterCredential,
  readHeld,
} from "./register.js";

const on = (world: World, day: number): World => ({ ...world, day });

/** Step 1. Northwind's pod in the wallet: the credentials drawer, empty at the start. */
export async function openVault(world: World) {
  await prepareBusinessKyb(on(world, DAY.register));
  const holder = world.fetchAs("northwind");
  const response = await holder(holderUrl(world, PATHS.credentials), {
    headers: { accept: "text/turtle" },
  });
  if (!response.ok) throw new Error(`credentials drawer answered ${response.status}`);
  return readHeld(world);
}

/** What a register step did: the version Northwind now holds, and the issue if it made one. */
export interface RegisterStep<T extends Issued = Issued> {
  readonly version: number;
  /** Absent when the version this step makes was already issued (the page was opened again). */
  readonly issue?: T;
}

/** Issue `name` unless version `version` (or later) is already on record at the register. */
async function once<T extends Issued>(
  world: World,
  name: RegisterCredential,
  version: number,
  run: () => Promise<T>,
): Promise<RegisterStep<T>> {
  await prepareBusinessKyb(world);
  const latest = (await issuedVersions(world, name)).at(-1) ?? 0;
  if (latest >= version) return { version: latest };
  const issue = await run();
  return { issue, version: issue.version };
}

/** Steps 2 to 4. The register signs into Northwind's drawer, once each. */
export const issueIdentity = (world: World) => {
  const day = on(world, DAY.register);
  return once(day, "org-identity", 1, () => issueOrganisationalIdentity(day));
};
export const issueOfficers = (world: World) => {
  const day = on(world, DAY.register);
  return once(day, "officer-authorisation", 1, () => issueOfficerAuthorisation(day));
};
export const issueOwnership = (world: World) => {
  const day = on(world, DAY.register);
  return once(day, "beneficial-ownership", 1, () =>
    issueBeneficialOwnership(day, undefined, "09:30"),
  );
};

/** A bank's request for its grant: the one waiting in the inbox, or a new one it sends now. */
export async function ensureRequest(world: World, code: KybGrantCode): Promise<string> {
  const day = code === "K1" ? DAY.onboarding : DAY.credit;
  await prepareBusinessKyb(on(world, day));
  const waiting = await pendingRequest(world, code);
  if (waiting !== undefined) return waiting;
  return requestKybAccess(on(world, day), code, code === "K1" ? "09:40" : "13:00");
}

/** Step 5. Northwind approves Alder Bank's request (K1). */
export async function approveOnboarding(world: World) {
  const request = await ensureRequest(world, "K1");
  return approveKybRequest(on(world, DAY.onboarding), request, "09:45");
}

/** Step 6. Alder Bank runs due diligence and opens the account. */
export const dueDiligence = (world: World): Promise<DueDiligence> =>
  runDueDiligence(on(world, DAY.onboarding), "10:30");

/** Step 7, before the click: Brackenridge's challenge is waiting in the inbox. */
export async function ensureChallenge(world: World) {
  const credit = on(world, DAY.credit);
  await prepareBusinessKyb(credit);
  if ((await findChallenge(credit)) !== undefined && (await challengeIsLive(credit))) {
    return findChallenge(credit);
  }
  return openChallenge(credit);
}

/**
 * Step 7. Northwind proves in the browser; Brackenridge verifies on arrival and, proceeding, asks
 * for the credentials themselves (K2).
 */
export async function proveOwnership(world: World, onProgress?: (stage: string) => void) {
  const credit = on(world, DAY.credit);
  await ensureChallenge(credit);
  const { presentation, url } = await proveToLender(credit, onProgress);
  const decision = await verifyAtLender(credit, url, "13:40");
  // Proceeding: to lend, the rule needs the values themselves, so Brackenridge asks for K2.
  const request = decision.passed ? await ensureRequest(credit, "K2") : undefined;
  return { decision, presentation, request, url };
}

/** Step 8. Northwind approves Brackenridge's request (K2); its desk builds the deal sheet. */
export async function approveCredit(world: World) {
  const request = await ensureRequest(world, "K2");
  const credit = on(world, DAY.credit);
  const approval = await approveKybRequest(credit, request, "14:00");
  const sheet = await readDealSheet(credit, "14:10");
  await recordDealSource(credit, sheet.ownershipCheck.check, "14:15");
  return { approval, sheet };
}

/** Step 9. Marcus Webb sells his 18% to Jordan Blake; the register re-issues (version 2). */
export const recordSale = (world: World) => {
  const day = on(world, DAY.sale);
  return once(day, "beneficial-ownership", 2, () =>
    issueBeneficialOwnership(day, OWNERS_AFTER, "10:00"),
  );
};

/** Step 10. Brackenridge's deal page: its desk, and Alder's monitoring, read the re-issue. */
export const dealPage = (world: World): Promise<DealDesk> => dealDesk(on(world, DAY.sale), "10:20");

/** Step 11. Northwind closes its Alder account and withdraws K1; Alder's next read is refused. */
export async function closeAccount(world: World): Promise<{ acls: string[]; reread: Reread }> {
  const sale = on(world, DAY.sale);
  const acls = await withdrawKybGrant(sale, "K1", "16:00");
  const reread = await rereadOwnership(sale, "bank", "16:05");
  return { acls, reread };
}

/** The grants as the wallet's sharing screen lists them. */
export async function grantRows(world: World) {
  const records = await kybGrantRecords(world);
  return (Object.keys(KYB_GRANTS) as KybGrantCode[]).map((code) => ({
    code,
    record: records.find((record) => record.code === code),
    spec: KYB_GRANTS[code],
  }));
}

export { readHeld };
