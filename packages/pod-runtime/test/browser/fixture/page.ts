// AUTHORED-BY Claude Opus 5.5
/** Fixture page for the browser tests: exposes the built client on `window.rt`. */
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import type { OrgSlug } from "@mortgage/demo-kit/registry";
import { setUrlMode } from "@mortgage/demo-kit/urls";
import * as acl from "../../../dist/acl.js";
import * as runtime from "../../../dist/index.js";
import { ORGS } from "./registry.js";

const registry = ORGS;

const params = new URLSearchParams(location.search);
const app = (params.get("app") ?? "bank") as OrgSlug;
const hostDomain = params.get("host");
if (hostDomain !== null) setUrlMode({ domain: hostDomain, kind: "host", protocol: "http:" });
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

Object.assign(globalThis, { acl, events, rt: runtime });
