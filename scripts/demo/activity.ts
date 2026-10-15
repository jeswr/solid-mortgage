/**
 * The demo's pod ACTIVITY LOG: every request that reaches the borrower pod is
 * recorded here and streamed to the in-page sidebar (`/__demo/events`).
 *
 * The pod is reached ONLY through `startPodRecorder`'s loopback proxy (the pod's
 * own `baseUrl` IS the proxy origin, so every resource IRI the apps see routes
 * through it). Nothing is sampled or reconstructed: an entry exists exactly when
 * the pod answered a request, and access-control entries are derived by parsing
 * the `.acl` document the request actually carried.
 */
import { EventEmitter } from "node:events";
import { createServer, request as httpRequest, type IncomingMessage, type Server } from "node:http";
import { Parser, type Quad } from "n3";

const ACL = "http://www.w3.org/ns/auth/acl#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const FOAF_AGENT = "http://xmlns.com/foaf/0.1/Agent";
const AUTHENTICATED_AGENT = `${ACL}AuthenticatedAgent`;

export type ActivityKind = "read" | "write" | "delete" | "access" | "auth" | "info";

export interface AccessRule {
  /** Who: a friendly label (falls back to the agent IRI). */
  readonly who: string;
  readonly agent: string;
  /** Read / Write / Append / Control. */
  readonly modes: readonly string[];
  /** `resource` (acl:accessTo) or `container and children` (acl:default). */
  readonly scope: string;
}

export interface AccessChange {
  readonly resource: string;
  readonly granted: readonly AccessRule[];
  readonly revoked: readonly AccessRule[];
  readonly rules: readonly AccessRule[];
}

export interface ActivityEvent {
  readonly id: number;
  readonly at: string;
  readonly kind: ActivityKind;
  /** HTTP method for pod requests. */
  readonly method?: string;
  /** Pod-relative path (`/mortgage/application.ttl`). */
  readonly path?: string;
  readonly status?: number;
  /** Who made the request, as a person would describe it. */
  readonly actor: string;
  /** Which demo app it came from, when known. */
  readonly app?: string;
  readonly summary: string;
  readonly access?: AccessChange;
}

/** A WebID → label directory (personas, service identities, grantable parties). */
export type AgentDirectory = ReadonlyMap<string, string>;

const MAX_EVENTS = 3000;

export class ActivityLog extends EventEmitter {
  private readonly events: ActivityEvent[] = [];
  private nextId = 1;

  record(event: Omit<ActivityEvent, "id" | "at">): ActivityEvent {
    const full: ActivityEvent = { id: this.nextId++, at: new Date().toISOString(), ...event };
    this.events.push(full);
    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);
    this.emit("event", full);
    return full;
  }

  all(): readonly ActivityEvent[] {
    return this.events;
  }

  clear(): void {
    this.events.length = 0;
    this.emit("cleared");
  }
}

function localName(iri: string): string {
  return iri.slice(Math.max(iri.lastIndexOf("#"), iri.lastIndexOf("/")) + 1);
}

/** Parse a WAC document into flat, display-ready rules. Unparseable bodies yield `undefined`. */
export function parseAclRules(
  body: string,
  baseIri: string,
  directory: AgentDirectory,
): AccessRule[] | undefined {
  let quads: Quad[];
  try {
    quads = new Parser({ baseIRI: baseIri }).parse(body);
  } catch {
    return undefined;
  }
  const bySubject = new Map<string, Quad[]>();
  for (const quad of quads) {
    const list = bySubject.get(quad.subject.value) ?? [];
    list.push(quad);
    bySubject.set(quad.subject.value, list);
  }
  const rules: AccessRule[] = [];
  for (const statements of bySubject.values()) {
    const isAuthorization = statements.some(
      (q) => q.predicate.value === RDF_TYPE && q.object.value === `${ACL}Authorization`,
    );
    if (!isAuthorization) continue;
    const modes = statements
      .filter((q) => q.predicate.value === `${ACL}mode`)
      .map((q) => localName(q.object.value))
      .sort();
    const scope = statements.some((q) => q.predicate.value === `${ACL}default`)
      ? "this container and everything in it"
      : "this resource";
    const agents = statements
      .filter((q) => q.predicate.value === `${ACL}agent`)
      .map((q) => q.object.value);
    for (const q of statements.filter((s) => s.predicate.value === `${ACL}agentClass`)) {
      agents.push(q.object.value);
    }
    for (const agent of agents) {
      rules.push({ agent, modes, scope, who: describeAgent(agent, directory) });
    }
  }
  return rules;
}

export function describeAgent(agent: string, directory: AgentDirectory): string {
  if (agent === FOAF_AGENT) return "Everyone (public)";
  if (agent === AUTHENTICATED_AGENT) return "Any signed-in user";
  return directory.get(agent) ?? agent;
}

const ruleKey = (rule: AccessRule) => `${rule.agent} ${rule.scope} ${rule.modes.join(",")}`;

