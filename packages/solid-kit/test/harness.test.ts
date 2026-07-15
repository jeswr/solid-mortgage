/**
 * Integration tests for the sparq WASM dev/test harness — fixed-owner mode (sm-4).
 * One long-lived server per suite (harness rule); tests that write use their own paths.
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { profileCardFixture, type SolidTestServer, startSolidServer } from "../src/testing.js";

const FOAF_NS = "http://xmlns.com/foaf/0.1/";
const PIM_NS = "http://www.w3.org/ns/pim/space#";
const TURTLE = "text/turtle";

const NOTE_TURTLE = `@prefix schema: <http://schema.org/> .

<> a schema:NoteDigitalDocument ;
    schema:text "round-trip payload" .
`;

const NOTE_TURTLE_UPDATED = `@prefix schema: <http://schema.org/> .

<> a schema:NoteDigitalDocument ;
    schema:text "round-trip payload v2" .
`;

describe("sparq WASM harness — fixed-owner mode", () => {
  let server: SolidTestServer;

  beforeAll(async () => {
    server = await startSolidServer({
      seedFixtures: (account) => [
        profileCardFixture({
          webid: account.webid,
          name: "Demo Owner",
          publicRead: false,
        }),
      ],
    });
  }, 60_000);

  afterAll(async () => {
    await server.stop();
  });

  test("boots on a dynamic loopback port with a derived WebID", () => {
    const url = new URL(server.baseUrl);
    expect(url.hostname).toBe("127.0.0.1");
    expect(Number(url.port)).toBeGreaterThan(0);
    expect(server.accounts).toHaveLength(1);
    expect(server.accounts[0]?.webid).toBe(`${server.baseUrl}/profile/card#me`);
  });

  test("seeded profile card serves foaf:name and pim:storage", async () => {
    const response = await fetch(`${server.baseUrl}/profile/card`, {
      headers: { accept: TURTLE },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(TURTLE);
    const body = await response.text();
    // The server round-trips the seeded Turtle byte-exact (prefixed form), so pin the exact
    // namespace IRIs via their prefix declarations plus the qname usage — an empty or
    // mis-prefixed graph must not pass.
    expect(body).toContain(`<${FOAF_NS}>`);
    expect(body).toContain("foaf:name");
    expect(body).toContain("Demo Owner");
    expect(body).toContain(`<${PIM_NS}>`);
    expect(body).toContain("pim:storage");
  });

  test("Turtle CRUD round-trip with ETag-conditional requests", { timeout: 30_000 }, async () => {
    const url = `${server.baseUrl}/notes/note1`;

    const created = await fetch(url, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-none-match": "*" },
      body: NOTE_TURTLE,
    });
    expect(created.status).toBe(201);

    const read = await fetch(url, { headers: { accept: TURTLE } });
    expect(read.status).toBe(200);
    expect(await read.text()).toContain("round-trip payload");
    const etag = read.headers.get("etag");
    expect(etag).toBeTruthy();

    const notModified = await fetch(url, {
      headers: { accept: TURTLE, "if-none-match": etag as string },
    });
    expect(notModified.status).toBe(304);

    const updated = await fetch(url, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-match": etag as string },
      body: NOTE_TURTLE_UPDATED,
    });
    expect([200, 204, 205]).toContain(updated.status);

    const staleWrite = await fetch(url, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-match": etag as string },
      body: NOTE_TURTLE,
    });
    expect(staleWrite.status).toBe(412);

    const reread = await fetch(url, { headers: { accept: TURTLE } });
    expect(await reread.text()).toContain("round-trip payload v2");

    const container = await fetch(`${server.baseUrl}/notes/`, { headers: { accept: TURTLE } });
    expect(container.status).toBe(200);
    expect(await container.text()).toContain("http://www.w3.org/ns/ldp#contains");

    const deleted = await fetch(url, { method: "DELETE" });
    expect([200, 204, 205]).toContain(deleted.status);

    const gone = await fetch(url, { headers: { accept: TURTLE } });
    expect(gone.status).toBe(404);
  });

  test("two identities get isolated pods on distinct ports", { timeout: 30_000 }, async () => {
    const other = await server.provisionAccount("https://id.example/other#me");
    expect(other.webid).toBe("https://id.example/other#me");
    expect(other.baseUrl).not.toBe(server.baseUrl);

    const path = "/isolation/doc";
    const write = await fetch(`${server.baseUrl}${path}`, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-none-match": "*" },
      body: NOTE_TURTLE,
    });
    expect(write.status).toBe(201);

    // Same path on the other identity's pod must be absent.
    const crossRead = await fetch(`${other.baseUrl}${path}`, { headers: { accept: TURTLE } });
    expect(crossRead.status).toBe(404);

    const otherWrite = await fetch(`${other.baseUrl}/private/other-doc`, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-none-match": "*" },
      body: NOTE_TURTLE,
    });
    expect(otherWrite.status).toBe(201);
    const reverseRead = await fetch(`${server.baseUrl}/private/other-doc`, {
      headers: { accept: TURTLE },
    });
    expect(reverseRead.status).toBe(404);
  });

  test("stop() shuts every account's pod down cleanly", { timeout: 30_000 }, async () => {
    const scoped = await startSolidServer();
    const extra = await scoped.provisionAccount();

    const write = await fetch(`${scoped.baseUrl}/tmp/doc`, {
      method: "PUT",
      headers: { "content-type": TURTLE, "if-none-match": "*" },
      body: NOTE_TURTLE,
    });
    expect(write.status).toBe(201);

    await scoped.stop();
    await expect(fetch(`${scoped.baseUrl}/tmp/doc`)).rejects.toThrow();
    await expect(fetch(`${extra.baseUrl}/`)).rejects.toThrow();
    // Idempotent: a second stop must not throw.
    await scoped.stop();
    await expect(scoped.provisionAccount()).rejects.toThrow(/stopped/);
  });

  test("stop() racing an in-flight provisionAccount() never leaks a pod", {
    timeout: 30_000,
  }, async () => {
    const scoped = await startSolidServer();
    const pending = scoped.provisionAccount();
    // stop() must resolve cleanly — with the lifecycle contract, that certifies any late
    // account's cleanup completed (a cleanup failure rejects stop()).
    await scoped.stop();

    // Whichever side of the race won: a handed-out account must be dead, and a rejection
    // must be the race-specific one (anything else means provisioning itself broke).
    const account = await pending.then(
      (provisioned) => provisioned,
      (error) => {
        expect(String(error)).toMatch(/stopped while provisioning/);
        return undefined;
      },
    );
    if (account !== undefined) {
      await expect(fetch(`${account.baseUrl}/`)).rejects.toThrow();
    }
    await expect(fetch(`${scoped.baseUrl}/`)).rejects.toThrow();
    // The deterministic stop-wins branch lives in harness-race.test.ts.
  });
});
