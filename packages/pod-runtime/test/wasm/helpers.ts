// AUTHORED-BY Claude Opus 5.5
/**
 * Helpers for characterising @sparq-org/solid-server@0.1.8's wasm `SolidServer` in Node.
 * Every test drives the REAL wasm (the `./wasm` subpath, the web-target build), initialised
 * from bytes because Node's fetch cannot load a file: URL.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import init, { SolidServer } from "@sparq-org/solid-server/wasm";
import { DataFactory, Parser, type Quad, Writer } from "n3";

const require = createRequire(import.meta.url);
const { namedNode, quad } = DataFactory;

export const ACL = "http://www.w3.org/ns/auth/acl#";
export const FOAF = "http://xmlns.com/foaf/0.1/";
export const LDP = "http://www.w3.org/ns/ldp#";
export const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

export const ORIGIN = "https://pods.example";
export const BASE = `${ORIGIN}/pods/alex/`;
export const OWNER = `${BASE}profile/card#me`;
export const PARTNER = `${ORIGIN}/pods/bank/profile/card#me`;
export const BUREAU = `${ORIGIN}/pods/bureau/profile/card#me`;

export function wasmPath(): string {
  return require
    .resolve("@sparq-org/solid-server/wasm")
    .replace(/sparq_lws_wasm\.js$/, "sparq_lws_wasm_bg.wasm");
}

let ready: Promise<unknown> | undefined;
export function initWasm(): Promise<unknown> {
  ready ??= readFile(wasmPath()).then((bytes) => init({ module_or_path: bytes }));
  return ready;
}

export function newPod(base = BASE, owner = OWNER): SolidServer {
  return new SolidServer(base, owner);
}

export interface Res {
  status: number;
  /** Flat pairs as returned by wasm. */
  raw: string[];
  /** Lower-cased name -> all values. */
  headers: Map<string, string[]>;
  text: string;
  bytes: Uint8Array;
}

export function header(res: Res, name: string): string | undefined {
  return res.headers.get(name.toLowerCase())?.join(", ");
}

const te = new TextEncoder();
const td = new TextDecoder();

export interface ReqInit {
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  /** The WebID handed to `authenticatedWebid`. `undefined` and `null` both mean "omit". */
  as?: string | null;
}

/** One request through `SolidServer.handleRequest`, copying and freeing the LwsResponse. */
export async function req(
  pod: SolidServer,
  method: string,
  path: string,
  init: ReqInit = {},
): Promise<Res> {
  const flat = Object.entries(init.headers ?? {}).flat();
  const body =
    init.body === undefined
      ? new Uint8Array(0)
      : typeof init.body === "string"
        ? te.encode(init.body)
        : init.body;
  const r = await pod.handleRequest(method, path, flat, body, init.as);
  try {
    const raw = Array.from(r.headers, String);
    const headers = new Map<string, string[]>();
    for (let i = 0; i < raw.length; i += 2) {
      const k = (raw[i] ?? "").toLowerCase();
      headers.set(k, [...(headers.get(k) ?? []), raw[i + 1] ?? ""]);
    }
    const bytes = r.body.slice();
    return { status: r.status, raw, headers, text: td.decode(bytes), bytes };
  } finally {
    r.free();
  }
}

export const TURTLE = { "content-type": "text/turtle" };

/** Serialise quads with n3.Writer (no hand-built Turtle). */
export function turtle(quads: Quad[], baseIRI?: string): string {
  const w = new Writer({ prefixes: { acl: ACL, foaf: FOAF }, baseIRI });
  w.addQuads(quads);
  let out = "";
  w.end((err, result) => {
    if (err) throw err;
    out = result;
  });
  return out;
}

export function parse(text: string, baseIRI: string): Quad[] {
  return new Parser({ baseIRI }).parse(text);
}

export type Mode = "Read" | "Write" | "Append" | "Control";
export interface Rule {
  id: string;
  /** Absolute IRIs of the resource the rule covers via acl:accessTo. */
  accessTo?: string;
  /** Absolute IRI of the container the rule covers via acl:default. */
  default?: string;
  agents?: string[];
  agentClass?: ("foaf:Agent" | "acl:AuthenticatedAgent")[];
  origins?: string[];
  modes: Mode[];
}

/** Build an ACL document (absolute IRIs) with n3.Writer. */
export function acl(aclUrl: string, rules: Rule[]): string {
  const qs: Quad[] = [];
  for (const r of rules) {
    const s = namedNode(`${aclUrl}#${r.id}`);
    qs.push(quad(s, namedNode(RDF_TYPE), namedNode(`${ACL}Authorization`)));
    if (r.accessTo) qs.push(quad(s, namedNode(`${ACL}accessTo`), namedNode(r.accessTo)));
    if (r.default) qs.push(quad(s, namedNode(`${ACL}default`), namedNode(r.default)));
    for (const a of r.agents ?? []) qs.push(quad(s, namedNode(`${ACL}agent`), namedNode(a)));
    for (const c of r.agentClass ?? []) {
      qs.push(
        quad(
          s,
          namedNode(`${ACL}agentClass`),
          namedNode(c === "foaf:Agent" ? `${FOAF}Agent` : `${ACL}AuthenticatedAgent`),
        ),
      );
    }
    for (const o of r.origins ?? []) qs.push(quad(s, namedNode(`${ACL}origin`), namedNode(o)));
    for (const m of r.modes) qs.push(quad(s, namedNode(`${ACL}mode`), namedNode(`${ACL}${m}`)));
  }
  return turtle(qs);
}

/** The owner rule every test ACL keeps so the owner is never locked out by accident. */
export function ownerRule(container: string, owner = OWNER): Rule {
  return {
    id: "owner",
    accessTo: container,
    default: container,
    agents: [owner],
    modes: ["Read", "Write", "Control"],
  };
}

/** A small Turtle document about `<>` built with n3.Writer. */
export function doc(url: string, type = "http://example.org/Thing"): string {
  return turtle([quad(namedNode(url), namedNode(RDF_TYPE), namedNode(type))]);
}

/** Container membership (ldp:contains objects) of a container listing. */
export function contains(res: Res, containerUrl: string): string[] {
  return parse(res.text, containerUrl)
    .filter((q) => q.predicate.value === `${LDP}contains`)
    .map((q) => q.object.value)
    .sort();
}
