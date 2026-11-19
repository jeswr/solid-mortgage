// AUTHORED-BY Claude Opus 5.5
/** Fixture page for the browser tests: exposes the built client on `window.rt`. */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import {
  ORG_SLUGS,
  type OrgRecord,
  type OrgRegistry,
  type OrgSlug,
} from "@mortgage/demo-kit/registry";
import * as runtime from "../../../dist/index.js";

const record = (slug: OrgSlug): OrgRecord => ({
  actsAs: slug === "wallet" ? "alex" : slug,
  organisation: `Org ${slug}`,
  persona: { name: "Test Person", role: "tester" },
  role: "test",
  short: slug,
  slug,
  themeColor: "#336699",
  title: slug,
});
const registry = Object.fromEntries(ORG_SLUGS.map((slug) => [slug, record(slug)])) as OrgRegistry;

const params = new URLSearchParams(location.search);
const app = (params.get("app") ?? "bank") as OrgSlug;
const events: LensEntry[] = [];

runtime.configure({
  app,
  mode: params.get("mode") === "worker" ? "worker" : "auto",
  registry,
  seed: [
    {
      body: "seeded text",
      contentType: "text/plain",
      method: "PUT",
      path: "/documents/seeded.txt",
      pod: "bank",
    },
    // An empty container; Turtle with no triples.
    { body: "", contentType: "text/turtle", method: "PUT", path: "/inbox/", pod: "bank" },
  ],
});
runtime.onEvent((entry) => events.push(entry), { replay: true });

Object.assign(globalThis, { events, rt: runtime });
