// AUTHORED-BY Claude Opus 5.5
// The acceptance suite's expect matcher (e2e/support/match.ts): a POST to a container.
import { describe, expect, it } from "vitest";
import type { LensEntry } from "../packages/demo-kit/src/contracts/index.ts";
import { matchesExpectation } from "../e2e/support/match.ts";

const entry = (path: string, method = "POST"): LensEntry => ({
  actor: { org: "payroll", viaAgent: false, webid: "https://site.test/pods/payroll/profile/card#me" },
  at: "2026-08-31T09:00:00.000Z",
  id: 1,
  kind: "write",
  method,
  path,
  pod: "alex",
  source: "pod",
  status: 201,
});
const post = { kind: "write", method: "POST", path: "/inbox/", pod: "alex", status: 201 } as const;

describe("a POST to a container", () => {
  it("matches the resource the runtime logs under the Location it created", () => {
    expect(matchesExpectation(post, entry("/inbox/request-g1-a163"))).toBe(true);
    expect(matchesExpectation(post, entry("/pods/alex/inbox/request-g1-a163"))).toBe(true);
    expect(matchesExpectation(post, entry("/inbox/"))).toBe(true);
  });

  it("does not match a resource elsewhere, deeper, or another method", () => {
    expect(matchesExpectation(post, entry("/credentials/assets"))).toBe(false);
    expect(matchesExpectation(post, entry("/inbox/sub/request"))).toBe(false);
    expect(matchesExpectation(post, entry("/inbox/request-g1", "PUT"))).toBe(false);
    expect(matchesExpectation(post, { ...entry("/inbox/x"), pod: "lender" } as LensEntry)).toBe(
      false,
    );
  });
});
