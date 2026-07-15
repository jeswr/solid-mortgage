/**
 * Stable Solid-OIDC Client Identifier Documents (solid-client-id skill; decision 0011):
 * every deployed app authenticates as a public client whose `client_id` IS the URL of a
 * served JSON-LD document, so the consent screen shows the app's real name and redirect
 * URIs survive deploys. The document's serving URL must equal its `client_id`
 * byte-for-byte; see the README for the Next.js route-handler recipe.
 */

/** The published Solid-OIDC client-id JSON-LD context (the spec-required entry). */
export const SOLID_OIDC_CONTEXT = "https://www.w3.org/ns/solid/oidc-context.jsonld";

/** Options for {@link clientIdDocument}. */
export interface ClientIdDocumentOptions {
  /** The app name the OP's consent screen shows. */
  name: string;
  /**
   * The URL this document is served from — it becomes the `client_id` and MUST equal the
   * serving URL byte-for-byte (scheme, host, port, path). https, or loopback http for
   * local dev issuers.
   */
  clientId: string;
  /** Every callback URL the app uses (the OP matches `redirect_uri` against this list). */
  redirectUris: readonly string[];
  /** The app's home page (`client_uri`), shown by some consent screens. */
  clientUri?: string;
  /** A logo URL (`logo_uri`), shown by some consent screens. */
  logoUri?: string;
  /** Terms-of-service URL (`tos_uri`). */
  tosUri?: string;
  /** Privacy-policy URL (`policy_uri`). */
  policyUri?: string;
  /** Contact mailto:/https: entries (`contacts`). */
  contacts?: readonly string[];
  /**
   * Space-delimited scope. MUST include `openid` and `webid` (without `webid` the token
   * is not WebID-bound); include `offline_access` for refresh tokens (the default).
   */
  scope?: string;
  /** Default `["authorization_code", "refresh_token"]`. */
  grantTypes?: readonly string[];
}

/** The JSON-LD Client Identifier Document {@link clientIdDocument} produces. */
export interface SolidClientIdDocument {
  "@context": [typeof SOLID_OIDC_CONTEXT];
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  scope: string;
  grant_types: string[];
  response_types: ["code"];
  token_endpoint_auth_method: "none";
  client_uri?: string;
  logo_uri?: string;
  tos_uri?: string;
  policy_uri?: string;
  contacts?: string[];
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function assertAbsoluteHttpUrl(label: string, value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `clientIdDocument: ${label} must be an absolute URL, got ${JSON.stringify(value)}`,
    );
  }
  const hostname = url.host.replace(/:\d+$/, "");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOOPBACK_HOSTS.has(hostname))) {
    // OPs enforce "SSL is required for client_id authentication unless working locally".
    throw new Error(
      `clientIdDocument: ${label} must be https (or loopback http for local dev), got ${value}`,
    );
  }
  return url;
}

/**
 * Build a Solid-OIDC Client Identifier Document (verified template from the
 * solid-client-id skill). Serve the result at EXACTLY {@link ClientIdDocumentOptions.clientId}
 * with content-type `application/ld+json` — see {@link clientIdDocumentResponse} and the
 * README route-handler snippet.
 */
export function clientIdDocument(options: ClientIdDocumentOptions): SolidClientIdDocument {
  if (options.name.trim() === "") {
    throw new Error("clientIdDocument: name must be non-empty (it is the consent-screen label)");
  }
  assertAbsoluteHttpUrl("clientId", options.clientId);
  if (options.redirectUris.length === 0) {
    throw new Error("clientIdDocument: redirectUris must list at least one callback URL");
  }
  for (const uri of options.redirectUris) {
    assertAbsoluteHttpUrl("redirectUris entry", uri);
  }
  const scope = options.scope ?? "openid webid offline_access";
  const scopes = new Set(scope.split(/\s+/u));
  if (!scopes.has("openid") || !scopes.has("webid")) {
    throw new Error(
      "clientIdDocument: scope must include both `openid` and `webid` — without `webid` " +
        "the issued token is not WebID-bound and the pod treats requests as public",
    );
  }

  const document: SolidClientIdDocument = {
    "@context": [SOLID_OIDC_CONTEXT],
    client_id: options.clientId,
    client_name: options.name,
    redirect_uris: [...options.redirectUris],
    scope,
    grant_types: [...(options.grantTypes ?? ["authorization_code", "refresh_token"])],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
  if (options.clientUri !== undefined) document.client_uri = options.clientUri;
  if (options.logoUri !== undefined) document.logo_uri = options.logoUri;
  if (options.tosUri !== undefined) document.tos_uri = options.tosUri;
  if (options.policyUri !== undefined) document.policy_uri = options.policyUri;
  if (options.contacts !== undefined) document.contacts = [...options.contacts];
  return document;
}

/**
 * Wrap a Client Identifier Document as the HTTP response a route handler returns: the
 * spec-required `application/ld+json` content-type plus a short cache so edits propagate
 * without a re-fetch on every login.
 */
export function clientIdDocumentResponse(document: SolidClientIdDocument): Response {
  return new Response(JSON.stringify(document, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/ld+json",
      "cache-control": "public, max-age=300",
    },
  });
}
