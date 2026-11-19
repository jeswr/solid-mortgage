// AUTHORED-BY Claude Opus 5.5
/**
 * Runtime services the 0.1.8 wasm does not provide, answered by the host on `/pods/.runtime/**`
 * (no pod can be called `.runtime`: owner slugs start with a letter). Each is labelled as the
 * runtime's work, never the pod server's:
 *
 * - **Change notification** (`subscriptions`). The wasm implements no Solid Notifications (no
 *   storage description, no channel endpoints; `test/wasm/09-notifications.test.ts`). The host
 *   keeps the subscriptions and, after a write the pod server accepted, emits a `notified` note
 *   for each subscriber. Subscribing requires Read access to the topic, asked of the pod server
 *   itself. The notification carries no data, only that the resource changed and how; reading
 *   the new state is an ordinary request that WAC decides, so a subscriber whose access has gone
 *   is refused (403) when it tries.
 * - **One-time grants** (`one-time-grants`). WAC cannot say "once". The pod owner marks a rule it
 *   granted as one-time; after the agent's first successful read of that resource, the host,
 *   acting as the owner's wallet (a back-office agent), revokes the agent's access with
 *   `revokeAccess`, inside the same serialised dispatch, so no second read can slip in. A `grant-used`
 *   note precedes the revoke event. If the revoke fails, the host refuses that agent's further
 *   requests to the resource itself (fail closed) until the demo is reset.
 *
 * Who is asking is established exactly as for pod requests (`X-Demo-Agent` in path mode, the
 * bridge in host mode); anonymous callers get 401.
 */
import type { AppNote, PodEvent } from "@mortgage/demo-kit/contracts";
import { isOrgSlug, type OrgSlug, type PodOwner } from "@mortgage/demo-kit/registry";
import { isAclPath } from "../acl.js";
import type { PodStorage } from "./storage.js";

/** The path prefix of the runtime's own endpoints, under the pods' path. */
export const RUNTIME_PREFIX = "/pods/.runtime/";
/** ActivityStreams 2.0 activity types used in a notification's `refs[2]`. */
export const AS = "https://www.w3.org/ns/activitystreams#";

export type ChangeActivity = "Create" | "Update" | "Delete";

/** A standing request to be told when a resource (or a container's members) changes. */
export interface Subscription {
  /** Absolute URL of the resource or container watched. */
  topic: string;
  pod: PodOwner;
  /** Pod-relative path of the topic. */
  path: string;
  /** The pod owner (WebID) that subscribed. */
  subscriber: PodOwner;
  /** The organisation app the notification is addressed to (whose agent's `changed` runs). */
  app: OrgSlug;
  /** Demo-calendar time of the subscription. */
  since: string;
}

/** A rule the pod owner granted that closes after the agent's first successful read. */
export interface OneTimeGrant {
  pod: PodOwner;
  /** Pod-relative path; a container path (ending in `/`) covers its members. */
  path: string;
  /** The agent's WebID. */
  agent: string;
  since: string;
}

export interface ServiceCaller {
  /** The owner the caller acts as; undefined for anonymous. */
  owner: PodOwner | undefined;
  /** The identity key the transport established (an app slug or an owner). */
  key: string | null | undefined;
}

export interface ServiceDeps {
  origin: string;
  owners: readonly PodOwner[];
  storage: PodStorage;
  clock(): string;
  webid(owner: PodOwner): string;
  podUrl(owner: PodOwner, path?: string): string;
  /** The organisation app an identity key or owner notifications go to; undefined when none. */
  appFor(owner: PodOwner, key?: string | null): OrgSlug | undefined;
  /** Whether `app` is an identity that acts as `owner`. */
  actsAs(app: string, owner: PodOwner): boolean;
  /** Ask the pod server whether `agent` may read `path` in `owner`'s pod. Emits no event. */
  canRead(owner: PodOwner, path: string, agent: string): Promise<boolean>;
  emitNote(note: AppNote): Promise<void>;
  /** Revoke `agent`'s access to `path` as the owner's back-office agent; resolves to the HTTP status. */
  revoke(
    owner: PodOwner,
    path: string,
    agent: string,
    tour: PodEvent["tour"] | undefined,
  ): Promise<number>;
}

export interface RuntimeServices {
  load(): Promise<void>;
  clear(): Promise<void>;
  /** Answer a request to `/pods/.runtime/**`. */
  handle(method: string, url: URL, body: Uint8Array, caller: ServiceCaller): Promise<Response>;
  /** A refusal for a request the host must block itself (a one-time grant that failed to close). */
  blocked(owner: PodOwner, path: string, agent: string): Response | undefined;
  /** Run after a pod event is emitted: notify subscribers, close a used one-time grant. */
  after(event: PodEvent): Promise<void>;
  subscriptions(): Subscription[];
  oneTimeGrants(): OneTimeGrant[];
}

