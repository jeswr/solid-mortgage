/**
 * SECURITY regression (roborev sm-28 round-4/5): the fresh-create WINDOW.
 *
 *   1. Between the wallet's container PUT and its lock PUT, the new
 *      `/mortgage/receipts/` inherits the parent ACL — a racing write could
 *      plant a forged receipt. Once the lock lands the wallet is the only
 *      writer, so `ensureReceiptsStore` DELETES any planted `vault-*` member
 *      (forged by construction) and proceeds with a clean store — it never
 *      seals the plant under its own lock (which a retry would launder into
 *      trusted policy). The forged withdrawal therefore never enters policy:
 *      the grant completes AND the planted-against party stays grantable, even
 *      across a retry.
 *   2. `verifyReceiptsLock` requires a POSITIVE `acl:default` write rule for the
 *      owner (+ service) — a lock with only `accessTo` rules (members keep
 *      inheriting parent Write) is refused.
 *
 * Each test runs on its OWN pod so the single-per-pod receipts store is fresh.
 */
import {
  type SolidTestAccount,
  type SolidTestServer,
  seedPod,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { describe, expect, test } from "vitest";
import {
  changeContainerAccess,
  mortgageContainerIri,
  readGrantStandings,
  receiptsContainerIri,
} from "../lib/grants/engine";

const AGENT = "https://lender.example/orgs/underwriting#id";
const MODES = { write: true, control: false };

async function freshPod(): Promise<{
  pods: SolidTestServer;
  owner: SolidTestAccount;
  podBase: string;
}> {
  const pods = await startSolidServer({ oidc: true });
  const owner = pods.accounts[0];
  if (owner === undefined) throw new Error("harness provisioned no owner");
  const podBase = `${pods.baseUrl}/`;
  await seedPod(
    pods.baseUrl,
    [
      {
        path: "/mortgage/profile",
        body: `<${owner.webid}> <http://xmlns.com/foaf/0.1/name> "Alex Rivera" .\n`,
      },
    ],
    { fetch: owner.authFetch, ownerWebid: owner.webid },
  );
  return { pods, owner, podBase };
}

describe("fresh-create window + positive lock verification", () => {
  test("a receipt planted between the container and lock PUTs is cleaned, never laundered", async () => {
    const { pods, owner, podBase } = await freshPod();
    try {
      const container = receiptsContainerIri(podBase);
      // Inject a forged WITHDRAWAL for AGENT right AFTER the wallet creates the
      // container, before its lock lands — simulating a race by an
      // inherited-Write party. If it laundered into policy, AGENT would look
      // permanently revoked (immutable) and the grant would fail.
      let planted = false;
      const injecting: typeof fetch = async (input, init) => {
        const url = String(input instanceof Request ? input.url : input);
        const method = (input instanceof Request ? input.method : init?.method) ?? "GET";
        const response = await owner.authFetch(input, init);
        if (!planted && method === "PUT" && url === container && response.ok) {
          planted = true;
          const forged = `${container}vault-0-revoke-${encodeURIComponent(AGENT)}`;
          await owner.authFetch(forged, {
            method: "PUT",
            headers: { "content-type": "text/turtle" },
            body: `@prefix dpv: <https://w3id.org/dpv#> .
<${forged}> a dpv:ConsentReceipt ;
  dpv:hasDataSubject <${owner.webid}> ;
  dpv:hasDataController <${AGENT}> ;
  dpv:hasConsentStatus dpv:ConsentWithdrawn ;
  <http://purl.org/dc/terms/references> <${mortgageContainerIri(podBase)}> ;
  <http://purl.org/dc/terms/issued> "2026-07-16T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`,
          });
        }
        return response;
      };
      // The grant COMPLETES: the plant is deleted, the store is clean, AGENT is
      // granted — the forged withdrawal never made AGENT look revoked.
      const receipt = await changeContainerAccess(podBase, owner.webid, AGENT, "grant", MODES, {
        podFetch: injecting,
      });
      expect(receipt.action).toBe("grant");
      expect(receipt.recipient).toBe(AGENT);

      // A follow-up transition (the round-5 laundering vector) confirms the
      // forgery never entered policy: AGENT is granted, not revoked; revoking
      // then behaves normally (no false "already revoked").
      const standings = await readGrantStandings(podBase, owner.webid, {
        podFetch: owner.authFetch,
      });
      const standing = standings.find((entry) => entry.agent === AGENT);
      expect(standing?.granted).toBe(true);
      expect(standing?.revoked).toBe(false);
      const revoke = await changeContainerAccess(podBase, owner.webid, AGENT, "revoke", MODES, {
        podFetch: owner.authFetch,
      });
      expect(revoke.action).toBe("revoke");
    } finally {
      await pods.stop();
    }
  }, 60_000);

  test("a pre-existing lock without a member-covering default rule is refused", async () => {
    const { pods, owner, podBase } = await freshPod();
    try {
      const container = receiptsContainerIri(podBase);
      // Pre-create the store + a DEFAULTLESS lock (owner accessTo only — members
      // keep inheriting the parent). The wallet must refuse to trust it.
      const made = await owner.authFetch(container, {
        method: "PUT",
        headers: { "content-type": "text/turtle" },
        body: "",
      });
      expect(made.ok).toBe(true);
      const acl = await owner.authFetch(`${container}.acl`, {
        method: "PUT",
        headers: { "content-type": "text/turtle" },
        body: `@prefix acl: <http://www.w3.org/ns/auth/acl#> .
<#owner> a acl:Authorization ;
  acl:accessTo <${container}> ;
  acl:agent <${owner.webid}> ;
  acl:mode acl:Read, acl:Write, acl:Control .
`,
      });
      expect(acl.ok).toBe(true);
      await expect(
        changeContainerAccess(podBase, owner.webid, AGENT, "grant", MODES, {
          podFetch: owner.authFetch,
        }),
      ).rejects.toThrow(/member-covering write|untrusted/);
    } finally {
      await pods.stop();
    }
  }, 60_000);
});
