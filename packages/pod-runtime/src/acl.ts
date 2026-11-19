// AUTHORED-BY Claude Opus 5.5
/**
 * Web Access Control documents, through the @solid/object wrappers (`AclResource`,
 * `Authorization`) and n3.Writer. Used three ways:
 *
 * - by the host, to diff the rules an ACL write adds or removes (`PodEvent.acl`) and to refuse a
 *   write that would take `acl:Control` away from the pod owner;
 * - by seed authors, to build ACL documents (`aclDocument`);
 * - by apps that manage access (the wallet), through `grantAccess` / `revokeAccess`, which keep
 *   inherited rules, keep the owner's rule and write the whole document with a precondition.
 */
import type { AccessMode, AccessRule } from "@mortgage/demo-kit/contracts";
import type { DatasetCore, Quad_Subject } from "@rdfjs/types";
import { AclResource, Authorization } from "@solid/object";
import { DataFactory, Store } from "n3";
import { copyToStore, parseToStore, toTurtle } from "./rdf.js";

export const ACL = "http://www.w3.org/ns/auth/acl#";
/** `acl:agentClass foaf:Agent`: anyone, signed in or not. */
export const PUBLIC = "http://xmlns.com/foaf/0.1/Agent";
/** `acl:agentClass acl:AuthenticatedAgent`: anyone signed in. */
export const AUTHENTICATED = `${ACL}AuthenticatedAgent`;
const MODES: readonly AccessMode[] = ["Read", "Write", "Append", "Control"];
const CLASSES = new Set([PUBLIC, AUTHENTICATED]);

/** True for an ACL resource URL or path (the server's convention: `<resource>.acl`, `<container>/.acl`). */
export function isAclPath(pathOrUrl: string): boolean {
  return new URL(pathOrUrl, "https://pod.invalid/").pathname.endsWith(".acl");
}

/** The resource an ACL URL governs: `/c/.acl` → `/c/`, `/c/x.acl` → `/c/x`. */
export function aclTarget(aclUrl: string): string {
  return aclUrl.slice(0, -".acl".length);
}

/** The ACL URL of a resource or container (the server's convention, also advertised in `Link: rel="acl"`). */
export function aclUrlOf(resourceUrl: string): string {
  return `${resourceUrl}.acl`;
}

function modeName(iri: string): AccessMode | undefined {
  return MODES.find((mode) => `${ACL}${mode}` === iri);
}

function authorizations(dataset: DatasetCore): Authorization[] {
  return [...new AclResource(dataset, DataFactory).authorizations];
}

/**
 * Flatten an ACL dataset into `AccessRule`s: one per (agent or agent class) × (accessTo or default
 * target) of each authorisation. `resource` is the target's path relative to `podBase`
 * (`/documents/`), or the full IRI when it lies outside the pod.
 */
export function rulesOf(dataset: DatasetCore, podBase: string): AccessRule[] {
  const rules: AccessRule[] = [];
  const relative = (iri: string) =>
    iri.startsWith(podBase) ? `/${iri.slice(podBase.length)}` : iri;
  for (const auth of authorizations(dataset)) {
    const modes = [...auth.mode]
      .map(modeName)
      .filter((m): m is AccessMode => m !== undefined)
      .sort((a, b) => MODES.indexOf(a) - MODES.indexOf(b));
    const agents = [...auth.agent, ...[...auth.agentClass].filter((c) => CLASSES.has(c))];
    const targets: Array<[string, boolean]> = [];
    if (auth.accessTo !== undefined) targets.push([auth.accessTo, false]);
    if (auth.default !== undefined) targets.push([auth.default, true]);
    for (const agent of agents) {
      for (const [target, inherited] of targets) {
        rules.push({ agent, inherited, modes, resource: relative(target) });
      }
    }
  }
  return rules;
}

const ruleKey = (rule: AccessRule) => JSON.stringify([rule.agent, rule.resource, rule.inherited]);

