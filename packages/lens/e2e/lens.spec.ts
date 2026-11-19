// AUTHORED-BY Claude Opus 5.5
/**
 * Browser tests for `<solid-lens>`, driven by the recorded fixture log (test/fixtures). Each
 * map state of design.md §c.3 is reached from real entries and checked in the DOM; a
 * screenshot of each is attached to the report.
 */
import { readFileSync } from "node:fs";
import { AxeBuilder } from "@axe-core/playwright";
import type { LensEntry, PodEvent } from "@mortgage/demo-kit/contracts";
import { expect, type Page, type TestInfo, test } from "@playwright/test";

const EVENTS: LensEntry[] = JSON.parse(
  readFileSync(new URL("../test/fixtures/events.json", import.meta.url), "utf8"),
);

async function open(page: Page, query = "") {
  await page.goto(`./${query}`);
  await expect(page.locator("html")).toHaveAttribute("data-ready", "true");
}

const through = (page: Page, id: number, replayed = false) =>
  page.evaluate(([i, r]) => window.harness.through(i as number, r as boolean), [
    id,
    replayed,
  ] as const);
const step = (page: Page, id: string, index: number, extra: Record<string, unknown> = {}) =>
  page.evaluate(([s, i, x]) => window.harness.step(s as string, i as number, x as object), [
    id,
    index,
    extra,
  ] as const);

async function shot(page: Page, info: TestInfo, name: string) {
  await info.attach(name, {
    body: await page.locator("solid-lens").screenshot(),
    contentType: "image/png",
  });
}

const map = (page: Page) => page.locator("solid-lens svg.map");
const thisStep = (page: Page) =>
  page.locator("solid-lens [role=tabpanel]:not([hidden]) ol.entries");

