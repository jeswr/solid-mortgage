/**
 * SECURITY regression (roborev sm-28 round-3): a party that pre-provisions the
 * `/mortgage/receipts/` store (before the wallet ever creates it) must NOT be
 * able to launder forged records into the authoritative store — not on the
 * first transition, and CRUCIALLY not on a retry. An earlier version wrote the
 * integrity lock before failing closed, so one retry trusted the wallet's own
 * lock over the attacker's pre-planted contents. The fix: never write a lock
 * over a container the wallet did not just create; verify-only + fail closed,
 * writing nothing, so the tampered state stays fail-closed on every retry.
 */

import { fetchRdf } from "@jeswr/fetch-rdf";
import {
  containerGrantAcl,
  type SolidTestAccount,
  type SolidTestServer,
  seedPod,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import type { Quad } from "@rdfjs/types";
import { AclResource } from "@solid/object";
import { DataFactory, Store } from "n3";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  changeContainerAccess,
  mortgageContainerIri,
  receiptsContainerIri,
} from "../lib/grants/engine";

const COMPETITOR = "https://lender53.example/orgs/prequal#id";
const MODES = { write: true, control: false };

let pods: SolidTestServer;
let owner: SolidTestAccount;
let attacker: SolidTestAccount; // holds inherited Write on /mortgage/ (no Control)
let podBase = "";
let ownerWebId = "";

beforeAll(async () => {
  pods = await startSolidServer({ oidc: true });
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("harness provisioned no owner");
  owner = primary;
  attacker = await pods.provisionAccount();
  podBase = `${pods.baseUrl}/`;
  ownerWebId = owner.webid;

  await seedPod(
    pods.baseUrl,
    [
      {
        path: "/mortgage/profile",
        body: `<${ownerWebId}> <http://xmlns.com/foaf/0.1/name> "Alex Rivera" .\n`,
      },
    ],
    { fetch: owner.authFetch, ownerWebid: ownerWebId },
  );
  // The attacker holds Write (NOT Control) on the whole container BEFORE the
  // wallet ever provisions the receipts store — the pre-hardening / non-wallet
  // grant path this defends against.
  const acl = await owner.authFetch(`${podBase}mortgage/.acl`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: containerGrantAcl({
      containerPath: "/mortgage/",
      ownerWebid: ownerWebId,
      agents: [{ webid: attacker.webid }],
    }),
  });
  if (!acl.ok) throw new Error(`seed grant failed (${acl.status})`);
}, 60_000);

afterAll(async () => {
  await pods?.stop();
});

describe("pre-provisioned receipt store stays fail-closed across retries", () => {
  test("an attacker-created store without a lock cannot be laundered by a retry", async () => {
    // The attacker pre-creates /mortgage/receipts/ (inherited Write) and plants
    // a SHACL-valid, deterministically-named forged withdrawal. It CANNOT
    // create the store's .acl (that needs Control).
    const container = receiptsContainerIri(podBase);
    const madeContainer = await attacker.authFetch(container, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: "",
    });
    expect(madeContainer.ok).toBe(true);
    const forgedIri = `${container}vault-0-revoke-${encodeURIComponent(COMPETITOR)}`;
    const planted = await attacker.authFetch(forgedIri, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: `@prefix dpv: <https://w3id.org/dpv#> .
<${forgedIri}> a dpv:ConsentReceipt ;
  dpv:hasDataSubject <${ownerWebId}> ;
  dpv:hasDataController <${COMPETITOR}> ;
  dpv:hasConsentStatus dpv:ConsentWithdrawn ;
  <http://purl.org/dc/terms/references> <${mortgageContainerIri(podBase)}> ;
  <http://purl.org/dc/terms/issued> "2026-07-16T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`,
    });
    expect(planted.ok).toBe(true);

    // The wallet's grant runs as the pod owner. FIRST attempt fails closed
    // (store exists without a wallet lock) and writes NOTHING.
    await expect(
      changeContainerAccess(podBase, ownerWebId, COMPETITOR, "grant", MODES, {
        podFetch: owner.authFetch,
      }),
    ).rejects.toThrow(/without its integrity lock|untrusted/);

    // RETRY: still fail-closed — the earlier bug locked the store on attempt 1
    // and let attempt 2 trust the forged contents. It must not.
    await expect(
      changeContainerAccess(podBase, ownerWebId, COMPETITOR, "grant", MODES, {
        podFetch: owner.authFetch,
      }),
    ).rejects.toThrow(/without its integrity lock|untrusted/);

    // The competitor never received a live WAC rule — the grant never
    // completed (it failed closed before touching the container ACL).
    const containerAclIri = `${mortgageContainerIri(podBase)}.acl`;
    const { dataset } = await fetchRdf(containerAclIri, { fetch: owner.authFetch });
    const acl = new AclResource(new Store([...dataset] as Quad[]), DataFactory);
    const grantedAgents = new Set<string>();
    for (const rule of acl.authorizations) {
      for (const agent of rule.agent) grantedAgents.add(agent);
    }
    expect(grantedAgents.has(COMPETITOR)).toBe(false);
  }, 60_000);
});
