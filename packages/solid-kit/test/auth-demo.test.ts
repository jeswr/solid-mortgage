/**
 * demoLogin (Mode 1, decision 0011): the simulated session is impossible to construct
 * without the honesty acknowledgement, carries `simulated: true`, presents the same
 * session interface as createAuthClient, and rides the harness pod (fixed-owner mode —
 * exactly the in-browser Mode-1 topology, where every request already acts as the
 * owner).
 */
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { demoLogin, SIMULATED_LOGIN_DISCLOSURE } from "../src/auth/demo.js";
import { type SolidTestServer, startSolidServer } from "../src/testing.js";

const WEBID = "https://borrower.example/profile#me";
const POD = "https://pods.example";

const options = () => ({
  webId: WEBID,
  podBaseUrl: POD,
  acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
});

describe("demoLogin — decision-0011 honesty enforcement", () => {
  test("refuses construction without the exact acknowledgement", () => {
    expect(() =>
      demoLogin({
        ...options(),
        // Runtime bypass attempt (the literal type is also wrong, hence the cast).
        acknowledgeSimulated: "yes yes, simulated, whatever" as never,
      }),
    ).toThrow(/decision-0011/u);
    expect(() => demoLogin({ ...options(), acknowledgeSimulated: undefined as never })).toThrow(
      /decision-0011/u,
    );
  });

  test("the session carries the non-negotiable simulated flag", () => {
    const session = demoLogin(options());
    expect(session.simulated).toBe(true);
    expect(session.webId).toBe(WEBID);
    expect(session.podBaseUrl).toBe(`${POD}/`);
  });

  test("validates the persona WebID and pod base (cleartext guard)", () => {
    expect(() => demoLogin({ ...options(), webId: "not a url" })).toThrow();
    expect(() => demoLogin({ ...options(), webId: "http://insecure.example/#me" })).toThrow();
    expect(() => demoLogin({ ...options(), podBaseUrl: "http://insecure.example" })).toThrow(
      /https/u,
    );
    // Loopback http is dev-only: refused without the flag, accepted with it.
    expect(() =>
      demoLogin({
        ...options(),
        webId: "http://localhost:3000/profile#me",
        podBaseUrl: "http://localhost:3000",
      }),
    ).toThrow();
    const dev = demoLogin({
      ...options(),
      webId: "http://localhost:3000/profile#me",
      podBaseUrl: "http://localhost:3000",
      allowInsecureLoopback: true,
    });
    expect(dev.webId).toBe("http://localhost:3000/profile#me");
  });

  test("session interface parity: restore / logout / login / onSessionChange", async () => {
    const session = demoLogin(options());
    const seen: Array<string | null> = [];
    const unsubscribe = session.onSessionChange(({ webId }) => {
      seen.push(webId);
    });

    await expect(session.restore()).resolves.toEqual({ outcome: "restored", webId: WEBID });

    await session.logout();
    expect(session.webId).toBeNull();
    await expect(session.restore()).resolves.toEqual({ outcome: "login" });

    await expect(session.login()).resolves.toEqual({ webId: WEBID });
    expect(session.webId).toBe(WEBID);

    unsubscribe();
    expect(seen).toEqual([null, WEBID]);
  });

  test("a throwing listener never disturbs the session", async () => {
    const session = demoLogin(options());
    session.onSessionChange(() => {
      throw new Error("listener bug");
    });
    await expect(session.logout()).resolves.toBeUndefined();
    expect(session.webId).toBeNull();
  });
});

describe("demoLogin — bound to the harness pod (fixed-owner Mode-1 topology)", () => {
  let server: SolidTestServer;

  beforeAll(async () => {
    server = await startSolidServer();
  }, 60_000);

  afterAll(async () => {
    await server.stop();
  });

  test("authFetch reads and writes the persona's pod", { timeout: 30_000 }, async () => {
    const owner = server.accounts[0];
    expect(owner).toBeDefined();
    if (owner === undefined) throw new Error("unreachable");

    const session = demoLogin({
      webId: owner.webid,
      podBaseUrl: owner.baseUrl,
      fetch: owner.authFetch,
      allowInsecureLoopback: true,
      acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
    });
    expect(session.simulated).toBe(true);

    const url = `${owner.baseUrl}/demo/persona-doc`;
    const write = await session.authFetch(url, {
      method: "PUT",
      headers: { "content-type": "text/turtle", "if-none-match": "*" },
      body: `<> <http://schema.org/name> "simulated session fixture" .\n`,
    });
    expect(write.status).toBe(201);

    const read = await session.authFetch(url, { headers: { accept: "text/turtle" } });
    expect(read.status).toBe(200);
    expect(await read.text()).toContain("simulated session fixture");
  });
});
