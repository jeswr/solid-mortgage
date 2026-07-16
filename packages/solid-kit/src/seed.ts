/**
 * Minimal pod seeding for the dev/test Solid server (sm-4).
 *
 * Fixture bodies here are PRE-AUTHORED RDF strings, written with plain `fetch` + strict
 * `If-None-Match: *` creates. The workspace's strict RDF discipline (`@solid/object` +
 * `@rdfjs/wrapper` typed accessors, no hand-built triples) governs APP code operating on live
 * pod data; deterministic test fixtures are authored Turtle by design, and SHACL validation
 * of fixture content arrives with the sm-19 data-model shapes.
 */

const TURTLE = "text/turtle";

export interface ResourceFixture {
  /** Pod-root-relative resource path. Must start with `/` and must not be an `.acl` path. */
  path: string;
  /** Pre-authored resource body (Turtle unless `contentType` says otherwise). */
  body: string;
  /** Defaults to `text/turtle`. */
  contentType?: string;
  /**
   * Also PUT a WAC ACL at `${path}.acl` granting `acl:Read` to `foaf:Agent` (anyone) while
   * keeping full owner control. Requires `ownerWebid` — a resource ACL REPLACES the inherited
   * one, so omitting the owner clause would lock the owner out of its own resource.
   */
  publicRead?: boolean;
}

export interface SeedPodOptions {
  /** Fetch used for the writes; pass an authenticated fetch when the server verifies OIDC. */
  fetch?: typeof fetch;
  /** Owner WebID, required by `publicRead` ACLs. */
  ownerWebid?: string;
}