function diffRules(before: readonly AccessRule[], after: readonly AccessRule[]) {
  const beforeKeys = new Set(before.map(ruleKey));
  const afterKeys = new Set(after.map(ruleKey));
  return {
    granted: after.filter((rule) => !beforeKeys.has(ruleKey(rule))),
    revoked: before.filter((rule) => !afterKeys.has(ruleKey(rule))),
  };
}

/** The WebID inside a `DPoP`/`Bearer` access token, for labelling only (never trusted). */
function tokenWebId(authorization: string | undefined): string | undefined {
  const token = authorization?.match(/^(?:DPoP|Bearer)\s+(\S+)$/i)?.[1];
  const payload = token?.split(".")[1];
  if (payload === undefined) return undefined;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      webid?: unknown;
    };
    return typeof claims.webid === "string" ? claims.webid : undefined;
  } catch {
    return undefined;
  }
}

const READABLE_PATHS: readonly [RegExp, string][] = [
  [/\/profile\/card$/, "WebID profile"],
  [/\/status\//, "credential status list"],
  [/\/issuers?\//, "issuer profile"],
  [/\/credentials?\/.*(employment|income)/, "employment and income credential"],
  [/\/credentials?\/.*asset/, "asset verification credential"],
  [/\/credentials?\/.*credit/, "credit-score credential"],
  [/\/credentials?\/.*apprais/, "appraisal credential"],
  [/\/credentials?\/.*title/, "title search credential"],
  [/anchor/, "issuer-signed value encoding (for zero-knowledge proofs)"],
  [/receipt|ledger|consent/, "consent records"],
  [/closing/, "closing record"],
  [/estimate/, "illustrative loan terms"],
  [/application/, "loan application"],
  [/decision/, "underwriting decision record"],
  [/underwriting|aus/, "AUS findings"],
  [/borrower|profile/, "borrower profile"],
];

/** Labels for documents that describe an issuer, not Alex: no possessive in sentences. */
const NOT_ALEXS = new Set(["credential status list", "issuer profile"]);

/** A plain-English name for a pod path (falls back to the file name). */
export function describePath(path: string): string {
  const clean = path.replace(/\.acl$/, "");
  for (const [pattern, label] of READABLE_PATHS) {
    if (pattern.test(clean.toLowerCase())) return label;
  }
  if (clean.endsWith("/")) return `folder ${clean}`;
  return localName(clean) || clean;
}

/** The object of a log sentence: "Alex's loan application", "the issuer profile". */
function objectPhrase(path: string, subject: string): string {
  const label = describePath(path);
  const owned = subject !== "Alex" && !NOT_ALEXS.has(label) && !label.startsWith("folder ");
  return owned ? `Alex's ${label}` : `the ${label}`;
}

/** The subject of a log sentence: who made the request, as a short name. */
function subjectOf(who: { actor: string; app?: string }): string {
  if (who.actor.startsWith("Alex Rivera")) return "Alex";
  if (who.app !== undefined && who.actor === `${who.app} server`) return who.app;
  if (who.actor === "Demo server") return "The demo server";
  return who.actor;
}

const modeText = (modes: readonly string[]) =>
  `${modes.map((mode) => mode.toLowerCase()).join(" and ")} access`;

export interface PodRecorderOptions {
  /** Port the pod proxy listens on (the pod's public `baseUrl` origin). */
  readonly listenPort: number;
  /** Interface to listen on (default 127.0.0.1). */
  readonly bindHost?: string;
  /** Port the real (in-memory) pod listens on. */
  readonly podPort: number;
  readonly log: ActivityLog;
  readonly directory: AgentDirectory;
  /** Which demo app has an API request in flight right now (for anonymous server calls). */
  readonly attributeServerCall: () => string | undefined;
  /** The demo apps' browser origins → app name (browser-side pod IO, e.g. the vault's). */
  readonly browserOrigins: ReadonlyMap<string, string>;
  /** Called with `true` while seeding/reset, so the log stays readable. */
  readonly isMuted: () => boolean;
}

function readBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

/**
 * Start the recording proxy in front of the pod. Requests are forwarded byte for byte;
 * the proxy only observes.
 */
export async function startPodRecorder(options: PodRecorderOptions): Promise<Server> {
  const { log, directory } = options;
  /** Last observed rules per ACL document, so a PUT can be described as a change. */
  const knownAcls = new Map<string, AccessRule[]>();
  const podOrigin = `http://127.0.0.1:${options.listenPort}`;

  const server = createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const path = request.url ?? "/";
    const body = method === "GET" || method === "HEAD" ? Buffer.alloc(0) : await readBody(request);

    const upstream = httpRequest(
      {
        host: "127.0.0.1",
        port: options.podPort,
        method,
        path,
        headers: request.headers,
      },
      (podResponse) => {
        const chunks: Buffer[] = [];
        podResponse.on("data", (chunk: Buffer) => chunks.push(chunk));
        podResponse.on("end", () => {
          const responseBody = Buffer.concat(chunks);
          response.writeHead(podResponse.statusCode ?? 502, podResponse.headers);
          response.end(responseBody);
          try {
            observe(request, method, path, body, podResponse.statusCode ?? 502, responseBody);
          } catch (error) {
            console.error("[demo] could not record pod activity:", error);
          }
        });
      },
    );
    upstream.on("error", (error) => {
      response.writeHead(502, { "content-type": "text/plain" });
      response.end(`pod unavailable: ${error.message}`);
    });
    upstream.end(body);
  });

  function actorOf(request: IncomingMessage): { actor: string; app?: string } {
    const webid = tokenWebId(request.headers.authorization);
    const origin = request.headers.origin;
    const browserApp = origin === undefined ? undefined : options.browserOrigins.get(origin);
    if (browserApp !== undefined) {
      return { actor: "Alex Rivera (in the browser)", app: browserApp };
    }
    const app = options.attributeServerCall();
    if (webid !== undefined) {
      return { actor: directory.get(webid) ?? webid, ...(app ? { app } : {}) };
    }
    return {
      actor: app ? `${app} server` : "Demo server",
      ...(app ? { app } : {}),
    };
  }

  function observe(
    request: IncomingMessage,
    method: string,
    path: string,
    body: Buffer,
    status: number,
    responseBody: Buffer,
  ): void {
    if (method === "OPTIONS" || method === "HEAD") return;
    const pathname = new URL(path, podOrigin).pathname;
    const isAcl = pathname.endsWith(".acl");
    // 304: a conditional read the pod answered from the client's cached copy.
    const ok = (status >= 200 && status < 300) || status === 304;

    // Keep the ACL cache current even while muted (seeding writes the baseline rules).
    if (isAcl && ok && method === "GET") {
      const rules = parseAclRules(
        responseBody.toString("utf8"),
        `${podOrigin}${pathname}`,
        directory,
      );
      if (rules !== undefined) knownAcls.set(pathname, rules);
    }
    if (isAcl && ok && method === "PUT") {
      const rules =
        parseAclRules(body.toString("utf8"), `${podOrigin}${pathname}`, directory) ?? [];
      const before = knownAcls.get(pathname) ?? [];
      const created = !knownAcls.has(pathname) || before.length === 0;
      knownAcls.set(pathname, rules);
      if (options.isMuted()) return;
      const { granted, revoked } = diffRules(before, rules);
      const resource = pathname.replace(/\.acl$/, "");
      const parts: string[] = [];
      for (const rule of granted) parts.push(`granted ${rule.who} ${modeText(rule.modes)}`);
      for (const rule of revoked) parts.push(`removed ${rule.who}'s ${modeText(rule.modes)}`);
      const change = parts.length > 0 ? parts.join("; ") : "no net change";
      const who = actorOf(request);
      const subject = subjectOf(who);
      log.record({
        kind: "access",
        method,
        path: pathname,
        status,
        ...who,
        summary: created
          ? `${subject} set permissions on ${objectPhrase(resource, subject)}: ${change}`
          : `${subject} changed permissions on ${objectPhrase(resource, subject)}: ${change}`,
        access: { resource, granted, revoked, rules },
      });
      return;
    }
    if (isAcl && ok && method === "DELETE") {
      const before = knownAcls.get(pathname) ?? [];
      knownAcls.delete(pathname);
      if (options.isMuted()) return;
      const resource = pathname.replace(/\.acl$/, "");
      const who = actorOf(request);
      const subject = subjectOf(who);
      log.record({
        kind: "access",
        method,
        path: pathname,
        status,
        ...who,
        summary: `${subject} removed the separate permissions on ${objectPhrase(resource, subject)}: it now follows its folder's permissions`,
        access: { resource, granted: [], revoked: before, rules: [] },
      });
      return;
    }
    if (options.isMuted()) return;

    const who = actorOf(request);
    const subject = subjectOf(who);
    const what = objectPhrase(pathname, subject);
    const outcome = ok
      ? ""
      : status === 404
        ? " (not found)"
        : status === 401 || status === 403
          ? ` (refused, ${status})`
          : ` (failed, ${status})`;
    if (method === "GET") {
      log.record({
        kind: "read",
        method,
        path: pathname,
        status,
        ...who,
        summary: isAcl
          ? `${subject} checked who can access ${what}${outcome}`
          : `${subject} read ${what}${outcome}`,
      });
    } else if (method === "DELETE") {
      log.record({
        kind: "delete",
        method,
        path: pathname,
        status,
        ...who,
        summary: `${subject} deleted ${what}${outcome}`,
      });
    } else {
      const verb = method === "PATCH" ? "updated" : method === "POST" ? "added to" : "saved";
      log.record({
        kind: "write",
        method,
        path: pathname,
        status,
        ...who,
        summary: `${subject} ${verb} ${what}${outcome}`,
      });
    }
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.listenPort, options.bindHost ?? "127.0.0.1", resolve);
  });
  return server;
}
