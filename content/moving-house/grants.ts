// AUTHORED-BY Claude Opus 5.5
/**
 * The six standing grants of flows.md section 2 (H1 to H6). Each lets one organisation read
 * `profile/address` for one purpose, "keep my address current", until Alex withdraws it. The
 * state's grant (H1) also covers the evidence (the recording receipt from closing) and lets it
 * replace the licence credential it issues.
 *
 * A grant is written exactly as the mortgage writes one (`../mortgage/grants.ts`): an ODRL
 * agreement in `policies/`, a DPV consent record in `consents/`, and the ACL documents recomputed
 * from every agreement on record. The wallet then tells each organisation, by appending a copy of
 * its agreement to the organisation's inbox; the organisation's back office subscribes to the
 * address from there.
 */

import {
  AccessAgreement,
  type AccessModeName,
  buildAccessAgreement,
  DPV,
  permissionInits,
} from "@mortgage/data-model";
import type { OrgSlug, PodOwner } from "@mortgage/demo-kit/registry";
import { DataFactory } from "n3";
import {
  endGrant,
  type GrantRecord,
  grantRecords,
  syncAcls,
  writeConsent,
} from "../mortgage/grants.js";
import { at, podUrl, postResource, putResource, readDataset, type World, webid } from "../mortgage/world.js";
import { ORGS } from "../orgs.js";

export const HOLDER_CODES = ["H1", "H2", "H3", "H4", "H5", "H6"] as const;
export type HolderCode = (typeof HOLDER_CODES)[number];

/** The organisations that keep Alex's address, in the order of flows.md section 2. */
export const HOLDERS = ["state", "county", "bank", "insurer", "payroll", "servicer"] as const;
export type Holder = (typeof HOLDERS)[number];

export const ADDRESS_PATH = "profile/address";
export const ADDRESS_PRODUCT_PATH = "profile/address.dprod";
export const RECEIPT_PATH = "mortgage/closing/recording-receipt";
export const LICENCE_PATH = "identity/driver-licence";

/** The purpose of every H grant, in Alex's words. */
export const PURPOSE_TEXT = "Keep my address current";
export const PURPOSE = DPV.ServiceProvision;
export const UNTIL_LABEL = "Until withdrawn";

export interface HolderGrant {
  readonly code: HolderCode;
  readonly to: Holder;
  /** The organisation's own words for why it keeps the address. */
  readonly use: string;
  readonly permissions: readonly { paths: readonly string[]; modes: readonly AccessModeName[] }[];
}

export const HOLDER_GRANTS: Readonly<Record<HolderCode, HolderGrant>> = Object.freeze({
  H1: {
    code: "H1",
    permissions: [
      { modes: ["Read"], paths: [ADDRESS_PATH, RECEIPT_PATH] },
      { modes: ["Write"], paths: [LICENCE_PATH] },
    ],
    to: "state",
    use: "Driver licence and state tax records",
  },
  H2: {
    code: "H2",
    permissions: [{ modes: ["Read"], paths: [ADDRESS_PATH] }],
    to: "county",
    use: "Property tax bills",
  },
  H3: {
    code: "H3",
    permissions: [{ modes: ["Read"], paths: [ADDRESS_PATH] }],
    to: "bank",
    use: "Statements and cards",
  },
  H4: {
    code: "H4",
    permissions: [{ modes: ["Read"], paths: [ADDRESS_PATH] }],
    to: "insurer",
    use: "Car policy garaging address",
  },
  H5: {
    code: "H5",
    permissions: [{ modes: ["Read"], paths: [ADDRESS_PATH] }],
    to: "payroll",
    use: "Tax forms and payslips",
  },
  H6: {
    code: "H6",
    permissions: [{ modes: ["Read"], paths: [ADDRESS_PATH] }],
    to: "servicer",
    use: "Escrow and mortgage statements",
  },
});

export function codeOf(holder: Holder): HolderCode {
  const code = HOLDER_CODES.find((candidate) => HOLDER_GRANTS[candidate].to === holder);
  if (code === undefined) throw new Error(`no grant for ${holder}`);
  return code;
}

export function isHolder(value: string): value is Holder {
  return (HOLDERS as readonly string[]).includes(value);
}

export function isHolderCode(value: string): value is HolderCode {
  return (HOLDER_CODES as readonly string[]).includes(value);
}

