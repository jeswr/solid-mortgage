/**
 * clientIdDocument (sm-22): the verified solid-client-id template — spec-required
 * context, byte-equal client_id contract, WebID-bound scope, public-client posture.
 */
import { describe, expect, test } from "vitest";
import {
  clientIdDocument,
  clientIdDocumentResponse,
  SOLID_OIDC_CONTEXT,
} from "../src/auth/client-id.js";

const CLIENT_ID = "https://borrower.example/clientid.jsonld";
const CALLBACK = "https://borrower.example/callback.html";

const options = () => ({
  name: "Borrower Wallet",
  clientId: CLIENT_ID,
  redirectUris: [CALLBACK],
});

describe("clientIdDocument", () => {
  test("produces the verified Solid-OIDC template", () => {
    const document = clientIdDocument({
      ...options(),
      clientUri: "https://borrower.example/",
      logoUri: "https://borrower.example/logo.png",
    });
    expect(document).toEqual({
      "@context": [SOLID_OIDC_CONTEXT],
      client_id: CLIENT_ID,
      client_name: "Borrower Wallet",
      redirect_uris: [CALLBACK],
      scope: "openid webid offline_access",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_uri: "https://borrower.example/",
      logo_uri: "https://borrower.example/logo.png",
    });
  });

  test("client_id passes through byte-for-byte (the URL === client_id contract)", () => {
    const withPort = "https://borrower.example:8443/app/clientid.jsonld";
    expect(clientIdDocument({ ...options(), clientId: withPort }).client_id).toBe(withPort);
  });

  test("optional fields are omitted, not nulled", () => {
    const document = clientIdDocument(options());
    expect("client_uri" in document).toBe(false);
    expect("logo_uri" in document).toBe(false);
    expect("contacts" in document).toBe(false);
  });

  test("refuses an empty name, empty redirect list, or relative URLs", () => {
    expect(() => clientIdDocument({ ...options(), name: "  " })).toThrow(/name/u);
    expect(() => clientIdDocument({ ...options(), redirectUris: [] })).toThrow(/redirectUris/u);
    expect(() => clientIdDocument({ ...options(), redirectUris: ["/callback.html"] })).toThrow(
      /absolute/u,
    );
    expect(() => clientIdDocument({ ...options(), clientId: "clientid.jsonld" })).toThrow(
      /absolute/u,
    );
  });

  test("refuses cleartext http except loopback (the OP's SSL rule)", () => {
    expect(() =>
      clientIdDocument({ ...options(), clientId: "http://borrower.example/clientid.jsonld" }),
    ).toThrow(/https/u);
    const local = clientIdDocument({
      ...options(),
      clientId: "http://localhost:3000/clientid.jsonld",
      redirectUris: ["http://localhost:3000/callback.html"],
    });
    expect(local.client_id).toBe("http://localhost:3000/clientid.jsonld");
  });

  test("refuses a scope without openid+webid (token would not be WebID-bound)", () => {
    expect(() => clientIdDocument({ ...options(), scope: "openid offline_access" })).toThrow(
      /webid/u,
    );
    const minimal = clientIdDocument({ ...options(), scope: "openid webid" });
    expect(minimal.scope).toBe("openid webid");
  });

  test("clientIdDocumentResponse serves application/ld+json with a short cache", async () => {
    const response = clientIdDocumentResponse(clientIdDocument(options()));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/ld+json");
    expect(response.headers.get("cache-control")).toContain("max-age=");
    const body = (await response.json()) as { client_id: string };
    expect(body.client_id).toBe(CLIENT_ID);
  });
});