async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .include("solid-lens")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`),
  ).toEqual([]);
}

test("every map state of §c.3 renders from the recorded log", async ({ page }, info) => {
  await open(page);
  const svg = map(page);

  await step(page, "certify", 1);
  await through(page, 1);
  await expect(svg).toHaveAttribute("data-last", "grant");
  await expect(svg.locator('.edge[data-org="payroll"]')).toHaveAttribute("data-state", "active");
  await expect(svg.locator('.drawer[data-path="/certificates/"]')).toHaveAttribute(
    "data-key",
    "true",
  );
  await expect(thisStep(page)).toContainText("Alex gave Tamarack access");
  await shot(page, info, "grant created");

  await through(page, 2);
  await expect(svg).toHaveAttribute("data-last", "credential");
  await expect(svg.locator('.drawer[data-path="/certificates/"]')).toHaveAttribute(
    "data-seal",
    "true",
  );
  await expect(svg.locator('.drawer[data-path="/certificates/"]')).toHaveAttribute(
    "data-count",
    "1",
  );
  await expect(thisStep(page)).toContainText("Tamarack delivered a signed credential");
  await shot(page, info, "credential issued");

  await step(page, "itinerary", 2);
  await through(page, 3);
  await expect(svg).toHaveAttribute("data-last", "write");
  await expect(svg.locator('.drawer[data-path="/itinerary/"]')).toHaveAttribute("data-count", "1");
  await shot(page, info, "write");

  await step(page, "permit", 3);
  await through(page, 7);
  await expect(svg).toHaveAttribute("data-last", "read");
  await expect(thisStep(page)).toContainText("Fernhollow read Wilderness first-aid certificate");
  await expect(thisStep(page)).toContainText("allowed by T2 · backcountry permit · the trip ends");
  await expect(svg.locator('.org[data-org="county"]')).toHaveAttribute("data-current", "true");
  await shot(page, info, "read");

  await through(page, 11);
  await expect(svg).toHaveAttribute("data-last", "org-to-org");
  await expect(svg.locator('.arc[data-kind="org-to-org"]')).toHaveCount(1);
  await expect(page.locator("solid-lens .map-caption")).toHaveText(
    "between organisations, not through the pod",
  );
  await shot(page, info, "organisation to organisation");

  await through(page, 13);
  await step(page, "cover", 4);
  await through(page, 14);
  await expect(svg).toHaveAttribute("data-last", "proof");
  await expect(page.locator("solid-lens .map-caption")).toHaveText(
    "answer only: the pod was not opened",
  );
  await shot(page, info, "proof");

  await through(page, 17);
  await expect(svg).toHaveAttribute("data-last", "denied");
  await expect(svg.locator(".wall-403")).toHaveText("403");
  await expect(thisStep(page).locator('[data-kind="denied"]')).toContainText("refused (403)");
  await expect(thisStep(page).locator('[data-kind="denied"]')).toContainText(
    "no rule in force covers it",
  );
  await shot(page, info, "denied");

  await through(page, 18);
  await expect(svg.locator('.edge[data-org="insurer"]')).toHaveAttribute("data-state", "expired");
  await expect(thisStep(page)).toContainText("expiry applied automatically by Waymark");
  await shot(page, info, "grant expired");

  await step(page, "hut", 5, { chips: [{ kind: "no Solid in this step" }] });
  await through(page, 19);
  await expect(svg).toHaveAttribute("data-dimmed", "true");
  await expect(svg.locator(".dim-caption")).toContainText("No Solid here");
  await expect(page.locator('solid-lens .chip[data-kind="no Solid in this step"]')).toHaveAttribute(
    "data-seen",
    "true",
  );
  await shot(page, info, "no Solid");

  await step(page, "withdraw", 6);
  await expect(svg).toHaveAttribute("data-dimmed", "false");
  await through(page, 20);
  await expect(svg.locator('.edge[data-org="county"]')).toHaveAttribute("data-state", "revoked");
  await expect(svg.locator('.drawer[data-path="/itinerary/"]')).toHaveAttribute(
    "data-key",
    "false",
  );
  const pinned = page.locator('solid-lens [data-pinned="revoked"]');
  await expect(pinned).toContainText("Access withdrawn just now");
  await expect(pinned).toContainText(
    "Removed: Fernhollow may read Profile card, Certificates and Itinerary",
  );
  await shot(page, info, "grant revoked");

  await step(page, "retry", 7);
  await through(page, 21);
  const compare = page.locator('solid-lens [data-pinned="compare"]');
  await expect(compare.locator(".ok")).toContainText("200");
  await expect(compare.locator(".ok")).toContainText("Allowed by T2");
  await expect(compare.locator(".no")).toContainText("403");
  await expect(compare.locator(".no")).toContainText(/grant withdrawn (just now|\d+ seconds? ago)/);
  await expect(compare.locator("[data-caveat]")).toHaveText(
    "Fernhollow still holds the copies it was given and any records it must keep. What has ended is its access to Alex's data at source.",
  );
  await expect(thisStep(page).locator('[data-kind="denied"]')).toContainText(
    "Fernhollow tried to read Route plan · refused (403)",
  );
  await shot(page, info, "revoke beat: before and after");
});

test("a host-supplied caveat replaces the default", async ({ page }) => {
  await open(
    page,
    "?caveat={org} keeps what it must by law; its access to {holder}'s pod has ended.",
  );
  await through(page, 20, true);
  await step(page, "retry", 7);
  await through(page, 21);
  await expect(page.locator("solid-lens [data-caveat]")).toHaveText(
    "Fernhollow keeps what it must by law; its access to Alex's pod has ended.",
  );
});

test("a refusal shows 403 in text as well as the animation", async ({ page }) => {
  await open(page);
  await through(page, 16, true);
  await step(page, "cover", 4);
  const before = Number(await map(page).getAttribute("data-travels"));
  await through(page, 17);
  await expect(thisStep(page).locator('[data-kind="denied"]')).toContainText("403");
  await expect(page.locator("solid-lens .map-caption")).toHaveText("refused: 403");
  await expect
    .poll(async () => Number(await map(page).getAttribute("data-travels")))
    .toBeGreaterThan(before);
  await expect(page.locator("solid-lens [aria-live=polite]")).toContainText(
    "Ridgeline tried to read Wilderness first-aid certificate · refused (403)",
  );
});

test("reduced motion removes travel but keeps every state change", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await step(page, "permit", 3);
  await through(page, EVENTS.length);
  const svg = map(page);
  await expect(svg.locator('.edge[data-org="county"]')).toHaveAttribute("data-state", "revoked");
  await expect(svg.locator('.edge[data-org="insurer"]')).toHaveAttribute("data-state", "expired");
  await expect(svg.locator('.edge[data-org="payroll"]')).toHaveAttribute("data-state", "active");
  await expect(svg.locator('.drawer[data-path="/certificates/"]')).toHaveAttribute(
    "data-seal",
    "true",
  );
  await expect(svg).toHaveAttribute("data-last", "write");
  await page.waitForTimeout(800);
  await expect(svg).toHaveAttribute("data-travels", "0");
  await expect(svg.locator(".travel")).toHaveCount(0);
  await expect(page.locator("solid-lens [aria-live=polite] p")).toHaveCount(3);
});

test.describe("accessibility", () => {
  test("axe passes with the dock open and collapsed", async ({ page }) => {
    await open(page, "?replay=1&popout=1");
    await step(page, "retry", 7, { done: true });
    await axe(page);
    for (const tab of ["Grants", "Not shared", "Raw"]) {
      await page.locator("solid-lens [role=tab]", { hasText: tab }).click();
      await axe(page);
    }
    await page.locator("solid-lens .drawer").first().click();
    await expect(page.locator("solid-lens .card-wrap .card")).toBeVisible();
    await axe(page);
    await page.locator("solid-lens .bar .icon-btn[aria-controls]").click();
    await expect(page.locator("solid-lens")).toHaveAttribute("collapsed", "");
    await expect(page.locator("solid-lens .rail")).toBeVisible();
    await axe(page);
  });

  test("axe passes as a bottom sheet at 390 px, peeking and open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "?replay=1");
    await step(page, "retry", 7);
    const lens = page.locator("solid-lens");
    await expect(lens).toHaveAttribute("layout", "sheet");
    await expect(lens).toHaveAttribute("collapsed", "");
    expect((await lens.boundingBox())?.height).toBe(64);
    await expect(page.locator("solid-lens .peek-title")).toContainText("Step 7 of 7");
    await axe(page);
    await page.locator("solid-lens .bar button[aria-expanded=false]").click();
    await expect(lens).not.toHaveAttribute("collapsed", "");
    const box = await lens.boundingBox();
    expect(box?.width).toBe(390);
    await axe(page);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(390);
  });

  test("the dock is keyboard reachable, collapses with Escape and never traps focus", async ({
    page,
  }) => {
    await open(page, "?replay=1");
    await step(page, "permit", 3);
    await page.locator("solid-lens [role=tab]", { hasText: "This step" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("solid-lens [role=tab][aria-selected=true]")).toHaveText("Grants");
    await expect(page.locator("solid-lens table.grants tbody tr")).toHaveCount(3);
    await expect(page.locator('solid-lens table.grants tr[data-org="county"]')).toContainText(
      "withdrawn",
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.locator("solid-lens .card-wrap .card")).toContainText(
      "Permit access request",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("solid-lens")).toHaveAttribute("collapsed", "");
    await expect(page.locator("solid-lens .rail button")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("solid-lens")).not.toHaveAttribute("collapsed", "");
    // Tabbing forward eventually leaves the Lens for the host page again.
    await page.locator("#host-button").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(page.locator("#host-button")).toBeFocused();
  });

  test("the Lens is a labelled landmark and the map has the Grants table as its text alternative", async ({
    page,
  }) => {
    await open(page, "?replay=1");
    await expect(page.getByRole("complementary", { name: "Solid Lens" })).toBeVisible();
    await expect(map(page)).toHaveAttribute(
      "aria-label",
      /The Grants tab holds the same information as a table/,
    );
    await page.locator("solid-lens .map-alt button").click();
    await expect(page.locator("solid-lens [role=tab][aria-selected=true]")).toHaveText("Grants");
  });
});

test("the journey ledger totals equal counts computed in the test, and export as CSV", async ({
  page,
}, info) => {
  await open(page, "?replay=1");
  await page.locator("solid-lens .ledger-link").click();
  const dialog = page.locator("solid-lens dialog.ledger-dialog");
  await expect(dialog).toBeVisible();
  await info.attach("journey ledger", {
    body: await dialog.screenshot(),
    contentType: "image/png",
  });

  // Independent counts from the raw fixture.
  const pods = EVENTS.filter((e): e is { source: "pod" } & PodEvent => e.source === "pod");
  const ok = (e: PodEvent) => e.status >= 200 && e.status < 300 && e.kind !== "denied";
  const writes = pods.filter((e) => e.pod === "alex" && e.kind === "write" && ok(e));
  const orgs = new Set<string>();
  for (const e of EVENTS) {
    if (e.source === "pod") orgs.add(e.actor.org).add(e.pod);
    else {
      orgs.add(e.org);
      for (const r of e.refs ?? [])
        if (r.endsWith("/profile/card#me")) orgs.add(r.split("/")[4] ?? "");
    }
  }
  orgs.delete("alex");
  const expected = {
    organisations: orgs.size,
    grants: new Set(
      pods
        .filter((e) => e.kind === "grant")
        .flatMap((e) => e.acl?.granted.map((g) => g.agent) ?? []),
    ).size,
    credentials: new Set(writes.filter((e) => e.resource?.credential).map((e) => e.path)).size,
    documents: new Set(
      writes
        .filter(
          (e) => e.actor.org !== "alex" && !e.resource?.credential && !e.path.includes("/inbox/"),
        )
        .map((e) => e.path),
    ).size,
    denied: pods.filter((e) => e.kind === "denied").length,
    uploads: new Set(
      writes
        .filter((e) => e.actor.org === "alex" && !e.path.includes("/inbox/"))
        .map((e) => e.path),
    ).size,
  };
  for (const [key, value] of Object.entries(expected)) {
    await expect(dialog.locator(`[data-total="${key}"]`)).toHaveAttribute(
      "data-value",
      String(value),
    );
  }
  const fromApi = await page.evaluate(() => window.harness.lens.totals());
  expect(fromApi.organisations).toBe(expected.organisations);
  expect(fromApi.denied).toBe(expected.denied);

  const table = dialog.locator("table.matrix");
  await expect(table.locator("thead th")).toHaveCount(1 + expected.organisations);
  await expect(
    table.locator('tr[data-path="/itinerary/route-plan"] td[data-org="county"]'),
  ).toHaveAttribute("data-state", "revoked");
  await expect(dialog.getByText("Illustrative")).toBeVisible();
  await expect(dialog.locator("[data-step=permit]")).toContainText(
    "Clock: The permit is valid for 5 days from Day 3.",
  );

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Download as CSV" }).click(),
  ]);
  const path = await download.path();
  const csv = readFileSync(path, "utf8");
  expect(csv.split("\n")[0]).toBe(
    "Drawer,Resource,Path,Tamarack Guides,Fernhollow Parks Service,Kestrel Weather Desk,Ridgeline Rescue Cover,Cobble Hut Network",
  );
  expect(csv).toContain("Itinerary,Route plan,/itinerary/route-plan,");

  await axe(page);
  await dialog.getByRole("button", { name: "Close the ledger" }).click();
  await expect(dialog).toBeHidden();
});

test("runtime notices, a one-time closure, change history and the examiner view, from the host's log", async ({
  page,
}, info) => {
  await open(page, "?fixture=services");
  await page.evaluate(() => window.harness.free());
  await page.evaluate(() => window.harness.through(36));
  const notice = page.locator('solid-lens button.entry[data-kind="notified"]').first();
  await expect(notice).toContainText("Runtime said");
  await expect(notice).toContainText("notified by the demo runtime");
  const closed = page.locator('solid-lens button.entry[data-kind="expire"]').last();
  await expect(closed).toContainText("one-time grant, closed by Alex's wallet");

  // The examiner view opens from the API the tour exposes (`__demo.lens("examiner")`).
  await page.evaluate(() => window.harness.lens.view("examiner"));
  const dialog = page.locator("solid-lens dialog.ledger-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Examiner view" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.locator('[data-obligation="kept-current"]')).toHaveAttribute(
    "data-met",
    "true",
  );
  await expect(dialog.locator('[data-obligation="never"]')).toHaveAttribute("data-met", "false");
  await expect(dialog.locator("table.register tbody tr")).toHaveCount(6);
  await expect(dialog.locator('table.register tr[data-action="refused"]')).toHaveCount(2);
  await expect(dialog.getByText("one-time grant, closed by Alex's wallet").first()).toBeVisible();
  await info.attach("examiner view", { body: await dialog.screenshot(), contentType: "image/png" });
  await axe(page);
  // Keyboard: arrows move between the ledger's tabs.
  await dialog.getByRole("tab", { name: "Examiner view" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.getByRole("tab", { name: "Journey" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(dialog.locator("table.register")).toBeHidden();
  await dialog.getByRole("button", { name: "Close the ledger" }).click();
});

test("a resource card shows who wrote each version", async ({ page }) => {
  await open(page, "?fixture=services");
  await page.evaluate(() => window.harness.free());
  await page.evaluate(() => window.harness.through(11));
  const write = page.locator('solid-lens button.entry[data-kind="write"]').last();
  await write.click();
  const history = page.locator("solid-lens ol.history");
  await expect(history.locator("li")).toHaveCount(1);
  await expect(history.locator("li").first()).toHaveAttribute("data-change", "changed");
  await page.evaluate(() => window.harness.through(19));
  await page.locator('solid-lens button.entry[data-kind="write"]').last().click();
  await expect(history.locator("li")).toHaveCount(2);
  await axe(page);
});

test("the step card emits tour events and reads Skip until the step is done", async ({ page }) => {
  await open(page);
  await step(page, "permit", 3);
  const card = page.locator("solid-lens section.step");
  await expect(card.locator("h3")).toHaveText("Fixture step permit");
  await expect(card.locator('[data-lens="next"]')).toHaveText("Skip ›");
  await card.locator('[data-lens="act"]').click();
  await card.locator('[data-lens="next"]').click();
  await card.locator('[data-lens="back"]').click();
  expect(await page.evaluate(() => window.harness.emitted)).toEqual([
    "lens-act",
    "lens-next",
    "lens-back",
  ]);
  await step(page, "permit", 3, { done: true });
  await expect(card.locator('[data-lens="next"]')).toHaveText("Next ›");
  await expect(card).toContainText("Step done");
  await expect(page.locator('solid-lens .chip[data-kind="pod read"]')).toHaveAttribute(
    "data-seen",
    "false",
  );
  await through(page, 6);
  await expect(page.locator('solid-lens .chip[data-kind="pod read"]')).toHaveAttribute(
    "data-seen",
    "true",
  );
  await expect(page.locator('solid-lens .chip[data-kind="grant"]')).toHaveAttribute(
    "data-seen",
    "true",
  );
  await expect(page.locator('solid-lens .chip[data-kind="denied"]')).toHaveAttribute(
    "data-seen",
    "false",
  );
});

test("free play hides the step card and describes the latest activity", async ({ page }) => {
  await open(page, "?replay=1");
  await page.evaluate(() => window.harness.free());
  await expect(page.locator("solid-lens section.step")).toBeHidden();
  await expect(page.locator("solid-lens .headline")).toHaveText("Alex deleted Route plan draft");
  await expect(thisStep(page).locator("li")).toHaveCount(EVENTS.length);
});

test("pop-out layout fills its window", async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await open(page, "?layout=window&replay=1");
  const box = await page.locator("solid-lens").boundingBox();
  expect(box).toMatchObject({ x: 0, y: 0, width: 420, height: 900 });
  await expect(page.locator("solid-lens .bar button[aria-controls]")).toBeHidden();
});

test("a resource card says what a credential proves and who can read it now", async ({ page }) => {
  await open(page);
  await step(page, "permit", 3);
  await through(page, 8);
  await thisStep(page)
    .locator("button.entry", { hasText: "Fernhollow read Wilderness first-aid certificate" })
    .click();
  const card = page.locator("solid-lens .card-wrap .card");
  await expect(card).toContainText("Issuer");
  await expect(card).toContainText("Tamarack");
  await expect(card).toContainText("Fernhollow checked the certificate's signature");
  await expect(card).toContainText("Who can read it now");
  await expect(card.getByRole("link", { name: "VerifiableCredential" })).toHaveAttribute(
    "href",
    "https://www.w3.org/2018/credentials#VerifiableCredential",
  );
});

test("the withdrawal card stays for the next step only; the before/after card for its own step", async ({
  page,
}) => {
  await open(page);
  await through(page, 19, true);
  await step(page, "withdraw", 6);
  await through(page, 20);
  const revoked = page.locator('solid-lens [data-pinned="revoked"]');
  await expect(revoked).toBeVisible();
  await step(page, "retry", 7);
  await expect(revoked).toContainText("Next: see what Fernhollow gets now.");
  await step(page, "certify", 1);
  await expect(revoked).toHaveCount(0);
  await step(page, "retry", 7);
  await through(page, 21);
  await expect(page.locator('solid-lens [data-pinned="compare"]')).toBeVisible();
  await step(page, "certify", 1);
  await expect(page.locator('solid-lens [data-pinned="compare"]')).toHaveCount(0);
});