/** Merge rules with the same agent/resource/inherited into one rule with the union of modes. */
function mergeRules(rules: AccessRule[]): Map<string, AccessRule> {
  const merged = new Map<string, AccessRule>();
  for (const rule of rules) {
    const key = ruleKey(rule);
    const existing = merged.get(key);
    const modes = new Set([...(existing?.modes ?? []), ...rule.modes]);
    merged.set(key, { ...rule, modes: MODES.filter((m) => modes.has(m)) });
  }
  return merged;
}

/** What changed between two rule sets: modes added (`granted`) and modes removed (`revoked`). */
export function diffRules(
  before: AccessRule[],
  after: AccessRule[],
): { granted: AccessRule[]; revoked: AccessRule[] } {
  const old = mergeRules(before);
  const now = mergeRules(after);
  const granted: AccessRule[] = [];
  const revoked: AccessRule[] = [];
  for (const [key, rule] of now) {
    const added = rule.modes.filter((m) => !(old.get(key)?.modes ?? []).includes(m));
    if (added.length > 0) granted.push({ ...rule, modes: added });
  }
  for (const [key, rule] of old) {
    const removed = rule.modes.filter((m) => !(now.get(key)?.modes ?? []).includes(m));
    if (removed.length > 0) revoked.push({ ...rule, modes: removed });
  }
  return { granted, revoked };
}

/**
 * True when `owner` holds `acl:Control` over `target` in this ACL dataset, through an explicit
 * `acl:agent` rule: `acl:accessTo` the target, and for a container also `acl:default` it.
 */
export function ownerKeepsControl(dataset: DatasetCore, owner: string, target: string): boolean {
  const rules = authorizations(dataset).filter(
    (a) => a.agent.has(owner) && a.mode.has(`${ACL}Control`),
  );
  const own = rules.some((a) => a.accessTo === target);
  const members = !target.endsWith("/") || rules.some((a) => a.default === target);
  return own && members;
}

/** Find the authorisation that permits `agent` a `mode` on `resource`, as seen from an ACL found at `level`. */
export function matchingAuthorization(
  dataset: DatasetCore,
  input: { agent: string | null; modes: AccessMode[]; target: string; inherited: boolean },
): string | undefined {
  for (const auth of authorizations(dataset)) {
    const applies = input.inherited
      ? auth.default === input.target
      : auth.accessTo === input.target;
    if (!applies) continue;
    const who =
      auth.agentClass.has(PUBLIC) ||
      (input.agent !== null && (auth.agent.has(input.agent) || auth.agentClass.has(AUTHENTICATED)));
    if (!who) continue;
    if (!input.modes.some((m) => auth.mode.has(`${ACL}${m}`))) continue;
    if (auth.termType === "NamedNode") return auth.value;
  }
  return undefined;
}

export interface GrantSpec {
  /** A WebID, `PUBLIC` or `AUTHENTICATED`. */
  agent: string;
  modes: AccessMode[];
}

interface Scope {
  accessTo?: string;
  default?: string;
}

/** The usual scope for `target`: the resource itself, and for a container also its members. */
function scopeOf(target: string): Scope {
  return target.endsWith("/") ? { accessTo: target, default: target } : { accessTo: target };
}

function addAuthorization(store: Store, node: Quad_Subject, scope: Scope, spec: GrantSpec): void {
  const auth = new Authorization(node, store, DataFactory);
  auth.type.add(`${ACL}Authorization`);
  if (scope.accessTo !== undefined) auth.accessTo = scope.accessTo;
  if (scope.default !== undefined) auth.default = scope.default;
  if (CLASSES.has(spec.agent)) auth.agentClass.add(spec.agent);
  else auth.agent.add(spec.agent);
  for (const mode of spec.modes) auth.mode.add(`${ACL}${mode}`);
}

