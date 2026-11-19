/**
 * SECURITY regression (roborev sm-28 High ×2): a party the borrower granted
 * WRITE on `/mortgage/` must not be able to weaponise the consent ledger.
 * Driven against a REAL WAC-enforcing sparq pod, with the granted party's
 * service identity a real second account.
 *
 *   1. The authoritative `/mortgage/receipts/` store is NOT writable by the
 *      granted party — its own ACL overrides the container's inherited
 *      `acl:default`.
 *   2. A forged WITHDRAW receipt the party writes at the container ROOT must
 *      NOT trip the immutable-revocation guard for another party, and must NOT
 *      count as policy history.
 *   3. Junk the party writes at a root receipt IRI must NOT block the
 *      borrower's real revoke (removed for real, nothing thrown).
 */
import {
  type SolidTestAccount,
  type SolidTestServer,
  seedPod,
  startSolidServer,
} from "@mortgage/solid-kit/testing";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
  changeContainerAccess,
  mortgageContainerIri,
  readGrantStandings,
  receiptsContainerIri,
} from "../lib/grants/engine";

const COMPETITOR = "https://lender53.example/orgs/prequal#id";
const MODES = { write: true, control: false };

let pods: SolidTestServer;
let owner: SolidTestAccount;
let party: SolidTestAccount; // the granted party's real service identity
let podBase = "";
let ownerWebId = "";
let partyWebId = "";

beforeAll(async () => {
  // OIDC mode: real per-identity DPoP auth, so WAC is genuinely enforced
  // between the borrower (pod owner) and the granted party (a distinct
  // account) — fixed-owner mode would make every request act as the owner.
  pods = await startSolidServer({ oidc: true });
  const primary = pods.accounts[0];
  if (primary === undefined) throw new Error("harness provisioned no owner");
  owner = primary;
  party = await pods.provisionAccount();
  podBase = `${pods.baseUrl}/`;
  ownerWebId = owner.webid;
  partyWebId = party.webid;

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

  // Grant the party (its real WebID) Read+Write across the container — the
  // worst-case grant breadth this test defends against. The engine rebuilds
  // the ACL, so from here the party's access is engine-managed.
  await changeContainerAccess(podBase, ownerWebId, partyWebId, "grant", MODES, {
    podFetch: owner.authFetch,
  });
}, 60_000);

afterAll(async () => {
  await pods?.stop();
});

/** A SHACL-valid DPV consent receipt body the party PUTs at some IRI. */
function forgedReceiptTurtle(
  iri: string,
  recipient: string,
  status: "Given" | "Withdrawn",
): string {
  return `@prefix dpv: <https://w3id.org/dpv#> .
<${iri}> a dpv:ConsentReceipt ;
  dpv:hasDataSubject <${ownerWebId}> ;
  dpv:hasDataController <${recipient}> ;
  dpv:hasConsentStatus dpv:Consent${status} ;
  <http://purl.org/dc/terms/references> <${mortgageContainerIri(podBase)}> ;
  <http://purl.org/dc/terms/issued> "2026-07-16T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> .
`;
}

describe("consent-ledger integrity against a write-granted party", () => {
  test("the party (write on the container) cannot write into the protected receipt store", async () => {
    const target = `${receiptsContainerIri(podBase)}vault-99-revoke-forged`;
    const write = await party.authFetch(target, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: forgedReceiptTurtle(target, COMPETITOR, "Withdrawn"),
    });
    expect([401, 403]).toContain(write.status);
  });

  test("a forged ROOT withdraw receipt neither counts as policy nor blocks the competitor's grant", async () => {
    const iri = `${mortgageContainerIri(podBase)}consent-receipt-forged-Withdrawn`;
    const put = await party.authFetch(iri, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: forgedReceiptTurtle(iri, COMPETITOR, "Withdrawn"),
    });
    expect(put.ok).toBe(true);

    const standings = await readGrantStandings(podBase, ownerWebId, { podFetch: owner.authFetch });
    expect(standings.find((entry) => entry.agent === COMPETITOR)?.revoked ?? false).toBe(false);

    const granted = await changeContainerAccess(podBase, ownerWebId, COMPETITOR, "grant", MODES, {
      podFetch: owner.authFetch,
    });
    expect(granted.action).toBe("grant");

    // The competitor's AUTHORITATIVE receipt (grant) exists; the forged
    // root record never entered policy history — a revoke of the competitor
    // is therefore possible (not blocked by a fake "already revoked").
    const revoke = await changeContainerAccess(podBase, ownerWebId, COMPETITOR, "revoke", MODES, {
      podFetch: owner.authFetch,
    });
    expect(revoke.action).toBe("revoke");
  });

  test("a grant FAILS CLOSED when a protected withdraw receipt is transiently unreadable", async () => {
    // Set up an authoritative revoke: grant then revoke a throwaway agent so a
    // withdraw receipt exists in the protected store.
    const throwaway = "https://throwaway.example/orgs/x#id";
    await changeContainerAccess(podBase, ownerWebId, throwaway, "grant", MODES, {
      podFetch: owner.authFetch,
    });
    await changeContainerAccess(podBase, ownerWebId, throwaway, "revoke", MODES, {
      podFetch: owner.authFetch,
    });

    // A fetch that 500s exactly when the protected withdraw receipt is READ —
    // a transient dropout. A fail-OPEN policy read would drop the withdraw and
    // let the re-grant through; the STRICT read must abort instead.
    const flaky: typeof fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = (input instanceof Request ? input.method : init?.method) ?? "GET";
      if (method === "GET" && /\/receipts\/vault-\d+-revoke-/.test(url)) {
        return Promise.resolve(new Response("flaky", { status: 500 }));
      }
      return owner.authFetch(input, init);
    };
    await expect(
      changeContainerAccess(podBase, ownerWebId, throwaway, "grant", MODES, { podFetch: flaky }),
    ).rejects.toThrow();
    // With a healthy fetch the guard still sees the withdraw: immutable 409.
    await expect(
      changeContainerAccess(podBase, ownerWebId, throwaway, "grant", MODES, {
        podFetch: owner.authFetch,
      }),
    ).rejects.toThrow(/immutable/);
  });

  test("junk at a root receipt IRI does not block a real revoke", async () => {
    const iri = `${mortgageContainerIri(podBase)}consent-receipt-junk`;
    const junk = await party.authFetch(iri, {
      method: "PUT",
      headers: { "content-type": "text/turtle" },
      body: `<${iri}> a <https://example.org/NotAReceipt> .\n`,
    });
    expect(junk.ok).toBe(true);

    const revoke = await changeContainerAccess(podBase, ownerWebId, partyWebId, "revoke", MODES, {
      podFetch: owner.authFetch,
    });
    expect(revoke.action).toBe("revoke");
    // Real WAC effect: the party's authenticated read of a member now fails.
    expect([401, 403]).toContain((await party.authFetch(`${podBase}mortgage/profile`)).status);
    const standings = await readGrantStandings(podBase, ownerWebId, { podFetch: owner.authFetch });
    expect(standings.find((entry) => entry.agent === partyWebId)?.granted).toBe(false);
    expect(standings.find((entry) => entry.agent === partyWebId)?.revoked).toBe(true);
  });
});
