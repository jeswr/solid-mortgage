// AUTHORED-BY Claude Opus 5.5
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, it } from "vitest";
import {
  completesByEntry,
  completesStep,
  matchesExpectation,
  matchesPartial,
} from "../src/match.js";
import { TRAIL_TOUR } from "./fixtures/trail-tour.js";

const write: LensEntry = {
  source: "pod",
  id: 7,
  at: "2026-08-31T09:00:00.000Z",
  actor: {
    org: "payroll",
    webid: "https://t.example/pods/payroll/profile/card#me",
    viaAgent: false,
  },
  pod: "alex",
  path: "/pods/alex/certificates/first-aid",
  method: "PUT",
  status: 201,
  kind: "write",
  acl: {
    granted: [{ agent: "a", modes: ["Read", "Write"], resource: "/x/", inherited: true }],
    revoked: [],
  },
};
const note: LensEntry = {
  source: "app",
  id: 8,
  at: "2026-08-31T09:00:00.000Z",
  kind: "verified",
  org: "county",
  text: "checked",
};

describe("matchesPartial", () => {
  it("matches primitives, nested objects and arrays", () => {
    expect(matchesPartial(write, { kind: "write", actor: { org: "payroll" } })).toBe(true);
    expect(matchesPartial(write, { actor: { org: "bank" } })).toBe(false);
    expect(matchesPartial(write, { acl: { granted: [{ modes: ["Write"] }] } })).toBe(true);
    expect(matchesPartial(write, { acl: { granted: [{ modes: ["Control"] }] } })).toBe(false);
    expect(matchesPartial(write, {})).toBe(true);
  });

  it("matches pod-relative paths against full ones", () => {
    expect(matchesPartial(write, { path: "/certificates/first-aid" })).toBe(true);
    expect(matchesPartial(write, { path: "certificates/first-aid" })).toBe(true);
    expect(matchesPartial(write, { path: "/certificates/other" })).toBe(false);
  });
});

describe("step completion", () => {
  const [certify, permit, finish] = TRAIL_TOUR;
  if (!certify || !permit || !finish) throw new Error("fixture");

  it("completes from a matching pod event or app note only", () => {
    expect(completesStep(certify, write)).toBe(true);
    expect(completesStep(certify, note)).toBe(false);
    expect(completesStep(permit, note)).toBe(true);
    expect(completesStep(permit, write)).toBe(false);
    expect(completesStep(certify, { ...write, status: 403, kind: "denied" })).toBe(false);
  });

  it("uses the DOM target only when no entry is named", () => {
    expect(completesByEntry(certify)).toBe(true);
    expect(completesByEntry(finish)).toBe(false);
    expect(completesStep(finish, write)).toBe(false);
  });

  it("checks expect items against the right kind of entry", () => {
    expect(matchesExpectation(note, { kind: "verified", org: "county" })).toBe(true);
    expect(matchesExpectation(write, { kind: "verified" })).toBe(false);
    expect(matchesExpectation(write, { kind: "write", pod: "alex" })).toBe(true);
    expect(matchesExpectation(note, { kind: "write" })).toBe(false);
  });
});