function freeFragment(store: Store, aclUrl: string, stem: string): Quad_Subject {
  for (let i = 1; ; i += 1) {
    const node = DataFactory.namedNode(`${aclUrl}#${stem}-${i}`);
    if (store.countQuads(node, null, null, null) === 0) return node;
  }
}

/**
 * Build an ACL document for `target` (a resource, or a container when it ends in `/`): the owner
 * gets Read, Write and Control, each grant one authorisation. Container rules also apply to
 * members (`acl:default`). Returns Turtle written by n3.Writer.
 */
export async function aclDocument(input: {
  aclUrl: string;
  owner: string;
  grants?: GrantSpec[];
}): Promise<string> {
  const scope = scopeOf(aclTarget(input.aclUrl));
  const store = new Store();
  addAuthorization(store, DataFactory.namedNode(`${input.aclUrl}#owner`), scope, {
    agent: input.owner,
    modes: ["Read", "Write", "Control"],
  });
  for (const grant of input.grants ?? []) {
    addAuthorization(store, freeFragment(store, input.aclUrl, "grant"), scope, grant);
  }
  return toTurtle(store, { acl: ACL });
}

/** Remove every quad about an authorisation node. */
function dropNode(store: Store, node: Quad_Subject): void {
  store.removeQuads(store.getQuads(node, null, null, null));
}

interface FetchedAcl {
  aclUrl: string;
  store: Store;
  etag: string | null;
  exists: boolean;
}

function linkTarget(response: Response, rel: string): string | undefined {
  const header = response.headers.get("link");
  if (header === null) return undefined;
  for (const part of header.split(",")) {
    const match = /<([^>]*)>\s*;\s*rel="?([^";]+)"?/.exec(part.trim());
    if (match?.[2] === rel && match[1] !== undefined)
      return new URL(match[1], response.url || undefined).href;
  }
  return undefined;
}

async function readAcl(fetchFn: typeof fetch, resourceUrl: string): Promise<FetchedAcl> {
  const head = await fetchFn(resourceUrl, { method: "HEAD" });
  const aclUrl = linkTarget(head, "acl") ?? aclUrlOf(resourceUrl);
  const response = await fetchFn(aclUrl, { headers: { accept: "text/turtle" } });
  if (response.status === 404) return { aclUrl, etag: null, exists: false, store: copyToStore([]) };
  if (!response.ok) throw new Error(`cannot read ${aclUrl}: HTTP ${response.status}`);
  const store = await parseToStore(
    await response.text(),
    response.headers.get("content-type") ?? "text/turtle",
    aclUrl,
  );
  return { aclUrl, etag: response.headers.get("etag"), exists: true, store };
}

function parentContainer(url: string): string | undefined {
  const u = new URL(url);
  const trimmed = u.pathname.endsWith("/") ? u.pathname.slice(0, -1) : u.pathname;
  if (trimmed === "") return undefined;
  u.pathname = trimmed.slice(0, trimmed.lastIndexOf("/") + 1);
  return u.href;
}

/**
 * When a resource has no ACL of its own, its effective rules are the `acl:default` rules of the
 * nearest ancestor ACL. Copy them onto `target` so that creating its own ACL revokes nothing.
 */
async function inheritedInto(
  fetchFn: typeof fetch,
  store: Store,
  aclUrl: string,
  target: string,
  podRoot: string,
): Promise<void> {
  for (
    let container = parentContainer(target);
    container?.startsWith(podRoot);
    container = parentContainer(container)
  ) {
    const ancestor = await readAcl(fetchFn, container);
    if (!ancestor.exists) continue;
    for (const auth of authorizations(ancestor.store)) {
      if (auth.default !== container) continue;
      const modes = [...auth.mode].map(modeName).filter((m): m is AccessMode => m !== undefined);
      for (const agent of [...auth.agent, ...[...auth.agentClass].filter((c) => CLASSES.has(c))]) {
        addAuthorization(store, freeFragment(store, aclUrl, "inherited"), scopeOf(target), {
          agent,
          modes,
        });
      }
    }
    return;
  }
}

