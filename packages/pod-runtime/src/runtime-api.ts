// AUTHORED-BY Claude Opus 5.5
/**
 * Calls to the runtime services on `/pods/.runtime/**` (see `host/services.ts`), over any fetch
 * that reaches the host as the caller: a page's `podFetch`, an agent's `ctx.podFetch`, or
 * `host.fetchAs(identity)` in a headless run. Browser-safe and wasm-free.
 */

const AS = "https://www.w3.org/ns/activitystreams#";

export type ChangeActivity = "Create" | "Update" | "Delete";

export interface SubscriptionRecord {
  topic: string;
  pod: string;
  path: string;
  subscriber: string;
  app: string;
  since: string;
}

export interface OneTimeGrantRecord {
  pod: string;
  path: string;
  agent: string;
  since: string;
}

/** The runtime service URL on a pod origin, e.g. `https://site.example/pods/.runtime/subscriptions`. */
export function runtimeServiceUrl(podOrigin: string, service: string): string {
  return new URL(`/pods/.runtime/${service}`, podOrigin).href;
}

async function check(response: Response, what: string): Promise<Response> {
  if (response.ok) return response;
  let reason = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") reason = `${reason}: ${body.error}`;
  } catch {
    // Not JSON: the status says enough.
  }
  throw new Error(`pod-runtime: ${what} failed (${reason})`);
}

/**
 * Ask to be told when `topic` (a resource, or a container's members) changes. The caller must be
 * able to read the topic. `app` picks which of the caller's organisation apps is told (its
 * agent's `changed` handler runs); it defaults to the calling app.
 */
export async function watchResource(
  fetchFn: typeof fetch,
  topic: string,
  options: { app?: string } = {},
): Promise<SubscriptionRecord> {
  const response = await fetchFn(runtimeServiceUrl(topic, "subscriptions"), {
    body: JSON.stringify({ topic, ...(options.app === undefined ? {} : { app: options.app }) }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (await (await check(response, `watching ${topic}`)).json()) as SubscriptionRecord;
}

/** Stop being told about `topic`. */
export async function unwatchResource(
  fetchFn: typeof fetch,
  topic: string,
  options: { app?: string } = {},
): Promise<void> {
  const url = new URL(runtimeServiceUrl(topic, "subscriptions"));
  url.searchParams.set("topic", topic);
  if (options.app !== undefined) url.searchParams.set("app", options.app);
  await check(await fetchFn(url.href, { method: "DELETE" }), `unwatching ${topic}`);
}

/** The caller's subscriptions. */
export async function listSubscriptions(
  fetchFn: typeof fetch,
  podOrigin: string,
): Promise<SubscriptionRecord[]> {
  const response = await fetchFn(runtimeServiceUrl(podOrigin, "subscriptions"));
  const body = (await (await check(response, "listing subscriptions")).json()) as {
    subscriptions: SubscriptionRecord[];
  };
  return body.subscriptions;
}

/**
 * Mark access the pod owner granted `agent` on `resource` as one-time: after the agent's first
 * successful read, the runtime revokes it as the owner's wallet. Only the pod owner may call it.
 * Grant the access itself with `grantAccess` (before or after this call).
 */
export async function makeGrantOneTime(
  fetchFn: typeof fetch,
  input: { resource: string; agent: string },
): Promise<OneTimeGrantRecord> {
  const response = await fetchFn(runtimeServiceUrl(input.resource, "one-time-grants"), {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (await (
    await check(response, `making the grant on ${input.resource} one-time`)
  ).json()) as OneTimeGrantRecord;
}

/** One-time grants on the caller's own pod not used yet. */
export async function listOneTimeGrants(
  fetchFn: typeof fetch,
  podOrigin: string,
): Promise<OneTimeGrantRecord[]> {
  const response = await fetchFn(runtimeServiceUrl(podOrigin, "one-time-grants"));
  const body = (await (await check(response, "listing one-time grants")).json()) as {
    grants: OneTimeGrantRecord[];
  };
  return body.grants;
}

/** What a `notified` note says, read from its `refs` (`[topic, resource, activity]`). */
export interface ChangeNotice {
  topic: string;
  /** Absolute URL of the resource that changed. */
  url: string;
  activity: ChangeActivity;
}

export function parseChangeNotice(note: {
  kind: string;
  refs?: string[] | undefined;
}): ChangeNotice | undefined {
  if (note.kind !== "notified") return undefined;
  const [topic, url, activity] = note.refs ?? [];
  if (topic === undefined || url === undefined || activity === undefined) return undefined;
  if (!activity.startsWith(AS)) return undefined;
  const name = activity.slice(AS.length);
  if (name !== "Create" && name !== "Update" && name !== "Delete") return undefined;
  return { activity: name, topic, url };
}
