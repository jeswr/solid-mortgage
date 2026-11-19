/**
 * The grant engine's failure-repair state model (the closing-scene pattern,
 * carried over — see lib/grants/engine.ts header), exercised against a REAL
 * fixed-owner sparq pod with fault injection at the fetch seam:
 *
 *   - a receipt-write failure after a grant COMPENSATES (the unrecorded grant
 *     does not survive: the agent is removed from the CURRENT ACL);
 *   - when even the rollback fails, the retry lands in the repair branch and
 *     completes the missing receipt (grant applied + recorded, exactly once);
 *   - a revoke's receipt-write failure keeps access OFF (fail-safe direction)
 *     and the retry repairs the missing receipt instead of erroring.
 *
 * Fixed-owner mode is ALSO the Mode-1 in-browser parity check: this is the
 * same engine the wallet UI runs client-side against the visitor's pod.
 */
import { type SolidTestServer, startSolidServer } from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  changeContainerAccess,
  mortgageContainerIri,
  readConsentLedger,
  readGrantStandings,
} from "../lib/grants/engine";

const AGENT = "https://lender.example/orgs/underwriting#id";
const MODES = { write: true, control: false };

let pods: SolidTestServer;
let podBase = "";
let owner = "";

/** Fail exactly the PUTs whose target matches, then pass everything through. */
function faultingFetch(
  base: typeof fetch,
  shouldFail: (url: string, method: string) => boolean,
): typeof fetch {
  return (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = (input instanceof Request ? input.method : init?.method) ?? "GET";
    if (shouldFail(url, method)) {
      return Promise.reject(new TypeError("injected transport failure"));
    }
    return base(input, init);
  };
}

beforeAll(async () => {
  pods = await startSolidServer({});
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("harness provisioned no owner");
  owner = primary.webid;
  podBase = `${pods.baseUrl}/`;
  // The engine needs the container to exist (its listing is the ledger read);
  // seeding a member gives it the typed LDP root a bare create lacks (the
  // Mode-1 pod always has members — the persona documents).
  const seeded = await primary.authFetch(`${podBase}mortgage/profile`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: `<${owner}> <http://xmlns.com/foaf/0.1/name> "Alex Rivera" .\n`,
  });
  if (!seeded.ok) throw new Error(`container seed failed (${seeded.status})`);
}, 60_000);

afterAll(async () => {
  await pods?.stop();
});

describe("grant/revoke failure repair (fault-injected REAL pod)", () => {
  test("receipt failure compensates; rollback failure repairs on retry; revoke fails safe", async () => {
    const plain = pods.accounts[0]?.authFetch;
    if (plain === undefined) throw new Error("no owner fetch");
    const isReceiptPut = (url: string, method: string) =>
      method === "PUT" && url.includes("/receipts/vault-");
    // The container ACL (the grant's rollback target) — NOT the receipts-store
    // ACL, which is written once during the (earlier) store provisioning.
    const isAclPut = (url: string, method: string) =>
      method === "PUT" && url.endsWith("/mortgage/.acl");

    // 1. Grant whose receipt write fails: COMPENSATED — no grant survives.
    await expect(
      changeContainerAccess(podBase, owner, AGENT, "grant", MODES, {
        podFetch: faultingFetch(plain, isReceiptPut),
      }),
    ).rejects.toThrow();
    let standings = await readGrantStandings(podBase, owner, { podFetch: plain });
    expect(standings.find((entry) => entry.agent === AGENT)?.granted ?? false).toBe(false);
    expect(await readConsentLedger(podBase, owner, { podFetch: plain })).toEqual([]);

    // 2. Grant where receipt AND rollback both fail: the grant is applied but
    //    unrecorded — the RETRY lands in the repair branch and records it.
    let receiptFailed = false;
    await expect(
      changeContainerAccess(podBase, owner, AGENT, "grant", MODES, {
        podFetch: faultingFetch(plain, (url, method) => {
          if (isReceiptPut(url, method)) {
            receiptFailed = true;
            return true;
          }
          // The rollback is the ACL PUT that comes AFTER the failed receipt.
          return receiptFailed && isAclPut(url, method);
        }),
      }),
    ).rejects.toThrow();
    const repaired = await changeContainerAccess(podBase, owner, AGENT, "grant", MODES, {
      podFetch: plain,
    });
    expect(repaired.action).toBe("grant");
    standings = await readGrantStandings(podBase, owner, { podFetch: plain });
    expect(standings.find((entry) => entry.agent === AGENT)).toMatchObject({
      granted: true,
      modes: ["read", "write"],
      revoked: false,
    });
    // Exactly ONE receipt — the repair never minted a duplicate.
    const afterRepair = await readConsentLedger(podBase, owner, { podFetch: plain });
    expect(afterRepair.map((receipt) => receipt.action)).toEqual(["grant"]);
    expect(afterRepair[0]?.resource).toBe(mortgageContainerIri(podBase));

    // 3. Revoke whose receipt write fails: access is ALREADY OFF (fail-safe
    //    direction) and the retry repairs the missing receipt.
    await expect(
      changeContainerAccess(podBase, owner, AGENT, "revoke", MODES, {
        podFetch: faultingFetch(plain, isReceiptPut),
      }),
    ).rejects.toThrow();
    standings = await readGrantStandings(podBase, owner, { podFetch: plain });
    expect(standings.find((entry) => entry.agent === AGENT)?.granted).toBe(false);
    const revoked = await changeContainerAccess(podBase, owner, AGENT, "revoke", MODES, {
      podFetch: plain,
    });
    expect(revoked.action).toBe("revoke");
    const ledger = await readConsentLedger(podBase, owner, { podFetch: plain });
    expect(ledger.map((receipt) => receipt.action)).toEqual(["grant", "revoke"]);

    // 4. And revocation stays immutable through all of it.
    await expect(
      changeContainerAccess(podBase, owner, AGENT, "grant", MODES, { podFetch: plain }),
    ).rejects.toThrow(/immutable/);
  }, 60_000);
});
