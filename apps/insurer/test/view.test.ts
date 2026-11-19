// AUTHORED-BY Claude Opus 5.5
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, it } from "vitest";
import { EMPTY_LOG, foldEntry, hasWritten, type PodLog } from "../src/log.ts";
import { bindState, describePath, FUNNEL, funnelIndex, grantScope, usd } from "../src/view.ts";

let id = 0;
const write = (pod: string, path: string, status = 201, kind = "write"): LensEntry =>
  ({
    actor: { org: "alex", viaAgent: false, webid: "https://x/pods/alex/profile/card#me" },
    at: "2026-08-03T10:00:00Z",
    id: ++id,
    kind,
    method: kind === "delete" ? "DELETE" : "PUT",
    path,
    pod,
    source: "pod",
    status,
  }) as LensEntry;

const logOf = (...entries: LensEntry[]): PodLog => entries.reduce(foldEntry, EMPTY_LOG);

describe("the funnel", () => {
  it("has one stage per screen and finds the current one", () => {
    expect(FUNNEL.map((stage) => stage.path)).toEqual(["/", "/property", "/quote", "/evidence"]);
    expect(funnelIndex("/quote")).toBe(2);
    expect(funnelIndex("/nowhere")).toBe(0);
  });

  it("formats dollars without and with cents", () => {
    expect(usd(1620)).toBe("$1,620");
    expect(usd(135, true)).toBe("$135.00");
  });
});

describe("the pod log", () => {
  it("keeps successful writes and forgets deleted ones", () => {
    const log = logOf(write("alex", "/a"), write("alex", "/b", 403, "denied"));
    expect(hasWritten(log, "alex", "/a")).toBe(true);
    expect(hasWritten(log, "alex", "/b")).toBe(false);
    expect(hasWritten(foldEntry(log, write("alex", "/a", 204, "delete")), "alex", "/a")).toBe(
      false,
    );
  });

  it("ignores app notes and reads", () => {
    const note = { at: "x", id: 99, kind: "verified", org: "lender", source: "app", text: "t" };
    expect(foldEntry(EMPTY_LOG, note as LensEntry)).toBe(EMPTY_LOG);
    expect(foldEntry(EMPTY_LOG, write("alex", "/a", 200, "read"))).toBe(EMPTY_LOG);
  });
});

describe("whether Bind is allowed", () => {
  it("waits for the appraisal copy, then is ready, then is bound", () => {
    expect(bindState(EMPTY_LOG)).toBe("waiting-for-appraisal");
    const appraised = logOf(write("lender", "/x"), write("alex", "/mortgage/juniper/appraisal"));
    expect(bindState(appraised)).toBe("ready");
    expect(bindState(foldEntry(appraised, write("alex", "/insurance/evidence-of-insurance")))).toBe(
      "bound",
    );
  });

  it("does not take another pod's appraisal for Alex's", () => {
    expect(bindState(logOf(write("lender", "/mortgage/juniper/appraisal")))).toBe(
      "waiting-for-appraisal",
    );
  });
});

describe("what G7 covers", () => {
  it("reads the property record and the appraisal, and writes the insurance drawer", () => {
    expect(grantScope()).toEqual({
      reads: ["property/subject-property", "mortgage/juniper/appraisal"],
      writes: ["insurance/"],
    });
    expect(grantScope().reads.map(describePath)).toEqual([
      "Your property record",
      "Your copy of the appraisal",
    ]);
  });
});
