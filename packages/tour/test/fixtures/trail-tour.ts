// AUTHORED-BY Claude Opus 5.5
/** A three-step fictional trail-expedition tour for the engine's tests. */
import type { TourStep } from "@mortgage/demo-kit/contracts";

export const TRAIL_TOUR: TourStep[] = [
  {
    id: "certify",
    chapter: "Get ready",
    app: "payroll",
    path: "",
    title: "Collect your first-aid certificate",
    body: "Tamarack Guides signs your wilderness first-aid certificate. Send it to your pod.",
    action: { target: "send-certificate", label: "Send to my pod" },
    done: { event: { kind: "write", pod: "alex", path: "/certificates/first-aid" } },
    mode: "interactive",
    lens: {
      headline: "A signed certificate is written to your pod.",
      chips: [{ kind: "pod write" }, { kind: "credential" }],
    },
    realWorld: { stage: "Preparation", source: "T-1" },
    clock: { day: 1 },
    expect: [{ kind: "write", pod: "alex" }],
  },
  {
    id: "permit",
    chapter: "Permits",
    app: "county",
    path: "permit",
    title: "Apply for a backcountry permit",
    body: "Ask Fernhollow Parks Service for a permit. The ranger checks your certificate.",
    action: { target: "apply-permit", label: "Apply" },
    done: { note: { kind: "verified", org: "county" } },
    mode: "interactive",
    lens: {
      headline: "The ranger reads the certificate and checks its signature.",
      chips: [{ kind: "pod read" }, { kind: "credential" }],
    },
    realWorld: { stage: "Permit" },
    clock: { day: 3 },
    expect: [
      { kind: "read", pod: "alex" },
      { kind: "verified", org: "county" },
    ],
  },
  {
    id: "finish",
    chapter: "After the trip",
    app: "welcome",
    path: "ledger",
    title: "See who saw what",
    body: "Read the ledger, then finish the trip.",
    action: { target: "finish-trip", label: "Finish" },
    done: { target: "finish-trip" },
    mode: "interactive",
    lens: { headline: "Who read what, and what never left the pod.", chips: [] },
    realWorld: { stage: "Summary" },
    expect: [],
  },
];
