/**
 * Integration tests for the sparq WASM dev/test harness — OIDC mode (sm-4).
 *
 * Real Solid-OIDC + DPoP verification (`@solid/access-token-verifier` inside the vendored
 * host) against per-account dev issuers, so WAC allow/deny across identities is genuinely
 * evaluated: anonymous requests stay anonymous instead of collapsing into the owner.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { type SolidTestServer, startSolidServer } from "../src/testing.js";

const TURTLE = "text/turtle";

const PUBLIC_DOC = `@prefix schema: <http://schema.org/> .

<> a schema:CreativeWork ;
    schema:name "public fixture" .
`;

const PRIVATE_DOC = `@prefix schema: <http://schema.org/> .

<> a schema:CreativeWork ;
    schema:name "owner-only document" .
`;

function expectDenied(status: number): void {
  expect([401, 403]).toContain(status);
}

describe("sparq WASM harness — oidc mode (real WAC)", () => {
  let server: SolidTestServer;

  beforeAll(async () => {
    server = await startSolidServer({
      oidc: true,
      seedFixtures: [{ path: "/public/doc", body: PUBLIC_DOC, publicRead: true }],
    });
  }, 60_000);

  afterAll(async () => {
    await server.stop();
  });

  test("mints a dereferenceable WebID bound to the dev issuer", async () => {
    const owner = server.accounts[0];
    expect(owner).toBeDefined();
    const profile = await fetch(owner?.webid as string);
    expect(profile.status).toBe(200);
    const body = await profile.text();
    expect(body).toContain("http://www.w3.org/ns/solid/terms#oidcIssuer");
  });

  test("owner-write then anonymous-read is denied BEFORE authenticated read succeeds", {
    timeout: 30_000,
  }, async () => {
    const owner = server.accounts[0];
    const url = `${server.baseUrl}/private/doc`;

    const write = await owner?.authFetch(url, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-none-match": "*" },
      body: PRIVATE_DOC,
    });
    expect(write?.status).toBe(201);

    // Prove the resource is actually private before claiming authenticated read works.
    const anonymous = await fetch(url, { headers: { accept: TURTLE } });
    expectDenied(anonymous.status);

    const authenticated = await owner?.authFetch(url, { headers: { accept: TURTLE } });
    expect(authenticated?.status).toBe(200);
    expect(await authenticated?.text()).toContain("owner-only document");
  });

  test("seeded public-read ACL: anonymous read allowed, anonymous write denied", {
    timeout: 30_000,
  }, async () => {
    const owner = server.accounts[0];
    const url = `${server.baseUrl}/public/doc`;

    const anonymousRead = await fetch(url, { headers: { accept: TURTLE } });
    expect(anonymousRead.status).toBe(200);
    expect(await anonymousRead.text()).toContain("public fixture");

    const anonymousWrite = await fetch(url, {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: PRIVATE_DOC,
    });
    expectDenied(anonymousWrite.status);

    // The owner clause in the seeded ACL must retain write access.
    const ownerWrite = await owner?.authFetch(url, {
      method: "PUT",
      headers: { "content-type": TURTLE },
      body: PUBLIC_DOC,
    });
    expect([200, 204, 205]).toContain(ownerWrite?.status as number);
  });

  test("a second verified identity is authenticated but NOT authorized on the owner's pod", {
    timeout: 30_000,
  }, async () => {
    const stranger = await server.provisionAccount();
    expect(stranger.webid).not.toBe(server.accounts[0]?.webid);

    // Verified credentials, wrong agent: WAC must deny the private resource…
    const privateRead = await stranger.authFetch(`${server.baseUrl}/private/doc`, {
      headers: { accept: TURTLE },
    });
    expectDenied(privateRead.status);

    // …while the public-read resource stays readable for any agent.
    const publicRead = await stranger.authFetch(`${server.baseUrl}/public/doc`, {
      headers: { accept: TURTLE },
    });
    expect(publicRead.status).toBe(200);

    // And the stranger's own pod is fully theirs.
    const ownWrite = await stranger.authFetch(`${stranger.baseUrl}/private/mine`, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-none-match": "*" },
      body: PRIVATE_DOC,
    });
    expect(ownWrite.status).toBe(201);
  });

  test("rejects fixed-owner-only options instead of silently ignoring them", async () => {
    await expect(
      startSolidServer({ oidc: true, ownerWebid: "https://id.example/nope#me" }),
    ).rejects.toThrow(/dev issuer/i);
    await expect(server.provisionAccount("https://id.example/nope#me")).rejects.toThrow(
      /dev issuer/i,
    );
  });
});
