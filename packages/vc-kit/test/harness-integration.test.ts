/**
 * Pod integration (deliverable 6): one sparq wasm Solid server per suite, in
 * fixed-owner mode on a free loopback port. The issuer's WebID document (with its published Multikey) and the
 * signed status list are POD RESOURCES; credentials round-trip
 * issue -> PUT -> GET -> verify with the real fail-closed WebID key resolver.
 */

import { createServer } from "node:net";
import { publishVerificationMethod } from "@jeswr/solid-vc";
import { type SolidHttpServer, startSolidServer } from "@sparq-org/solid-server";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { IssuedCredential, KeyPair } from "../src/index.js";
import {
  generateKeyPairForSuite,
  isFresh,
  issueCredential,
  reissueCredential,
  StatusIndexAllocator,
  StatusListClient,
  verifyCredential,
} from "../src/index.js";
import { BACKDATED_VALIDITY, DAY_MS, employmentClaims, NOW, parseTurtle } from "./support.js";

let server: { baseUrl: string; stop(): Promise<void> };
let webid: string;
let key: KeyPair;
let list: StatusListClient;
let allocator: StatusIndexAllocator;
let credentialUrl: string;
let issued: IssuedCredential;
let issuedIndex: number;

/** A free loopback port (the OS picks one, then releases it for the pod). */
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  if (address === null || typeof address === "string") throw new Error("no loopback port");
  return address.port;
}

/** One in-memory pod; every request acts as the owner (no authentication). */
async function startPod(): Promise<{ baseUrl: string; stop(): Promise<void> }> {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const pod: SolidHttpServer = await startSolidServer({
    port,
    baseUrl,
    ownerWebid: `${baseUrl}/profile/card#me`,
  });
  return { baseUrl, stop: () => pod.closeAsync() };
}

/** PUT a document into the pod, strict-create. */
async function putResource(url: string, body: string, contentType: string): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": contentType, "if-none-match": "*" },
    body,
  });
  if (!response.ok) throw new Error(`PUT ${url} failed: ${response.status}`);
}