export interface AccessChangeOptions {
  /** A fetch that acts as an agent holding `acl:Control` (normally the pod owner's podFetch). */
  fetch: typeof fetch;
  /** The resource or container whose access changes. */
  resourceUrl: string;
  /** The pod owner's WebID; their Read/Write/Control rule is always kept. */
  owner: string;
  /** The pod root (`…/pods/<owner>/`), the limit of the walk up for inherited rules. */
  podRoot: string;
}

async function writeAcl(options: AccessChangeOptions, acl: FetchedAcl): Promise<Response> {
  const target = aclTarget(acl.aclUrl);
  if (!ownerKeepsControl(acl.store, options.owner, target)) {
    addAuthorization(acl.store, freeFragment(acl.store, acl.aclUrl, "owner"), scopeOf(target), {
      agent: options.owner,
      modes: ["Read", "Write", "Control"],
    });
  }
  const headers: Record<string, string> = { "content-type": "text/turtle" };
  if (acl.exists && acl.etag !== null) headers["if-match"] = acl.etag;
  if (!acl.exists) headers["if-none-match"] = "*";
  return options.fetch(acl.aclUrl, {
    body: await toTurtle(acl.store, { acl: ACL }),
    headers,
    method: "PUT",
  });
}

async function loadForChange(options: AccessChangeOptions): Promise<FetchedAcl> {
  const acl = await readAcl(options.fetch, options.resourceUrl);
  if (!acl.exists)
    await inheritedInto(
      options.fetch,
      acl.store,
      acl.aclUrl,
      aclTarget(acl.aclUrl),
      options.podRoot,
    );
  return acl;
}

/**
 * Give `grant.agent` the `grant.modes` on a resource (on a container: also on its members). Keeps
 * every existing and inherited rule and the owner's rule; writes the whole ACL with `If-Match`.
 */
export async function grantAccess(
  options: AccessChangeOptions & { grant: GrantSpec },
): Promise<Response> {
  const acl = await loadForChange(options);
  const target = aclTarget(acl.aclUrl);
  addAuthorization(
    acl.store,
    freeFragment(acl.store, acl.aclUrl, "grant"),
    scopeOf(target),
    options.grant,
  );
  return writeAcl(options, acl);
}

/**
 * Take `modes` (default: all) away from `agent` on a resource. Authorisations shared with other
 * agents are split so only this agent loses access. The owner's rule cannot be revoked.
 */
export async function revokeAccess(
  options: AccessChangeOptions & { agent: string; modes?: AccessMode[] },
): Promise<Response> {
  if (options.agent === options.owner) throw new Error("the pod owner's access cannot be revoked");
  const acl = await loadForChange(options);
  const revoke = new Set(options.modes ?? MODES);
  for (const auth of authorizations(acl.store)) {
    const isClass = CLASSES.has(options.agent);
    const holds = isClass ? auth.agentClass.has(options.agent) : auth.agent.has(options.agent);
    if (!holds) continue;
    const keep = [...auth.mode]
      .map(modeName)
      .filter((m): m is AccessMode => m !== undefined && !revoke.has(m));
    if (isClass) auth.agentClass.delete(options.agent);
    else auth.agent.delete(options.agent);
    if (keep.length > 0) {
      const scope: Scope = {};
      if (auth.accessTo !== undefined) scope.accessTo = auth.accessTo;
      if (auth.default !== undefined) scope.default = auth.default;
      addAuthorization(acl.store, freeFragment(acl.store, acl.aclUrl, "grant"), scope, {
        agent: options.agent,
        modes: keep,
      });
    }
    if (auth.agent.size === 0 && auth.agentClass.size === 0)
      dropNode(acl.store, auth as unknown as Quad_Subject);
  }
  return writeAcl(options, acl);
}
