// AUTHORED-BY Claude Opus 5.5
/** Tour harness page script: mounts the demo on each fixture page. */
import type { AppSlug } from "@mortgage/demo-kit/registry";
import { mountDemo } from "../../src/mount.js";
import { REGISTRY, webid } from "../fixtures/registry.js";
import { TRAIL_TOUR } from "../fixtures/trail-tour.js";
import { fixtureRuntime } from "./fixture-runtime.js";

const app = (document.querySelector('meta[name="demo-app"]')?.getAttribute("content") ??
  "welcome") as AppSlug;
const status = document.getElementById("status");
const say = (text: string) => {
  if (status) status.textContent = text;
};

const handlers: Record<string, () => void> = {
  "send-certificate": () => {
    fixtureRuntime.emitPod({
      actor: { org: "payroll", webid: webid("payroll"), viaAgent: false },
      pod: "alex",
      path: "/pods/alex/certificates/first-aid",
      method: "PUT",
      status: 201,
      kind: "write",
      resource: {
        label: "Wilderness first-aid certificate",
        drawer: "Certificates",
        types: ["https://www.w3.org/2018/credentials#VerifiableCredential"],
        credential: {
          type: "https://www.w3.org/2018/credentials#VerifiableCredential",
          issuer: webid("payroll"),
          validFrom: new Date().toISOString(),
        },
      },
    });
    say("Certificate sent.");
  },
  "apply-permit": () => {
    fixtureRuntime.emitPod({
      actor: { org: "county", webid: webid("county"), viaAgent: false },
      pod: "alex",
      path: "/pods/alex/certificates/first-aid",
      method: "GET",
      status: 200,
      kind: "read",
      resource: { label: "Wilderness first-aid certificate", drawer: "Certificates", types: [] },
    });
    fixtureRuntime.emitNote({
      kind: "verified",
      org: "county",
      text: "Fernhollow checked the certificate's signature: valid.",
      refs: ["/pods/alex/certificates/first-aid"],
    });
    say("Permit application sent.");
  },
  "finish-trip": () => say("Trip finished."),
};
for (const [target, fn] of Object.entries(handlers)) {
  document.querySelector(`[data-tour="${target}"]`)?.addEventListener("click", fn);
}

const mounted = await mountDemo({
  app,
  registry: REGISTRY,
  runtime: fixtureRuntime,
  holder: { name: "Alex" },
  tour: { demo: "trail", steps: TRAIL_TOUR, sources: ["T-1"] },
  lens: { drawers: [{ path: "/certificates/", label: "Certificates" }] },
});
declare global {
  interface Window {
    mounted: typeof mounted;
  }
}
window.mounted = mounted;
document.documentElement.dataset.ready = "true";
