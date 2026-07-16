/**
 * createServicePodFetch (decision 0015 L4): a client-credentials DPoP service
 * identity against the REAL dev issuer and a REAL WAC-enforcing pod — the pod
 * itself verifies the minted tokens (no mocked verification).
 */

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startDevOidcIssuer } from "../src/auth/dev-issuer.js";
import { createServicePodFetch } from "../src/auth/service.js";
import { startSolidServer } from "../src/harness.js";

const CLIENT = { clientId: "svc", clientSecret: "svc-secret" };

let pods: Awaited<ReturnType<typeof startSolidServer>>;
let issuer: Awaited<ReturnType<typeof startDevOidcIssuer>>;
let podBase = "";
let protectedIri = "";

beforeAll(async () => {
  pods = await startSolidServer({ oidc: true });
  const owner = pods.accounts[0];
  if (owner === undefined) throw new Error("no owner account");
  issuer = await startDevOidcIssuer({ clientCredentials: CLIENT, webidScheme: "http" });
  podBase = `${pods.baseUrl}/`;
  protectedIri = `${podBase}private/doc`;
  // Owner writes a private resource and grants ONLY the service identity read.
  const doc = await owner.authFetch(protectedIri, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: `<${protectedIri}> a <http://example.org/Private> .`,
  });
  expect(doc.ok).toBe(true);
  const acl = await owner.authFetch(`${protectedIri}.acl`, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: `@prefix acl: <http://www.w3.org/ns/auth/acl#> .
<#owner> a acl:Authorization ; acl:accessTo <${protectedIri}> ; acl:agent <${owner.webid}> ;
  acl:mode acl:Read, acl:Write, acl:Control .
<#svc> a acl:Authorization ; acl:accessTo <${protectedIri}> ; acl:agent <${issuer.webid}> ;
  acl:mode acl:Read .
`,
  });
  expect(acl.ok).toBe(true);
}, 120_000);

afterAll(async () => {
  await pods?.stop();
  await issuer?.stop();
});

describe("createServicePodFetch", () => {
  test("reads a WAC-protected resource the pod grants to the service WebID", async () => {
    const serviceFetch = createServicePodFetch({
      issuer: issuer.issuer,
      ...CLIENT,
      allowInsecureLoopback: true,
    });
    // Anonymous is refused; the service identity is not.
    expect((await fetch(protectedIri)).status).toBe(401);
    const first = await serviceFetch(protectedIri);
    expect(first.status).toBe(200);
    // Second call rides the cached token with a FRESH single-use proof.
    expect((await serviceFetch(protectedIri)).status).toBe(200);
  }, 60_000);

  test("a wrong client secret is refused at the token endpoint (fail closed)", async () => {
    const serviceFetch = createServicePodFetch({
      issuer: issuer.issuer,
      clientId: CLIENT.clientId,
      clientSecret: "wrong",
      allowInsecureLoopback: true,
    });
    await expect(serviceFetch(protectedIri)).rejects.toThrow(/refused \(400\)/);
  }, 60_000);

  test("cleartext and non-loopback endpoints are refused without the dev flag", () => {
    expect(() => createServicePodFetch({ issuer: "http://issuer.example", ...CLIENT })).toThrow(
      /must be https/,
    );
    const serviceFetch = createServicePodFetch({
      issuer: issuer.issuer,
      ...CLIENT,
      allowInsecureLoopback: true,
    });
    // The credentialed session refuses to touch a non-loopback cleartext resource.
    return expect(serviceFetch("http://pods.example/doc")).rejects.toThrow(/must be https/);
  });
});
