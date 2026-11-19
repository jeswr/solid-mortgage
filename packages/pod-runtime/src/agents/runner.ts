// AUTHORED-BY Claude Opus 5.5
/**
 * Organisation agents (design.md §d.2): each organisation app may export `handlers` from its
 * `src/agent.ts`. When something is written to the inbox of the pod the organisation acts as,
 * its `inbox` handler runs with a `podFetch` bound to that organisation. Agents stand in for an
 * organisation's back office, so one organisation can react while the visitor looks at another.
 *
 * The runner is transport-free: the service-worker build feeds it events from the
 * BroadcastChannel and fetches through the service worker; the headless runner feeds it
 * `host.subscribe` and `host.fetchAs`.
 */
import type { AppNote, LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import {
  type ChangeActivity,
  parseChangeNotice,
  unwatchResource,
  watchResource,
} from "../runtime-api.js";

/** A write that landed in the organisation's `inbox/`. */
export interface InboxMessage {
  /** Absolute URL of the resource written (for a POST, the created resource). */
  url: string;
  /** Pod-relative path, e.g. `/inbox/request-1a2b`. */
  path: string;
  /** Who wrote it. */
  from: PodEvent["actor"];
  /** The Lens event that announced the write. */
  event: PodEvent;
}

/**
 * A change to a resource the organisation subscribed to (`ctx.watch`). Sent by the demo runtime,
 * not the pod server (the 0.1.8 wasm has no Solid Notifications). It carries no data: read the
 * resource with `ctx.podFetch`, and WAC decides whether the organisation still may.
 */
export interface ChangeMessage {
  /** The URL subscribed to (the resource, or its container). */
  topic: string;
  /** Absolute URL of the resource that changed. */
  url: string;
  activity: ChangeActivity;
  /** The `notified` Lens note that announced it. */
  note: Extract<LensEntry, { source: "app" }>;
}

export interface AgentContext {
  /** The pod owner the agent acts as (the app's `actsAs`). */
  owner: PodOwner;
  /** The app slug whose agent this is. */
  app: string;
  /** Fetch as `owner`; requests are marked as made by a back-office agent in the Lens. */
  podFetch: typeof fetch;
  podUrl(owner: PodOwner, path?: string): string;
  webid(owner: PodOwner): string;
  /** Demo-calendar ISO time of the event being handled. */
  now(): string;
  /** Add an "app said" entry to the Lens. */
  note(note: AppNote): void;
  /** Subscribe this organisation to changes of `topic` (it must be able to read it). */
  watch(topic: string): Promise<void>;
  unwatch(topic: string): Promise<void>;
}

/** What `export const handlers` in an app's `src/agent.ts` may contain. */
export interface AgentHandlers {
  inbox?: (message: InboxMessage, context: AgentContext) => unknown | Promise<unknown>;
  /** Runs when the runtime notifies this app of a change to a resource it watches. */
  changed?: (message: ChangeMessage, context: AgentContext) => unknown | Promise<unknown>;
}

/** Type helper for an app's `src/agent.ts`: `export const handlers = defineAgent({ inbox… })`. */
export function defineAgent<T extends AgentHandlers>(handlers: T): T {
  return handlers;
}

export interface AgentRunnerOptions {
  /** App slug → its handlers. */
  agents: Readonly<Record<string, AgentHandlers>>;
  /** App slug → the owner it acts as. An app missing here acts as the owner of the same name. */
  identities: Readonly<Record<string, PodOwner>>;
  subscribe(listener: (entry: LensEntry) => void): () => void;
  /** A fetch acting as `owner`, marked `viaAgent`. */
  fetchFor(owner: PodOwner): typeof fetch;
  podUrl(owner: PodOwner, path?: string): string;
  webid(owner: PodOwner): string;
  note(note: AppNote): void;
  onError?(error: unknown, app: string, message: InboxMessage | ChangeMessage): void;
}

export interface AgentRunner {
  /** Resolves when every handler started so far has finished. */
  idle(): Promise<void>;
  stop(): void;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH"]);

/** The inbox write an event announces, or undefined when the event is not one. */
export function inboxWrite(entry: LensEntry): PodEvent | undefined {
  if (entry.source !== "pod") return undefined;
  if (entry.kind !== "write" || entry.status < 200 || entry.status > 299) return undefined;
  if (!WRITE_METHODS.has(entry.method)) return undefined;
  const path = entry.path.split("?")[0] ?? "";
  if (!path.startsWith("/inbox/") || path.endsWith("/") || path.endsWith(".acl")) return undefined;
  return entry;
}

export function createAgentRunner(options: AgentRunnerOptions): AgentRunner {
  const queues = new Map<string, Promise<void>>();
  const ownerOf = (app: string): PodOwner =>
    Object.hasOwn(options.identities, app)
      ? (options.identities[app] as PodOwner)
      : (app as PodOwner);

  const contextFor = (app: string, owner: PodOwner, at: string): AgentContext => {
    const podFetch = options.fetchFor(owner);
    return {
      app,
      // The note is from this organisation, whatever the handler wrote in it.
      note: (note) => options.note({ ...note, org: app as AppNote["org"] }),
      now: () => at,
      owner,
      podFetch,
      podUrl: options.podUrl,
      unwatch: (topic) => unwatchResource(podFetch, topic, { app }),
      async watch(topic) {
        await watchResource(podFetch, topic, { app });
      },
      webid: options.webid,
    };
  };

  const enqueue = <M extends InboxMessage | ChangeMessage>(
    app: string,
    message: M,
    run: () => unknown,
  ) => {
    const previous = queues.get(app) ?? Promise.resolve();
    const next = previous.then(run).then(
      () => undefined,
      (error: unknown) => {
        const what = "path" in message ? message.path : message.url;
        if (options.onError) options.onError(error, app, message);
        else console.error(`agent ${app} failed on ${what}`, error);
      },
    );
    queues.set(app, next);
  };

  const onChange = (entry: LensEntry) => {
    if (entry.source !== "app") return;
    const notice = parseChangeNotice(entry);
    if (notice === undefined) return;
    const handlers = Object.hasOwn(options.agents, entry.org)
      ? options.agents[entry.org]
      : undefined;
    const changed = handlers?.changed;
    if (changed === undefined) return;
    const message: ChangeMessage = { ...notice, note: entry };
    const context = contextFor(entry.org, ownerOf(entry.org), entry.at);
    enqueue(entry.org, message, () => changed(message, context));
  };

  const unsubscribe = options.subscribe((entry) => {
    onChange(entry);
    const event = inboxWrite(entry);
    if (event === undefined) return;
    for (const [app, handlers] of Object.entries(options.agents)) {
      const owner = ownerOf(app);
      const inbox = handlers.inbox;
      if (inbox === undefined || event.pod !== owner) continue;
      // An agent's own inbox bookkeeping must not wake it again.
      if (event.actor.org === owner && event.actor.viaAgent) continue;
      const path = event.path.split("?")[0] as string;
      const message: InboxMessage = {
        event,
        from: event.actor,
        path,
        url: options.podUrl(owner, path),
      };
      const context = contextFor(app, owner, event.at);
      enqueue(app, message, () => inbox(message, context));
    }
  });

  return {
    async idle() {
      // Handlers can trigger further handlers; wait until a pass adds no new work.
      for (;;) {
        const pending = [...queues.values()];
        await Promise.all(pending);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const now = [...queues.values()];
        if (now.length === pending.length && now.every((p, i) => p === pending[i])) return;
      }
    },
    stop: unsubscribe,
  };
}