beforeAll(async () => {
  server = await startPod();
  webid = `${server.baseUrl}/profile/card#me`;
  key = await generateKeyPairForSuite(`${server.baseUrl}/profile/card#vc-key`, "Ed25519");

  // The issuer's WebID document: profile + published verification method.
  const published = await publishVerificationMethod({ controller: webid, key });
  const profile = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix pim: <http://www.w3.org/ns/pim/space#> .

<${webid}> a foaf:Person ;
    foaf:name "Payroll Issuer" ;
    pim:storage <${server.baseUrl}/> .

${published.turtle}`;
  await putResource(`${server.baseUrl}/profile/card`, profile, "text/turtle");

  // The issuer app's hosted revocation list is a pod resource too.
  list = new StatusListClient({
    url: `${server.baseUrl}/status/employment`,
    issuer: webid,
    key,
    fetch,
  });
  await list.create({ now: NOW });

  allocator = new StatusIndexAllocator();
  credentialUrl = `${server.baseUrl}/credentials/income`;
  issuedIndex = allocator.allocate(credentialUrl);
  issued = await issueCredential({
    kind: "employment-income-credential",
    credentialId: credentialUrl,
    issuer: webid,
    subject: webid,
    claims: employmentClaims(),
    validity: BACKDATED_VALIDITY,
    status: list.entry(issuedIndex),
    key,
  });
  await putResource(credentialUrl, issued.body, issued.contentType);
}, 120_000);

afterAll(async () => {
  await server?.stop();
});

function verifyOptions(now: Date = NOW) {
  // Both resolvers ride plain fetch against the local pod; production callers
  // omit these and get the SSRF-guarded defaults.
  return {
    expectShape: "employment-income-credential" as const,
    now,
    webIdFetch: fetch,
    statusFetch: fetch,
  };
}

async function fetchCredential(url: string = credentialUrl): Promise<string> {
  const response = await fetch(url, { headers: { accept: "text/turtle" } });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.text();
}

describe("issue -> store-in-pod -> verify", () => {
  test("the stored credential verifies with WebID-document key resolution", async () => {
    const body = await fetchCredential();
    const outcome = await verifyCredential(body, verifyOptions());
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
    expect(outcome.credential?.issuer).toBe(webid);
    expect(outcome.credential?.subject).toBe(webid);
  });

  test("the backdated window is genuinely near-expiry (fresh now, stale +15d)", async () => {
    const body = await fetchCredential();
    const outcome = await verifyCredential(body, verifyOptions());
    expect(isFresh(outcome.credential ?? {}, NOW)).toBe(true);
    expect(isFresh(outcome.credential ?? {}, new Date(NOW.getTime() + 15 * DAY_MS))).toBe(false);
    const staleOutcome = await verifyCredential(
      body,
      verifyOptions(new Date(NOW.getTime() + 15 * DAY_MS)),
    );
    expect(staleOutcome.verified).toBe(false);
    expect(staleOutcome.errors.map((error) => error.code)).toContain("EXPIRED");
  });

  test("a tampered pod document fails the signature", async () => {
    const body = await fetchCredential();
    const outcome = await verifyCredential(body.replace("8500", "9100"), verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(outcome.errors.map((error) => error.code)).toContain("INVALID_SIGNATURE");
  });

  test("a key the WebID document never authorised cannot verify", async () => {
    const rogueKey = await generateKeyPairForSuite(
      `${server.baseUrl}/profile/card#rogue-key`,
      "Ed25519",
    );
    const rogue = await issueCredential({
      kind: "employment-income-credential",
      credentialId: `${server.baseUrl}/credentials/rogue`,
      issuer: webid,
      subject: webid,
      claims: employmentClaims(),
      validity: BACKDATED_VALIDITY,
      status: list.entry(allocator.allocate("rogue")),
      key: rogueKey,
    });
    const outcome = await verifyCredential(rogue.body, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(outcome.errors.map((error) => error.code)).toContain("INVALID_SIGNATURE");
  });

  test("an unreachable status list is a verification failure on the pod too", async () => {
    const stranded = await issueCredential({
      kind: "employment-income-credential",
      credentialId: `${server.baseUrl}/credentials/stranded`,
      issuer: webid,
      subject: webid,
      claims: employmentClaims(),
      validity: BACKDATED_VALIDITY,
      status: {
        statusPurpose: "revocation",
        statusListIndex: 7,
        statusListCredential: `${server.baseUrl}/status/does-not-exist`,
      },
      key,
    });
    const outcome = await verifyCredential(stranded.body, verifyOptions());
    expect(outcome.verified).toBe(false);
    expect(outcome.errors.map((error) => error.code)).toContain("STATUS_UNREACHABLE");
  });
});

describe("scene 4 on the pod: revocation + one-click re-issue", () => {
  test("revocation flips verification; re-issue restores the green tick", async () => {
    // Re-verify at a "30 days later" instant where the credential is stale.
    const later = new Date(NOW.getTime() + 15 * DAY_MS);
    const oldBody = await fetchCredential();

    const result = await reissueCredential(parseTurtle(oldBody), {
      key,
      now: later,
      validity: { validFrom: later, validUntil: new Date(later.getTime() + 14 * DAY_MS) },
      statusList: list,
      allocator,
      credentialId: `${server.baseUrl}/credentials/income-reissued`,
    });
    await putResource(result.issued.credentialId, result.issued.body, result.issued.contentType);

    // Old: expired AND revoked. New: verified + fresh.
    const staleOutcome = await verifyCredential(oldBody, verifyOptions(later));
    expect(staleOutcome.verified).toBe(false);
    expect(staleOutcome.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["EXPIRED", "STATUS_REVOKED"]),
    );
    expect(result.revokedIndex).toBe(issuedIndex);

    const freshBody = await fetchCredential(result.issued.credentialId);
    const freshOutcome = await verifyCredential(freshBody, verifyOptions(later));
    expect(freshOutcome.errors).toEqual([]);
    expect(freshOutcome.verified).toBe(true);
    expect(isFresh(freshOutcome.credential ?? {}, later)).toBe(true);
  }, 60_000);
});
