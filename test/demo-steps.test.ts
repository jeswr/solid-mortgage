import { describe, expect, test } from "vitest";
import { site } from "../apps/tour/app/site.ts";
import { GUIDED_STEPS, PILOT_CONTACT_URL } from "../scripts/demo/steps.ts";

const words = (text: string) => text.split(/\s+/u).filter((word) => word.length > 0).length;

/** Editorial limits for the guided overlay (astra-review-2 §3: 35–45 words per step). */
describe("guided steps", () => {
  test("ids are unique and every card stays short", () => {
    expect(new Set(GUIDED_STEPS.map((step) => step.id)).size).toBe(GUIDED_STEPS.length);
    for (const step of GUIDED_STEPS) {
      expect(words(step.title), step.id).toBeLessThanOrEqual(8);
      expect(words(step.body), step.id).toBeLessThanOrEqual(45);
    }
  });

  test("no step claims permission enforcement or a Loan Estimate the demo does not show", () => {
    const copy = GUIDED_STEPS.flatMap((step) => [step.title, step.body, step.watch ?? ""]).join(
      " ",
    );
    expect(copy).not.toMatch(/only with Alex's permission|its own identity|never receives/iu);
    expect(copy).not.toMatch(/issues a Loan Estimate|re-verify employment|eSign/iu);
  });

  test("every mention of permissions carries the local-mode limitation", () => {
    for (const step of GUIDED_STEPS) {
      if (/\bpermissions?\b/iu.test(step.body) && step.id !== "revoke-lender") {
        expect(step.body, step.id).toContain("Local requests run as Alex");
      }
    }
  });

  test("the tour ends with the pilot invitation and its two links", () => {
    const last = GUIDED_STEPS[GUIDED_STEPS.length - 1];
    expect(last.title).toBe("Discuss a mortgage-data pilot");
    expect(last.action).toBeUndefined();
    expect(last.links?.map((link) => link.label)).toEqual(["Discuss a pilot", "Explore the apps"]);
    expect(last.links?.[0]).toMatchObject({ href: PILOT_CONTACT_URL, primary: true });
  });

  test("the pilot link matches the tour's contact URL", () => {
    expect(PILOT_CONTACT_URL).toBe(site.copContactUrl);
  });

  test("closing actions use the shared closing labels", () => {
    const byId = new Map(GUIDED_STEPS.map((step) => [step.id, step]));
    expect(byId.get("esign")?.action?.label).toBe("Simulate signing");
    expect(byId.get("esign")?.doneText).toBe("Simulated signing complete");
    expect(byId.get("revoke-lender")?.action?.label).toBe("Remove lender access to closing record");
    expect(byId.get("revoke-lender")?.doneText).toBe("Lender access to closing record removed");
    expect(byId.get("reissue")?.action?.label).toBe("Issue replacement credential");
  });
});
