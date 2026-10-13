import { describe, expect, test } from "vitest";
import { connectRemoteDemoPod, SIMULATED_LOGIN_DISCLOSURE } from "../src/browser-pod/index.js";

describe("connectRemoteDemoPod (local demo server's shared pod)", () => {
  const options = {
    podBaseUrl: "http://127.0.0.1:4401/",
    webId: "https://localhost:4402/profile#me",
    displayName: "Alex Rivera",
    acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE,
  } as const;

  test("binds a simulated session to the remote pod and routes pod IO through the given fetch", async () => {
    const seen: string[] = [];
    const connection = connectRemoteDemoPod({
      ...options,
      fetch: async (input) => {
        seen.push(input instanceof Request ? input.url : String(input));
        return new Response("<#it> a <#Thing>.", { headers: { "content-type": "text/turtle" } });
      },
    });
    expect(connection.kind).toBe("remote");
    expect(connection.session.simulated).toBe(true);
    expect(connection.webId).toBe(options.webId);
    expect(connection.displayName).toBe("Alex Rivera");
    const response = await connection.session.authFetch(`${options.podBaseUrl}mortgage/profile`);
    expect(response.status).toBe(200);
    expect(seen).toEqual(["http://127.0.0.1:4401/mortgage/profile"]);
    connection.close();
  });

  test("still requires the decision-0011 acknowledgement", () => {
    expect(() =>
      connectRemoteDemoPod({
        ...options,
        acknowledgeSimulated: "no" as typeof SIMULATED_LOGIN_DISCLOSURE,
      }),
    ).toThrow(/acknowledgement/);
  });

  test("refuses a non-loopback cleartext pod", () => {
    expect(() =>
      connectRemoteDemoPod({ ...options, podBaseUrl: "http://pods.example/alex/" }),
    ).toThrow(/https/);
  });
});
