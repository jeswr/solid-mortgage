<!-- AUTHORED-BY Claude Fable 5 -->

# @mortgage/solid-kit

Auth, pod IO, and dev/test-server plumbing shared by every app in the showcase.

| Subpath | Runs in | Contents |
|---|---|---|
| `@mortgage/solid-kit/auth` | browser | `createAuthClient` (real Solid-OIDC), `demoLogin` (Mode-1 simulated), `clientIdDocument` helpers |
| `@mortgage/solid-kit/auth/api` | server only | `verifyApiRequest` + `createApiVerifier` (DPoP-verified API routes, decision 0012), `createNonceStore` (VP-POST challenges) |
| `@mortgage/solid-kit/testing` | tests only | sparq dev/test pod harness + seeding, `startDevOidcIssuer` (login-capable dev OP), storage test doubles |

## Auth clients

Both entry points return the same `AuthSession` shape; they differ only in
`session.simulated`, which the UI **must** surface (decision 0011).

```ts
import { createAuthClient } from "@mortgage/solid-kit/auth";

const client = createAuthClient({
  callbackUri: new URL("/callback.html", location.href).toString(),
  clientId: new URL("/clientid.jsonld", location.href).toString(), // stable client identity
  authFlow: { getCode }, // the popup driver (e.g. <authorization-code-flow>)
});
await client.restore();          // silent, fail-closed
await client.login(webId);       // interactive; issuer resolved from the WebID profile
await client.authFetch(podUrl);  // DPoP-bound + SSRF-guarded
```

```ts
import { demoLogin, SIMULATED_LOGIN_DISCLOSURE } from "@mortgage/solid-kit/auth";

const session = demoLogin({
  webId: persona.webId,
  podBaseUrl: persona.pod,
  acknowledgeSimulated: SIMULATED_LOGIN_DISCLOSURE, // constructor refuses anything else
});
session.simulated; // true — render the disclosure
```

## API-route verification (decision 0012 rail 1)

```ts
// app/api/present/route.ts — Next.js App Router
import { createApiVerifier, createNonceStore, verifyApiRequest } from "@mortgage/solid-kit/auth/api";

// Module scope: ONE verifier per process (JWKS + jti replay store live on it).
const verifier = createApiVerifier({
  trustedIssuers: [process.env.TRUSTED_ISSUERS ?? ""],
  trustForwardedHeaders: true, // Vercel terminates TLS; request.url is internal
});
const nonces = createNonceStore();

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyApiRequest(request, { verifier });
  if (auth instanceof Response) return auth; // 401/403/429/503 challenge
  const { nonce, presentation } = await request.json();
  if (!nonces.consume(auth.webid, nonce)) {
    return Response.json({ error: "invalid_nonce" }, { status: 400 });
  }
  // Holder binding (decision 0012): auth.webid === presentation.credentialSubject.id
  return Response.json({ webid: auth.webid });
}
```

## Client Identifier Document route (solid-client-id pattern)

Serve the document at a URL that **byte-equals** its `client_id`. Do not put a
`.jsonld` file in `public/` (`next dev` 404s it) — use a route handler:

```ts
// src/app/clientid.jsonld/route.ts — resolves to /clientid.jsonld
import { clientIdDocument, clientIdDocumentResponse } from "@mortgage/solid-kit/auth";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const clientId = new URL("/clientid.jsonld", request.url).toString(); // URL === client_id
  return clientIdDocumentResponse(
    clientIdDocument({
      name: "Borrower Wallet (concept demonstration)",
      clientId,
      redirectUris: [new URL("/callback.html", request.url).toString()],
      clientUri: new URL("/", request.url).toString(),
    }),
  );
}
```

## Dev/test harness

`startSolidServer` boots per-identity in-memory sparq pods on dynamic ports
(fixed-owner by default; `oidc: true` verifies real DPoP-bound tokens). The harness's
minimal per-account issuer serves discovery/JWKS only; `startDevOidcIssuer` (from
`/testing`) additionally hosts `/authorize` + `/token`, so `createAuthClient` completes
a real login in tests. DPoP proofs are single-use (jti replay protection) — never reuse
captured auth headers.