const alexUrl = (world: Pick<World, "podOrigin">, path = "") => podUrl(world, "alex", path);

export function holderPolicyUrl(world: Pick<World, "podOrigin">, code: HolderCode): string {
  return alexUrl(world, `policies/${code.toLowerCase()}`);
}

export function addressUrl(world: Pick<World, "podOrigin">): string {
  return alexUrl(world, ADDRESS_PATH);
}

/** The inbox slug of the wallet's notice to a holder. */
export const NOTICE_SLUG_PREFIX = "address-grant-";

/** Is this inbox path one of the wallet's grant notices? */
export function isGrantNotice(path: string): boolean {
  const name = path.split("?")[0]?.split("/").filter(Boolean).at(-1) ?? "";
  return name.startsWith(NOTICE_SLUG_PREFIX);
}

/** The H grants on record, with the state each one's latest consent record gives it. */
export async function holderGrants(world: World): Promise<GrantRecord[]> {
  return (await grantRecords(world)).filter((record) => isHolderCode(record.code));
}

export interface HolderApproval {
  readonly code: HolderCode;
  readonly policy: string;
  /** Where the copy of the agreement landed in the organisation's inbox. */
  readonly notice: string;
}

/**
 * Alex approves "who should know" for `holders`: one agreement and one consent record each, one
 * ACL recomputation for all of them, then one notice per organisation. Grants already active are
 * left as they are.
 */
export async function approveHolders(
  world: World,
  holders: readonly Holder[],
  time = "10:20",
): Promise<{ approvals: HolderApproval[]; acls: string[] }> {
  const alex = world.fetchAs("alex");
  const before = await grantRecords(world);
  const added: { code: HolderCode; policy: string; agreement: AccessAgreement }[] = [];
  for (const holder of holders) {
    const code = codeOf(holder);
    const spec = HOLDER_GRANTS[code];
    const policy = holderPolicyUrl(world, code);
    if (before.some((record) => record.policy === policy && record.state === "active")) continue;
    await putResource(
      alex,
      buildAccessAgreement({
        assignee: webid(world, holder),
        assigner: webid(world, "alex"),
        description: `${PURPOSE_TEXT}: ${spec.use.toLowerCase()}`,
        grantCode: code,
        iri: policy,
        issued: at(world, time),
        name: `${ORGS[holder].organisation} keeps my address current`,
        permissions: spec.permissions.map((permission) => ({
          assignee: webid(world, holder),
          modes: permission.modes,
          purpose: PURPOSE,
          targets: permission.paths.map((path) => alexUrl(world, path)),
        })),
      }),
    );
    const agreement = new AccessAgreement(policy, await readDataset(alex, policy), DataFactory);
    await writeConsent(world, { agreement, code, policy }, DPV.ConsentGiven, "given", time);
    added.push({ agreement, code, policy });
  }
  const acls = await syncAcls(world, before, await grantRecords(world));
  const approvals: HolderApproval[] = [];
  for (const { agreement, code, policy } of added) {
    const holder = HOLDER_GRANTS[code].to;
    const notice = await postResource(
      alex,
      podUrl(world, holder, "inbox/"),
      `${NOTICE_SLUG_PREFIX}${code.toLowerCase()}`,
      (iri) =>
        buildAccessAgreement({
          assignee: agreement.assigneeIri,
          assigner: agreement.assignerIri,
          description: agreement.description,
          grantCode: code,
          iri,
          issued: agreement.issued,
          name: agreement.name,
          permissions: permissionInits(agreement),
          source: policy,
        }),
    );
    approvals.push({ code, notice, policy });
  }
  return { acls, approvals };
}

/** Alex withdraws one organisation's grant: a "withdrawn" consent record and the ACL change. */
export function withdrawHolder(world: World, holder: Holder, time = "16:40"): Promise<string[]> {
  return endGrant(world, codeOf(holder), DPV.ConsentWithdrawn, "withdrawn", time);
}

/** The organisation reads the copy of its agreement from its own inbox. */
export async function readNotice(
  world: World,
  holder: Holder,
  url: string,
): Promise<AccessAgreement> {
  return new AccessAgreement(url, await readDataset(world.fetchAs(holder), url), DataFactory);
}

/** The org slug a holder acts as (the six holders act as themselves). */
export function holderOrg(holder: Holder): OrgSlug {
  return holder;
}

export type { PodOwner };
