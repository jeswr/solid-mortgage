// AUTHORED-BY Claude Opus 5.5
import { DPV, MORT } from "@mortgage/data-model";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { isAppSlug } from "@mortgage/demo-kit/registry";
import { describe, expect, it } from "vitest";
import {
  consentState,
  endOfPermissions,
  explainConsentState,
  explainEnd,
  explainPermissions,
  explainPurpose,
  labelOfPath,
  listOf,
  nameOfWebid,
  orgOfWebid,
  ownerOfWebid,
  safeReturnUrl,
  slugOfReturnUrl,
  verbOf,
} from "../src/explain.ts";

const ORIGIN = "https://demo.test";
const ROOT = `${ORIGIN}/pods/alex/`;
const id = (owner: string) => `${ORIGIN}/pods/${owner}/profile/card#me`;

describe("who", () => {
  it("names organisations and Alex from their WebIDs", () => {
    expect(ownerOfWebid(id("alex"))).toBe("alex");
    expect(nameOfWebid(id("alex"))).toBe("you");
    expect(orgOfWebid(id("lender"))).toBe("lender");
    expect(nameOfWebid(id("lender"))).toBe("Juniper Home Loans");
    expect(nameOfWebid(id("servicer"))).toBe("Marigold Loan Servicing");
  });

  it("does not guess a name for anything that is not a known WebID", () => {
    expect(ownerOfWebid(`${ORIGIN}/pods/nobody/profile/card#me`)).toBeUndefined();
    expect(ownerOfWebid(`${ORIGIN}/pods/lender/profile/card`)).toBeUndefined();
    expect(ownerOfWebid("not a url")).toBeUndefined();
    expect(nameOfWebid("https://elsewhere.test/me")).toBe("https://elsewhere.test/me");
  });
});

describe("what", () => {
  it("labels pod paths in plain words and humanises unknown ones", () => {
    expect(labelOfPath("credentials/assets")).toBe("Asset verification");
    expect(labelOfPath("/mortgage/juniper/")).toBe("Loan documents from Juniper");
    expect(labelOfPath("mortgage/closing/settlement-statement")).toBe("Settlement statement");
  });

  it("joins lists the English way", () => {
    expect(listOf([])).toBe("");
    expect(listOf(["A"])).toBe("A");
    expect(listOf(["A", "B"])).toBe("A and B");
    expect(listOf(["A", "B", "C"])).toBe("A, B and C");
  });

  it("says what each mode allows", () => {
    expect(verbOf(["Read"], true)).toBe("read");
    expect(verbOf(["Append"], true)).toBe("add new documents to");
    expect(verbOf(["Write"], false)).toBe("write");
    expect(verbOf(["Write"], true)).toBe("add and replace documents in");
  });

  it("explains a grant's permissions, onward recipients marked", () => {
    const sentences = explainPermissions(
      [
        {
          assignee: id("lender"),
          modes: ["Read"],
          targets: [`${ROOT}identity/`, `${ROOT}property/`],
        },
        { assignee: id("lender"), modes: ["Write"], targets: [`${ROOT}mortgage/juniper/`] },
        { assignee: id("aus"), modes: ["Read"], targets: [`${ROOT}credentials/assets`] },
        { assignee: id("aus"), modes: ["Read"], targets: ["https://elsewhere.test/x"] },
      ],
      id("lender"),
      ROOT,
    );
    expect(sentences.map((s) => `${s.who} ${s.text}`)).toEqual([
      "Juniper Home Loans may read Identity and Property",
      "Juniper Home Loans may add and replace documents in Loan documents from Juniper",
      "Castellan Housing Finance may read Asset verification",
      "Castellan Housing Finance may read https://elsewhere.test/x",
    ]);
    expect(sentences.map((s) => s.onward)).toEqual([false, false, true, true]);
  });
});

describe("until when, why, state", () => {
  const calendar = createDemoCalendar("2026-08-03");

  it("labels a fixed end on the demo calendar and an end event in words", () => {
    const until = new Date(`${calendar.date(8)}T00:00:00Z`);
    expect(explainEnd({ until }, calendar)).toBe(`Until ${calendar.label(8)}`);
    expect(explainEnd({ event: MORT.GrantEnd_Closing }, calendar)).toBe("Until closing");
    expect(explainEnd(undefined, calendar)).toBe("No end date given");
  });

  it("takes the earliest fixed end of a policy's permissions", () => {
    const a = new Date("2026-08-10T00:00:00Z");
    const b = new Date("2026-08-20T00:00:00Z");
    expect(endOfPermissions([{ until: b }, { until: a }])).toEqual({ until: a });
    expect(endOfPermissions([undefined, { event: MORT.GrantEnd_Closing }])).toEqual({
      event: MORT.GrantEnd_Closing,
    });
  });

  it("says purposes and consent states in words", () => {
    expect(explainPurpose(DPV.CreditChecking)).toBe("To check your credit");
    expect(consentState(DPV.ConsentGiven)).toBe("given");
    expect(consentState(DPV.ConsentExpired)).toBe("expired");
    expect(consentState(DPV.ConsentWithdrawn)).toBe("withdrawn");
    expect(explainConsentState("expired")).toBe("Ended, applied by your wallet");
  });
});

describe("safeReturnUrl", () => {
  const here = { hostname: "demo.test", origin: ORIGIN };

  it("accepts an app of this site, relative or absolute", () => {
    expect(safeReturnUrl("/lender/application", here, isAppSlug)).toBe(
      `${ORIGIN}/lender/application`,
    );
    expect(safeReturnUrl(`${ORIGIN}/servicer/connect?x=1`, here, isAppSlug)).toBe(
      `${ORIGIN}/servicer/connect?x=1`,
    );
  });

  it("refuses anything else", () => {
    for (const value of [
      null,
      "",
      "https://evil.test/lender/",
      "//evil.test/lender/",
      "javascript:alert(1)",
      "/not-an-app/",
      "/pods/alex/",
      `https://user:pw@demo.test/lender/`,
    ]) {
      expect(safeReturnUrl(value, here, isAppSlug), String(value)).toBeUndefined();
    }
  });

  it("in host mode accepts only a known app's own host", () => {
    const wallet = { hostname: "wallet.demo.test", origin: "https://wallet.demo.test" };
    expect(safeReturnUrl("https://lender.demo.test/start", wallet, isAppSlug)).toBe(
      "https://lender.demo.test/start",
    );
    expect(safeReturnUrl("https://evil.demo.test/", wallet, isAppSlug)).toBeUndefined();
    expect(safeReturnUrl("https://lender.other.test/", wallet, isAppSlug)).toBeUndefined();
    expect(safeReturnUrl("http://lender.demo.test/", wallet, isAppSlug)).toBeUndefined();
  });
});

describe("slugOfReturnUrl", () => {
  it("keeps the hand-off's query and names the app in either URL mode", () => {
    const here = { hostname: "demo.test", origin: "https://demo.test" };
    const back = safeReturnUrl("/servicer/connect?from=wallet", here, isAppSlug);
    expect(back).toBe("https://demo.test/servicer/connect?from=wallet");
    expect(slugOfReturnUrl(back ?? "", here)).toBe("servicer");
    expect(slugOfReturnUrl("https://lender-b.demo.test/received", here)).toBe("lender-b");
  });
});
