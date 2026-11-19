// AUTHORED-BY Claude Opus 5.5
// A REAL wasm trap through the built host, in its own process (Vitest counts uncaught errors as
// failures, and a trap surfaces as one). Prints one JSON line.
import { createNodePodHost } from "../../dist/node.js";

const ORIGIN = "https://pods.example";
const out = {};
const bomb = (depth) => `${'{"https://schema.org/about":'.repeat(depth)}1${"}".repeat(depth)}`;
const json = { "content-type": "application/ld+json" };
const turtle = { "content-type": "text/turtle" };

const mode = process.argv[2];
const host = createNodePodHost({
  limits:
    mode === "unguarded" ? { dispatchTimeoutMs: 5000, maxNesting: Number.POSITIVE_INFINITY } : {},
  origin: ORIGIN,
  owners: ["alex", "bank"],
});
await host.ready;
const alex = host.fetchAs("alex");
const bank = host.fetchAs("bank");
const doc = (s) =>
  `<${s}> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <https://schema.org/Thing> .`;
out.before = (
  await alex(`${ORIGIN}/pods/alex/keep`, {
    body: doc(`${ORIGIN}/pods/alex/keep`),
    headers: turtle,
    method: "PUT",
  })
).status;
out.otherPodBefore = (
  await bank(`${ORIGIN}/pods/bank/keep`, {
    body: doc(`${ORIGIN}/pods/bank/keep`),
    headers: turtle,
    method: "PUT",
  })
).status;
const started = Date.now();
out.bomb = (
  await alex(`${ORIGIN}/pods/alex/bomb`, { body: bomb(2000), headers: json, method: "PUT" })
).status;
out.bombMs = Date.now() - started;
out.after = (await alex(`${ORIGIN}/pods/alex/keep`)).status;
out.otherPodAfter = (await bank(`${ORIGIN}/pods/bank/keep`)).status;
out.writeAfter = (
  await alex(`${ORIGIN}/pods/alex/new`, {
    body: doc(`${ORIGIN}/pods/alex/new`),
    headers: turtle,
    method: "PUT",
  })
).status;
out.recoveries = (await host.info()).recoveries;
console.log(JSON.stringify(out));
process.exit(0);
