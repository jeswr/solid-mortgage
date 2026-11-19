import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/pipeline/route";
import { listIntake, parseHousing, recordIntake, staffViewEnabled } from "../lib/server/intake";

describe("demo loan-officer intake", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is off unless the operator opts in", async () => {
    expect(staffViewEnabled({})).toBe(false);
    expect(staffViewEnabled({ MORTGAGE_DEMO_STAFF_VIEW: "1" })).toBe(true);
    vi.stubEnv("MORTGAGE_DEMO_STAFF_VIEW", "");
    expect((await GET()).status).toBe(404);
  });

  it("accepts only a bounded, typed housing note", () => {
    expect(parseHousing({ monthlyRentUsd: 2150.4, source: "email" })).toEqual({
      monthlyRentUsd: 2150,
      source: "email",
    });
    expect(parseHousing({ monthlyRentUsd: -1, source: "manual" })).toBeUndefined();
    expect(parseHousing({ monthlyRentUsd: 2150, source: "pod" })).toBeUndefined();
    expect(parseHousing("2150")).toBeUndefined();
  });

  it("keeps one file per borrower, newest first", () => {
    const base = {
      podBase: "http://127.0.0.1:1/",
      borrowerName: "Alex Rivera",
      applicationIri: "http://127.0.0.1:1/mortgage/application",
      decisionIri: "http://127.0.0.1:1/mortgage/decision",
      channel: "assistant" as const,
    };
    recordIntake({ ...base, webid: "https://a.example/#me", submittedAt: "2026-10-13T10:00:00Z" });
    recordIntake({ ...base, webid: "https://b.example/#me", submittedAt: "2026-10-13T11:00:00Z" });
    const again = recordIntake({
      ...base,
      webid: "https://a.example/#me",
      submittedAt: "2026-10-13T12:00:00Z",
    });
    const files = listIntake();
    expect(files.filter((file) => file.webid === "https://a.example/#me")).toHaveLength(1);
    expect(files[0]?.id).toBe(again.id);
    expect(again.stage).toBe("submitted");
  });
});
