// AUTHORED-BY Claude Opus 5.5
/**
 * What pages, the service worker, the fallback worker and the agent worker say to each other.
 * Browser-safe and wasm-free.
 */
import type { AppNote, LensEntry } from "@mortgage/demo-kit/contracts";
import type { PodOwner } from "@mortgage/demo-kit/registry";
import type { HostInfo, SeedRequest } from "./host/host.js";

/** BroadcastChannel carrying `HostMessage`s (events, resets) to every page and worker. */
export const EVENTS_CHANNEL = "pod-runtime-events";
/** `new Worker(swUrl, { name })` names that pick the bundle's role outside a service worker. */
export const HOST_WORKER_NAME = "pod-host";
export const AGENTS_WORKER_NAME = "pod-agents";
/** Fallback mode: Web Lock held by the one dedicated worker that hosts the pods for all tabs. */
export const HOST_LOCK = "pod-runtime-host";
/** Fallback mode: BroadcastChannel over which the other tabs' workers reach the hosting one. */
export const HOST_RPC_CHANNEL = "pod-runtime-host-rpc";
/** Web Lock held by the one tab whose agent worker runs the organisation agents. */
export const AGENTS_LOCK = "pod-runtime-agents";

/** Who the request is from: an app slug or a pod owner (path mode; self-declared, design.md §d.5). */
export const AGENT_HEADER = "x-demo-agent";
/** "1" when an organisation's back-office agent made the request. */
export const VIA_AGENT_HEADER = "x-demo-via-agent";
/** `<demo>:<step>` of the tour step the request belongs to, when there is one. */
export const TOUR_HEADER = "x-demo-tour";

export interface RuntimeConfigMessage {
  owners: PodOwner[];
  /** Identity key (app slug) → the owner it acts as. */
  identities: Record<string, PodOwner>;
}

export type ControlRequest =
  | ({ type: "hello" } & RuntimeConfigMessage)
  | { type: "seed"; requests: SeedRequest[] }
  | { type: "note"; note: AppNote }
  | { type: "events" }
  | { type: "reset" }
  | { type: "day"; day: number }
  /** Ask an active service worker to claim this page (after a hard reload). */
  | { type: "claim" }
  /** Run these apps' agents (`/agents/<slug>.js`) next to the host (dedicated-worker mode). */
  | { type: "agents"; agents: string[]; identities: Record<string, PodOwner> }
  | {
      type: "fetch";
      url: string;
      method: string;
      headers: Array<[string, string]>;
      body: ArrayBuffer | null;
    };

export interface HelloReply {
  info: HostInfo;
  dayOne: string;
  day: number;
}

export interface FetchReply {
  status: number;
  headers: Array<[string, string]>;
  body: ArrayBuffer | null;
}

export type ControlReply =
  | {
      ok: true;
      hello?: HelloReply;
      applied?: boolean;
      entry?: LensEntry;
      events?: LensEntry[];
      response?: FetchReply;
    }
  | { ok: false; error: string };

/** What a page posts to the agent worker (service-worker mode). */
export interface AgentWorkerStart {
  type: "agents";
  agents: string[];
  identities: Record<string, PodOwner>;
  lock: string;
  origin: string;
}

/** The page on the pod origin that hosts the host-mode bridge (design.md §d.5). */
export const BRIDGE_PATH = "/pods-bridge/";

export function parseTour(value: string | null): { demo: string; step: string } | undefined {
  if (value === null) return undefined;
  const at = value.indexOf(":");
  if (at <= 0 || at === value.length - 1) return undefined;
  return { demo: value.slice(0, at), step: value.slice(at + 1) };
}
