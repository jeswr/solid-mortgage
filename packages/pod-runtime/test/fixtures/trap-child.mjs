// AUTHORED-BY Claude Opus 5.5
// Runs one trap scenario in its own process (a trap poisons the whole realm, and Vitest would
// report the uncaught exception as a failure) and prints one JSON line with what happened.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const gluePath = require.resolve("@sparq-org/solid-server/wasm");
const wasmBytes = await readFile(gluePath.replace(/sparq_lws_wasm\.js$/, "sparq_lws_wasm_bg.wasm"));
const te = new TextEncoder();

const BASE = "https://pods.example/pods/alex/";
const OWNER = `${BASE}profile/card#me`;
const PARTNER = "https://pods.example/pods/bank/profile/card#me";
const OTHER_BASE = "https://pods.example/pods/bank/";

const uncaught = [];
process.on("uncaughtException", (e) =>
  uncaught.push({ name: e?.constructor?.name, message: String(e?.message) }),
);

async function loadGlue(instance) {
  const mod = await import(`${pathToFileURL(gluePath).href}?instance=${instance}`);
  await mod.default({ module_or_path: wasmBytes });
  return mod;
}

/** Settle a promise or report that it never settled. */
async function outcome(fn) {
  try {
    const p = Promise.resolve().then(fn);
    const r = await Promise.race([
      p,
      new Promise((res) => setTimeout(() => res("__hang__"), 1500)),
    ]);
    if (r === "__hang__") return "never-settled";
    if (r && typeof r.status === "number") {
      const s = r.status;
      r.free?.();
      return s;
    }
    return "ok";
  } catch (e) {
    return `${e instanceof WebAssembly.RuntimeError ? "RuntimeError" : e?.constructor?.name}: ${e?.message}`;
  }
}

const call = (pod, m, path, headers, body, as) =>
  pod.handleRequest(m, path, Object.entries(headers).flat(), te.encode(body), as);
const nestedJsonLd = (depth) => `${'{"http://example.org/p":'.repeat(depth)}1${"}".repeat(depth)}`;
const JSONLD = { "content-type": "application/ld+json" };
const TTL = { "content-type": "text/turtle" };
const aclBody = (c) =>
  `<#o> a <http://www.w3.org/ns/auth/acl#Authorization>; <http://www.w3.org/ns/auth/acl#agent> <${OWNER}>; ` +
  `<http://www.w3.org/ns/auth/acl#accessTo> <${c}>; <http://www.w3.org/ns/auth/acl#default> <${c}>; ` +
  `<http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Read>, <http://www.w3.org/ns/auth/acl#Write>, <http://www.w3.org/ns/auth/acl#Control>.\n` +
  `<#a> a <http://www.w3.org/ns/auth/acl#Authorization>; <http://www.w3.org/ns/auth/acl#agent> <${PARTNER}>; ` +
  `<http://www.w3.org/ns/auth/acl#accessTo> <${c}>; <http://www.w3.org/ns/auth/acl#default> <${c}>; ` +
  `<http://www.w3.org/ns/auth/acl#mode> <http://www.w3.org/ns/auth/acl#Append>.`;

const scenario = process.argv[2];
const result = { scenario };
const glue = await loadGlue(1);
const { SolidServer } = glue;

if (scenario === "depth") {
  // Find whether a given JSON-LD object nesting depth traps.
  const depth = Number(process.argv[3]);
  const pod = new SolidServer(BASE, OWNER);
  result.depth = depth;
  result.status = await outcome(() => call(pod, "PUT", "/j", JSONLD, nestedJsonLd(depth), OWNER));
} else if (scenario === "blast") {
  const pod = SolidServer.withSnapshot(BASE, OWNER, new Uint8Array());
  const other = new SolidServer(OTHER_BASE, PARTNER);
  await call(pod, "PUT", "/keep", TTL, `<#a> <#b> <#c> .`, OWNER);
  await call(other, "PUT", "/keep", TTL, `<#a> <#b> <#c> .`, PARTNER);
  const saved = pod.snapshot();
  result.trapRequest = await outcome(() =>
    call(pod, "PUT", "/j", JSONLD, nestedJsonLd(2000), OWNER),
  );
  result.uncaughtAfterTrap = [...uncaught];
  result.samePodAfter = await outcome(() => call(pod, "GET", "/keep", {}, "", OWNER));
  result.otherPodAfter = await outcome(() => call(other, "GET", "/keep", {}, "", PARTNER));
  result.newPodAfter = await outcome(() => new SolidServer(BASE, OWNER));
  result.snapshotAfter = await outcome(() => pod.snapshot());
  result.reinitSameGlue = await outcome(async () => {
    await glue.default({ module_or_path: wasmBytes });
    return call(new SolidServer(BASE, OWNER), "GET", "/.acl", {}, "", OWNER);
  });
  // Recovery: a FRESH module instance (new glue module = new linear memory) + the last snapshot.
  const fresh = await loadGlue(2);
  const restored = fresh.SolidServer.withSnapshot(BASE, OWNER, saved);
  result.freshModuleRestoredGet = await outcome(() =>
    call(restored, "GET", "/keep", {}, "", OWNER),
  );
} else if (scenario === "append-agent") {
  // Can an Append-only agent trap the pod by POSTing to an inbox it may append to?
  const pod = new SolidServer(BASE, OWNER);
  await call(pod, "PUT", "/inbox/seed", TTL, `<#a> <#b> <#c> .`, OWNER);
  result.aclPut = await outcome(() =>
    call(pod, "PUT", "/inbox/.acl", TTL, aclBody(`${BASE}inbox/`), OWNER),
  );
  result.unauthorisedPut = await outcome(() =>
    call(pod, "PUT", "/private/j", JSONLD, nestedJsonLd(2000), PARTNER),
  );
  result.anonymousPut = await outcome(() =>
    call(pod, "PUT", "/private/j", JSONLD, nestedJsonLd(2000), undefined),
  );
  result.uncaughtBeforeAppend = uncaught.length;
  result.appendPost = await outcome(() =>
    call(pod, "POST", "/inbox/", JSONLD, nestedJsonLd(2000), PARTNER),
  );
} else if (scenario === "use-after-free") {
  const pod = new SolidServer(BASE, OWNER);
  pod.free();
  result.afterFree = await outcome(() => call(pod, "GET", "/.acl", {}, "", OWNER));
  result.otherPodStillWorks = await outcome(() =>
    call(new SolidServer(BASE, OWNER), "GET", "/.acl", {}, "", OWNER),
  );
}
result.uncaught = uncaught;
console.log(JSON.stringify(result));
process.exit(0);
