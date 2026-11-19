// AUTHORED-BY Claude Fable 5.2
/**
 * A small in-test pod host over the REAL `@sparq-org/solid-server` wasm: one `SolidServer` per
 * pod owner, and a fetch per caller that hands the caller's WebID to the server, which then
 * evaluates WAC itself. Nothing about the pod or the access check is mocked. The production
 * host is lane L1's `packages/pod-runtime`; this one exists so the journey runs headless.
 */

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoCalendar, type DemoCalendar } from "@mortgage/demo-kit/calendar";
import type { AppNote } from "@mortgage/demo-kit/contracts";
import { type PodOwner, podOwners, webidFor } from "@mortgage/demo-kit/registry";
import { generateKeyPairForSuite, type KeyPair } from "@mortgage/vc-kit";
import { Authorization } from "@solid/object";
import { DataFactory, Parser, Store } from "n3";
import { keyId } from "../../mortgage/issuers.js";
import type { World } from "../../mortgage/world.js";
import { ORGS } from "../../orgs.js";

export const POD_ORIGIN = "https://pods.demo.test";

interface WasmResponse {
  status: number;
  headers: string[];
  body: Uint8Array;
  free(): void;
}
interface WasmPod {
  handleRequest(
    method: string,
    path: string,
    headers: string[],
    body: Uint8Array,
    webid?: string | null,
  ): Promise<WasmResponse>;
}
interface WasmModule {
  default(options: { module_or_path: Uint8Array }): Promise<unknown>;
  SolidServer: new (base: string, owner: string) => WasmPod;
}

/**
 * `@sparq-org/solid-server` is a dependency of `packages/pod-runtime` only (lane L0 fixed the
 * lockfile), so it is resolved from there. The `content` package should declare it as a
 * devDependency; that is a manifest change outside this lane.
 */
async function loadWasm(): Promise<WasmModule> {
  const here = dirname(fileURLToPath(import.meta.url));
  const require = createRequire(join(here, "../../../packages/pod-runtime/package.json"));
  const entry = require.resolve("@sparq-org/solid-server/wasm");
  const module = (await import(entry)) as WasmModule;
  await module.default({
    module_or_path: await readFile(join(dirname(entry), "sparq_lws_wasm_bg.wasm")),
  });
  return module;
}

export interface HostEvent {
  readonly step: string;
  readonly day: number;
  readonly actor: PodOwner | "anonymous";
  readonly pod: PodOwner;
  /** Pod-relative, with a leading slash. */
  readonly path: string;
  readonly method: string;
  readonly status: number;
  readonly kind: "read" | "write" | "delete" | "grant" | "revoke" | "denied";
}

export type HostNote = AppNote & { readonly step: string; readonly day: number };

function aclPairs(body: string, baseIRI: string): Set<string> {
  const store = new Store(new Parser({ baseIRI, format: "text/turtle" }).parse(body));
  const pairs = new Set<string>();
  for (const subject of store.getSubjects(null, null, null)) {
    const authorization = new Authorization(subject, store, DataFactory);
    const agents = [...authorization.agent, ...authorization.agentClass];
    for (const agent of agents)
      for (const mode of authorization.mode) pairs.add(`${agent} ${mode}`);
  }
  return pairs;
}

export class TestHost {
  readonly events: HostEvent[] = [];
  readonly notes: HostNote[] = [];
  readonly calendar: DemoCalendar;
  /** The tour step the next requests belong to. */
  step = "seed";
  day = 1;
  private readonly pods = new Map<PodOwner, WasmPod>();
  private readonly keys = new Map<PodOwner, Promise<KeyPair>>();
  private readonly acls = new Map<string, Set<string>>();

  private constructor(wasm: WasmModule, calendar: DemoCalendar) {
    this.calendar = calendar;
    for (const owner of podOwners(ORGS)) {
      const base = `${POD_ORIGIN}/pods/${owner}/`;
      this.pods.set(owner, new wasm.SolidServer(base, webidFor(owner, POD_ORIGIN)));
    }
  }

  static async create(dayOne = "2026-08-03"): Promise<TestHost> {
    return new TestHost(await loadWasm(), createDemoCalendar(dayOne));
  }

  get owners(): PodOwner[] {
    return [...this.pods.keys()];
  }

  /** The world as the journey sees it. `day` follows `host.day`. */
  get world(): World {
    const host = this;
    return {
      calendar: this.calendar,
      get day() {
        return host.day;
      },
      fetchAs: (owner) => this.fetchAs(owner),
      keyFor: (owner) => this.keyFor(owner),
      note: (note) => {
        this.notes.push({ ...note, day: this.day, step: this.step });
      },
      podOrigin: POD_ORIGIN,
    };
  }

  keyFor(owner: PodOwner): Promise<KeyPair> {
    let key = this.keys.get(owner);
    if (key === undefined) {
      key = generateKeyPairForSuite(keyId({ podOrigin: POD_ORIGIN }, owner), "Ed25519");
      this.keys.set(owner, key);
    }
    return key;
  }

  /** A fetch the pod server authenticates as `owner`; `null` is an anonymous caller. */
  fetchAs(owner: PodOwner | null): typeof fetch {
    return async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const match = /^\/pods\/([^/]+)(\/.*)$/.exec(url.pathname);
      const pod = match?.[1] as PodOwner | undefined;
      const server = pod === undefined ? undefined : this.pods.get(pod);
      if (
        url.origin !== POD_ORIGIN ||
        match === null ||
        pod === undefined ||
        server === undefined
      ) {
        throw new TypeError(`the test host serves only ${POD_ORIGIN}/pods/<owner>/: ${url.href}`);
      }
      const path = match[2] as string;
      const method = (init?.method ?? "GET").toUpperCase();
      const headers: string[] = [];
      new Headers(init?.headers).forEach((value, name) => {
        headers.push(name, value);
      });
      const bodyText = init?.body === undefined || init.body === null ? "" : String(init.body);
      const raw = await server.handleRequest(
        method,
        path + url.search,
        headers,
        new TextEncoder().encode(bodyText),
        owner === null ? null : webidFor(owner, POD_ORIGIN),
      );
      const status = raw.status;
      const responseHeaders = new Headers();
      for (let i = 0; i + 1 < raw.headers.length; i += 2) {
        responseHeaders.append(raw.headers[i] as string, raw.headers[i + 1] as string);
      }
      const body = Uint8Array.from(raw.body);
      raw.free();
      this.events.push({
        actor: owner ?? "anonymous",
        day: this.day,
        kind: this.kindOf(method, url.href, status, bodyText),
        method,
        path,
        pod,
        status,
        step: this.step,
      });
      const empty = status === 204 || status === 304 || method === "HEAD";
      return new Response(empty ? null : body, { headers: responseHeaders, status });
    };
  }

  private kindOf(method: string, url: string, status: number, body: string): HostEvent["kind"] {
    if (status === 401 || status === 403) return "denied";
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return "read";
    if (status >= 400) return "denied";
    if (method === "DELETE") return "delete";
    if (!url.endsWith(".acl")) return "write";
    const before = this.acls.get(url) ?? new Set<string>();
    const after = aclPairs(body, url);
    this.acls.set(url, after);
    const added = [...after].some((pair) => !before.has(pair));
    const removed = [...before].some((pair) => !after.has(pair));
    return added ? "grant" : removed ? "revoke" : "write";
  }
}