const KEYS = {
  blocked: "oneTimeBlocked",
  once: "oneTimeGrants",
  subscriptions: "subscriptions",
} as const;

function json(status: number, value: unknown): Response {
  return new Response(`${JSON.stringify(value)}\n`, {
    headers: { "content-type": "application/json" },
    status,
  });
}

function problem(status: number, message: string): Response {
  return json(status, { error: message });
}

const covers = (scope: string, path: string) =>
  scope === path || (scope.endsWith("/") && path.startsWith(scope) && path !== scope);

function activityOf(event: PodEvent): ChangeActivity {
  if (event.method === "DELETE") return "Delete";
  if (event.method === "POST" || event.status === 201) return "Create";
  return "Update";
}

export function createRuntimeServices(deps: ServiceDeps): RuntimeServices {
  let subscriptions: Subscription[] = [];
  let once: OneTimeGrant[] = [];
  /** One-time grants whose revoke failed: `<pod> <path> <agent>`. */
  let blocked: string[] = [];

  const save = async () => {
    await deps.storage.putMeta(KEYS.subscriptions, subscriptions);
    await deps.storage.putMeta(KEYS.once, once);
    await deps.storage.putMeta(KEYS.blocked, blocked);
  };

  /** A URL inside one of the pods, as owner and pod-relative path. */
  function locate(value: unknown): { owner: PodOwner; path: string } | undefined {
    if (typeof value !== "string") return undefined;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return undefined;
    }
    if (url.origin !== deps.origin || url.search !== "" || url.hash !== "") return undefined;
    const match = /^\/pods\/([^/]+)(\/.*)?$/.exec(url.pathname);
    const owner = match?.[1];
    if (owner === undefined || !(deps.owners as string[]).includes(owner)) return undefined;
    return { owner: owner as PodOwner, path: match?.[2] ?? "/" };
  }

  function readBody(body: Uint8Array): Record<string, unknown> | undefined {
    try {
      const value = JSON.parse(new TextDecoder().decode(body)) as unknown;
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined;
    } catch {
      return undefined;
    }
  }

  async function handleSubscriptions(
    method: string,
    url: URL,
    body: Uint8Array,
    owner: PodOwner,
    key: string | null | undefined,
  ): Promise<Response> {
    if (method === "GET" || method === "HEAD")
      return json(200, { subscriptions: subscriptions.filter((s) => s.subscriber === owner) });
    const input =
      method === "DELETE"
        ? { app: url.searchParams.get("app") ?? undefined, topic: url.searchParams.get("topic") }
        : readBody(body);
    if (input === undefined) return problem(400, "send a JSON object: { topic, app? }");
    const topic = locate(input.topic);
    if (topic === undefined) return problem(400, "topic must be the URL of a resource in a pod");
    if (isAclPath(topic.path)) return problem(400, "an ACL resource cannot be a topic");
    const requested = typeof input.app === "string" ? input.app : undefined;
    if (requested !== undefined && (!isOrgSlug(requested) || !deps.actsAs(requested, owner)))
      return problem(403, `${requested} does not act as this caller`);
    const app =
      requested !== undefined && isOrgSlug(requested) ? requested : deps.appFor(owner, key);
    if (app === undefined) return problem(400, "this caller has no organisation app to notify");
    const topicUrl = deps.podUrl(topic.owner, topic.path);
    if (method === "DELETE") {
      subscriptions = subscriptions.filter((s) => !(s.topic === topicUrl && s.app === app));
      await save();
      return new Response(null, { status: 204 });
    }
    if (method !== "POST") return problem(405, "use GET, POST or DELETE");
    // Solid Notifications requires Read access to the topic; the pod server decides.
    if (!(await deps.canRead(topic.owner, topic.path, deps.webid(owner))))
      return problem(403, "the subscriber may not read the topic");
    const existing = subscriptions.find((s) => s.topic === topicUrl && s.app === app);
    if (existing !== undefined) return json(200, existing);
    const subscription: Subscription = {
      app,
      path: topic.path,
      pod: topic.owner,
      since: deps.clock(),
      subscriber: owner,
      topic: topicUrl,
    };
    subscriptions.push(subscription);
    await save();
    return json(201, subscription);
  }

  async function handleOnce(
    method: string,
    url: URL,
    body: Uint8Array,
    owner: PodOwner,
  ): Promise<Response> {
    if (method === "GET" || method === "HEAD")
      return json(200, { grants: once.filter((g) => g.pod === owner) });
    const input =
      method === "DELETE"
        ? { agent: url.searchParams.get("agent"), resource: url.searchParams.get("resource") }
        : readBody(body);
    if (input === undefined) return problem(400, "send a JSON object: { resource, agent }");
    const target = locate(input.resource);
    if (target === undefined)
      return problem(400, "resource must be the URL of a resource in a pod");
    if (target.owner !== owner) return problem(403, "only the pod owner can make a grant one-time");
    if (isAclPath(target.path)) return problem(400, "an ACL resource cannot be granted one-time");
    if (typeof input.agent !== "string" || input.agent === "" || input.agent === deps.webid(owner))
      return problem(400, "agent must be the WebID of an agent other than the owner");
    const agent = input.agent;
    const same = (g: OneTimeGrant) =>
      g.pod === owner && g.path === target.path && g.agent === agent;
    if (method === "DELETE") {
      once = once.filter((g) => !same(g));
      await save();
      return new Response(null, { status: 204 });
    }
    if (method !== "POST") return problem(405, "use GET, POST or DELETE");
    const existing = once.find(same);
    if (existing !== undefined) return json(200, existing);
    const grant: OneTimeGrant = { agent, path: target.path, pod: owner, since: deps.clock() };
    once.push(grant);
    await save();
    return json(201, grant);
  }

  async function notify(event: PodEvent): Promise<void> {
    if (event.kind !== "write" && event.kind !== "delete") return;
    if (event.status < 200 || event.status > 299 || isAclPath(event.path)) return;
    const activity = activityOf(event);
    const resource = deps.podUrl(event.pod, event.path);
    for (const s of subscriptions) {
      if (s.pod !== event.pod || !covers(s.path, event.path)) continue;
      // A subscriber is not told about its own writes (an agent that updates what it watches
      // would otherwise wake itself).
      if (s.subscriber === event.actor.org) continue;
      const label = event.resource?.label ?? event.path;
      await deps.emitNote({
        kind: "notified",
        org: s.app,
        refs: [s.topic, resource, `${AS}${activity}`],
        text: `${label}: ${activity === "Create" ? "created" : activity === "Delete" ? "deleted" : "changed"}. Notified by the demo runtime; the Solid Notifications Protocol in production. The notice carries no data.`,
      });
    }
  }

  async function closeOnce(event: PodEvent): Promise<void> {
    if (event.kind !== "read" || event.status < 200 || event.status > 299) return;
    if (event.actor.org === event.pod) return;
    const grant = once.find(
      (g) => g.pod === event.pod && g.agent === event.actor.webid && covers(g.path, event.path),
    );
    if (grant === undefined) return;
    once = once.filter((g) => g !== grant);
    await save();
    const wallet = deps.appFor(grant.pod);
    if (wallet !== undefined) {
      await deps.emitNote({
        kind: "grant-used",
        org: wallet,
        refs: [deps.podUrl(grant.pod, grant.path), grant.agent],
        text: "One-time grant used. The holder's wallet closes it.",
      });
    }
    let status = 0;
    try {
      status = await deps.revoke(grant.pod, grant.path, grant.agent, event.tour);
    } catch (error) {
      console.error("pod-runtime: closing a one-time grant failed", error);
    }
    if (status < 200 || status > 299) {
      blocked.push(`${grant.pod} ${grant.path} ${grant.agent}`);
      await save();
    }
  }

  return {
    after: async (event) => {
      await notify(event);
      await closeOnce(event);
    },
    blocked(owner, path, agent) {
      for (const entry of blocked) {
        const [pod, scope, who] = entry.split(" ");
        if (pod === owner && who === agent && scope !== undefined && covers(scope, path)) {
          return new Response(
            "one-time grant already used; it could not be closed in the ACL, so the runtime refuses\n",
            {
              headers: { "content-type": "text/plain; charset=utf-8" },
              status: 403,
            },
          );
        }
      }
      return undefined;
    },
    async clear() {
      subscriptions = [];
      once = [];
      blocked = [];
      await save();
    },
    async handle(method, url, body, caller) {
      if (caller.owner === undefined) return problem(401, "sign in (an identity) first");
      const name = url.pathname.slice(RUNTIME_PREFIX.length);
      if (name === "subscriptions")
        return handleSubscriptions(method, url, body, caller.owner, caller.key);
      if (name === "one-time-grants") return handleOnce(method, url, body, caller.owner);
      return problem(404, "no such runtime service");
    },
    async load() {
      const read = async <T>(key: string): Promise<T[]> => {
        const value = await deps.storage.getMeta<T[]>(key);
        return Array.isArray(value) ? value : [];
      };
      subscriptions = (await read<Subscription>(KEYS.subscriptions)).filter((s) =>
        isOrgSlug(s.app),
      );
      once = await read<OneTimeGrant>(KEYS.once);
      blocked = await read<string>(KEYS.blocked);
    },
    oneTimeGrants: () => once.map((g) => ({ ...g })),
    subscriptions: () => subscriptions.map((s) => ({ ...s })),
  };
}