/** Reject IRI references that would break out of a Turtle `<...>` token. */
function assertIriReference(value: string, label: string): void {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: control chars are exactly what an IRI reference must not contain
  if (value.length === 0 || /[\u0000-\u0020<>"{}|^`\\]/.test(value)) {
    throw new Error(`${label} is not a valid IRI reference: ${JSON.stringify(value)}`);
  }
}

function assertFixturePath(path: string): void {
  if (!path.startsWith("/")) {
    throw new Error(`fixture path must be pod-root-relative (start with "/"): ${path}`);
  }
  if (path.endsWith(".acl")) {
    throw new Error(
      `fixture path must not target an ACL document directly (use publicRead): ${path}`,
    );
  }
  assertIriReference(path, "fixture path");
}

function escapeTurtleLiteral(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Pre-authored WAC ACL: public (unauthenticated) read of one resource, full owner control.
 * Root-relative IRIs resolve against the ACL document's own base, so the same template works
 * on any pod origin.
 */
export function publicReadAcl(resourcePath: string, ownerWebid: string): string {
  assertFixturePath(resourcePath);
  assertIriReference(ownerWebid, "ownerWebid");
  return `@prefix acl: <http://www.w3.org/ns/auth/acl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<#public>
    a acl:Authorization ;
    acl:accessTo <${resourcePath}> ;
    acl:agentClass foaf:Agent ;
    acl:mode acl:Read .

<#owner>
    a acl:Authorization ;
    acl:accessTo <${resourcePath}> ;
    acl:agent <${ownerWebid}> ;
    acl:mode acl:Read, acl:Write, acl:Control .
`;
}

/** One agent entry of {@link containerGrantAcl}. */
export interface ContainerGrantAgent {
  webid: string;
  /** Also grant `acl:Control` (the agent manages member ACLs). Default false. */
  control?: boolean;
}

export interface ContainerGrantAclOptions {
  /** Pod-root-relative container path (e.g. `/mortgage/`). */
  containerPath: string;
  /** Pod owner — always retains full control (a written ACL replaces implicit rights). */
  ownerWebid: string;
  /** Agents granted Read+Write (optionally Control) on the container AND its members. */
  agents: readonly ContainerGrantAgent[];
}

/**
 * Pre-authored WAC ACL for a container: full owner control plus per-agent
 * `acl:accessTo` + `acl:default` grants — the fixture shape of the sm-28 wallet
 * grant (borrower authorises an app's service identity over one container).
 * Root-relative IRIs resolve against the ACL document's own base.
 */
export function containerGrantAcl(options: ContainerGrantAclOptions): string {
  if (!options.containerPath.startsWith("/") || !options.containerPath.endsWith("/")) {
    throw new Error(
      `containerPath must be a pod-root-relative container path: ${options.containerPath}`,
    );
  }
  assertIriReference(options.containerPath, "containerPath");
  assertIriReference(options.ownerWebid, "ownerWebid");
  const rules = options.agents
    .map((agent, index) => {
      assertIriReference(agent.webid, `agents[${index}].webid`);
      const control = agent.control === true ? ", acl:Control" : "";
      return `
<#grant-${index}>
    a acl:Authorization ;
    acl:accessTo <${options.containerPath}> ;
    acl:default <${options.containerPath}> ;
    acl:agent <${agent.webid}> ;
    acl:mode acl:Read, acl:Write${control} .
`;
    })
    .join("");
  return `@prefix acl: <http://www.w3.org/ns/auth/acl#> .

<#owner>
    a acl:Authorization ;
    acl:accessTo <${options.containerPath}> ;
    acl:default <${options.containerPath}> ;
    acl:agent <${options.ownerWebid}> ;
    acl:mode acl:Read, acl:Write, acl:Control .
${rules}`;
}

export interface ProfileCardFixtureOptions {
  /** The WebID this card describes, e.g. `${baseUrl}/profile/card#me`. */
  webid: string;
  /** `foaf:name` — bare profiles make correct apps look broken. */
  name: string;
  /** `pim:storage` pod root. Defaults to the WebID's origin + `/`. */
  storage?: string;
  /** `solid:oidcIssuer`, when the profile must bind to an issuer. */
  oidcIssuer?: string;
  /** Where to store the card. Defaults to `/profile/card`. */
  path?: string;
  /** Public-read the card (WebIDs are normally world-readable). Defaults to true. */
  publicRead?: boolean;
}

/** A seeded WebID profile document with the data tests need (`foaf:name`, `pim:storage`). */
export function profileCardFixture(options: ProfileCardFixtureOptions): ResourceFixture {
  const path = options.path ?? "/profile/card";
  const storage = options.storage ?? `${new URL(options.webid).origin}/`;
  assertIriReference(options.webid, "webid");
  assertIriReference(storage, "storage");
  if (options.oidcIssuer !== undefined) assertIriReference(options.oidcIssuer, "oidcIssuer");
  const issuerLine =
    options.oidcIssuer === undefined ? "" : `    solid:oidcIssuer <${options.oidcIssuer}> ;\n`;
  const body = `@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix pim: <http://www.w3.org/ns/pim/space#> .
@prefix solid: <http://www.w3.org/ns/solid/terms#> .

<${options.webid}>
    a foaf:Person ;
    foaf:name "${escapeTurtleLiteral(options.name)}" ;
${issuerLine}    pim:storage <${storage}> .
`;
  return { path, body, publicRead: options.publicRead ?? true };
}

async function createOnce(
  fetchImpl: typeof fetch,
  url: string,
  contentType: string,
  body: string,
): Promise<void> {
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      // Strict create: seeding an already-populated pod is a harness bug, not a no-op.
      "if-none-match": "*",
    },
    body,
  });
  if (response.status === 412) {
    throw new Error(`seed target already exists (pods must be seeded exactly once): ${url}`);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`seed PUT ${url} failed: ${response.status} ${detail}`.trim());
  }
}

/**
 * Seed a pod with fixture resources (and optional public-read WAC ACLs) over plain HTTP.
 * `baseUrl` is the pod origin; every fixture path resolves against it.
 */
export async function seedPod(
  baseUrl: string,
  fixtures: readonly ResourceFixture[],
  options: SeedPodOptions = {},
): Promise<void> {
  const fetchImpl = options.fetch ?? fetch;
  const origin = new URL(baseUrl).origin;
  for (const fixture of fixtures) {
    assertFixturePath(fixture.path);
    await createOnce(
      fetchImpl,
      `${origin}${fixture.path}`,
      fixture.contentType ?? TURTLE,
      fixture.body,
    );
    if (fixture.publicRead === true) {
      if (options.ownerWebid === undefined) {
        throw new Error(`publicRead fixture ${fixture.path} requires options.ownerWebid`);
      }
      await createOnce(
        fetchImpl,
        `${origin}${fixture.path}.acl`,
        TURTLE,
        publicReadAcl(fixture.path, options.ownerWebid),
      );
    }
  }
}
