/**
 * Which pod the Data Vault pages read: the in-browser Mode-1 pod (default), or — when
 * the app runs under the local demo server (`pnpm demo`) — that server's shared seeded
 * pod, so the vault shows the same data every other app reads and writes.
 *
 * Discovery is loopback-only: on any other host the wallet never asks, and behaves
 * exactly as the deployed Mode-1 demo.
 */
import { WALLET_POD_BASE } from "./seed";

let podBase = WALLET_POD_BASE;

/** The pod base (trailing slash) every pod IRI in the vault is built from. */
export function activePodBase(): string {
  return podBase;
}

export function setActivePodBase(base: string): void {
  podBase = base.endsWith("/") ? base : `${base}/`;
}

export interface SharedDemoPod {
  readonly podBase: string;
  readonly webid: string;
  readonly name: string;
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** The local demo server's shared pod, if this page is served by one. */
export async function discoverSharedDemoPod(): Promise<SharedDemoPod | undefined> {
  if (typeof location === "undefined" || !LOOPBACK_HOSTS.has(location.hostname)) return undefined;
  try {
    const response = await fetch("/__demo/config.json", { cache: "no-store" });
    if (!response.ok) return undefined;
    const config = (await response.json()) as { persona?: Partial<SharedDemoPod> };
    const persona = config.persona;
    if (
      typeof persona?.podBase !== "string" ||
      typeof persona.webid !== "string" ||
      typeof persona.name !== "string"
    ) {
      return undefined;
    }
    return { podBase: persona.podBase, webid: persona.webid, name: persona.name };
  } catch {
    return undefined;
  }
}
