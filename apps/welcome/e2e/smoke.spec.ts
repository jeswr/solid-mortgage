// AUTHORED-BY Claude Opus 5.5
import { ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { expect, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoHorizontalScroll,
  open,
  podRequest,
  WCAG_21,
} from "../../../test-support/e2e.ts";

const ROUTES = [
  "./",
  "./watch/mortgage",
  "./watch/moving-house",
  "./watch/motor-claim",
  "./watch/small-dollar-lending",
  "./watch/business-kyb",
  "./watch/medication-handover",
  "./watch/reusable-kyc",
  "./honesty",
  "./journey",
  "./nope",
];

test.describe("every route", () => {
  for (const route of ROUTES) {
    test(`${route} has the banner, noindex, its theme colour and no axe violations`, async ({
      page,
    }) => {
      await page.goto(route);
      await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
      await expect(
        page.getByText("Every organisation in these demos is a fictional organisation."),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex, nofollow",
      );
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#13212E");
      await expect(page.getByRole("contentinfo")).toContainText(
        "All organisations and people are fictional.",
      );
      await expectAccessible(page, WCAG_21);
    });
  }
});

test("home: title, order, demos, launcher and join-in links", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle("Solid demos for EDMA members");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "See what changes when the customer holds the data.",
  );
  const sections = await page
    .locator("main > section")
    .evaluateAll((nodes) => nodes.map((n) => n.id || "hero"));
  expect(sections).toEqual(["hero", "solid", "demos", "adoption", "apps", "real", "join"]);

  await expect(
    page.getByRole("list", { name: "Single interactions" }).getByRole("article").first(),
  ).toHaveAttribute("id", "demo-moving-house");
  const mortgage = page.locator("#demo-mortgage");
  await expect(mortgage.getByRole("heading", { level: 3 })).toHaveText("Buying a home");
  await expect(mortgage.getByRole("link", { name: /^Read the story first/ })).toHaveAttribute(
    "href",
    "/welcome/story/mortgage",
  );
  await expect(mortgage.getByRole("link", { name: /^Try it yourself/ })).toHaveAttribute(
    "href",
    "/welcome/?tour=mortgage&step=welcome",
  );
  for (const card of await page.locator(".demo-card--coming").all()) {
    await expect(card.getByText("Coming next")).toBeVisible();
    await expect(card.locator("a, button")).toHaveCount(0);
  }

  const tiles = page.getByRole("list", { name: "Organisation apps" }).getByRole("link");
  // One tile per organisation app in the registry.
  await expect(tiles).toHaveCount(ORG_SLUGS.length);

  await expect(page.getByRole("link", { name: /Register for the weekly meeting/ })).toHaveAttribute(
    "href",
    "https://hub.edmcouncil.org/NC__Event?id=a0lVQ0000061alxYAA",
  );
  await expect(page.getByRole("link", { name: /Join the forum/ })).toHaveAttribute(
    "href",
    "https://edmconnect.edmcouncil.org/solidforum/home",
  );
  await expect(page.getByRole("link", { name: /source code on GitHub/ })).toHaveAttribute(
    "href",
    "https://github.com/jeswr/solid-mortgage",
  );
});

test("home: every link inside the welcome app leads to a real page", async ({ page }) => {
  await page.goto("./");
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  const own = [
    ...new Set(
      hrefs.filter((href) => new URL(href).pathname.startsWith("/welcome/")).map((h) => h),
    ),
  ];
  expect(own.length).toBeGreaterThan(3);
  for (const href of own) {
    const url = new URL(href);
    await page.goto(url.pathname);
    await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
    if (url.hash.length > 1) {
      await expect(page.locator(url.hash)).toHaveCount(1);
    }
  }
});

test("without a published recording the player says Video coming soon and fetches nothing", async ({
  page,
}) => {
  const videoGets: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/video/") && request.method() !== "HEAD")
      videoGets.push(request.url());
  });
  // The site ships recordings (video/published/); take them away to see the fallback.
  await page.route("**/video/**", (route) =>
    route.request().method() === "HEAD" ? route.fulfill({ status: 404 }) : route.continue(),
  );
  await page.goto("./");
  await expect(page.getByRole("img", { name: /video coming soon/ }).first()).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  // Chapters point at the transcript instead of offering controls that would do nothing.
  await page.getByRole("link", { name: "Read chapter in the transcript: Closing" }).click();
  await expect(page).toHaveURL(/\/welcome\/watch\/mortgage#chapter-closing$/);
  await expect(page.locator("#chapter-closing")).toBeInViewport();
  expect(videoGets).toEqual([]);
});

test("with a published recording the poster plays in place, preload none, with captions", async ({
  page,
}) => {
  const gets: string[] = [];
  await page.route("**/video/mortgage/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "HEAD" && url.pathname.endsWith("video.mp4")) {
      await route.fulfill({ status: 200, headers: { "content-type": "video/mp4" } });
      return;
    }
    gets.push(url.pathname);
    if (url.pathname.endsWith(".vtt")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "text/vtt" },
        body: "WEBVTT\n\nintro\n00:00:00.000 --> 00:00:30.000\nThirteen applications, one pod\n",
      });
      return;
    }
    // The MP4 body itself is never needed here: leave it pending.
  });
  await page.goto("./");
  const play = page.getByRole("button", { name: /Play the narrated video: A mortgage on Solid/ });
  await expect(play).toBeVisible();
  await expect(page.getByRole("button", { name: /Play from chapter: Closing/ })).toBeVisible();
  expect(gets.filter((path) => path.endsWith(".mp4"))).toEqual([]);
  await play.click();
  const video = page.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("poster", "/video/mortgage/poster.jpg");
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute(
    "src",
    "/video/mortgage/captions.vtt",
  );
  await expect(video.locator("source")).toHaveAttribute("src", "/video/mortgage/video.mp4");
  await expectAccessible(page, WCAG_21);
});

test("watch page carries the full transcript", async ({ page }) => {
  await page.goto("./watch/mortgage");
  await expect(page).toHaveTitle("Watch: Buying a home · Solid demos for EDMA members");
  await expect(page.getByRole("heading", { name: "Transcript" })).toBeVisible();
  await expect(page.locator(".transcript__chapter")).toHaveCount(8);
  await expect(
    page.getByText("Thirteen applications. Nine grants. No documents uploaded."),
  ).toBeVisible();
});

test("honesty page reports the runtime mode and the fictional organisations", async ({ page }) => {
  await page.goto("./honesty");
  await expect(page.locator(".runtime-status")).not.toHaveAttribute(
    "data-runtime-mode",
    "checking",
  );
  // A header row, then one row per organisation app in the registry.
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(ORG_SLUGS.length + 1);
});

test("the old ledger path redirects to the journey ledger", async ({ page }) => {
  await page.goto("./ledger");
  await expect(page).toHaveURL(/\/welcome\/journey$/);
  await expect(page.locator('#journey-ledger[data-tour="journey-ledger"]')).toHaveCount(1);
});

test("the journey ledger renders the pods' request log", async ({ page }) => {
  test.setTimeout(240_000);
  // Any organisation app's page starts the pods; its first reads are in the log.
  await open(page, "/payroll/?tour=off");
  await expect(page.getByRole("status").filter({ hasText: "Connecting" })).toHaveCount(0, {
    timeout: 60_000,
  });
  await page.goto("./journey");
  const ledger = page.locator("#journey-ledger journey-ledger");
  await expect(ledger).toHaveCount(1, { timeout: 60_000 });
  await expect(ledger.getByRole("heading", { level: 2 }).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("The ledger appears here after you run a demo.")).toHaveCount(0);
  await expect(page.locator("solid-lens")).toHaveCount(1);
});

test.describe("at 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of ["./", "./watch/mortgage", "./honesty", "./journey"]) {
    test(`${route} fits without horizontal scrolling and passes axe`, async ({ page }) => {
      await page.goto(route);
      await expectNoHorizontalScroll(page);
      await expectAccessible(page, WCAG_21);
    });
  }
});

test("the self-hosted font loads from the app's own origin", async ({ page }) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
  expect(fontRequests.length).toBeGreaterThan(0);
  for (const url of fontRequests) expect(new URL(url).pathname).toMatch(/^\/welcome\/assets\//);
});

test("keyboard: the skip link is first and moves focus to the content", async ({ page }) => {
  await page.goto("./");
  // The page renders on the client, after the load event: press Tab only once it is there.
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeAttached();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("Try it yourself restarts the pods from the seed, then opens step 1 here", async ({
  page,
}) => {
  test.setTimeout(240_000);
  // Start the pods from an organisation app and leave a resource the seed does not have.
  await open(page, "/payroll/?tour=off");
  // A controlling worker is not yet a started runtime: wait until the app has connected, or the
  // PUT can arrive first and get the runtime's 503.
  await expect(page.getByRole("status").filter({ hasText: "Connecting" })).toHaveCount(0, {
    timeout: 60_000,
  });
  const marker = "alex/e2e-try-it-marker";
  const put = await podRequest(page, "wallet", marker, {
    body: "left by the welcome e2e suite",
    contentType: "text/plain",
    method: "PUT",
  });
  expect(put.status, put.body).toBeLessThan(300);
  expect((await podRequest(page, "wallet", marker)).status).not.toBe(404);

  await page.goto("./");
  await page
    .locator("#demo-mortgage")
    .getByRole("link", { name: /^Try it yourself/ })
    .click();
  await page.waitForURL(/\/welcome\/\?tour=mortgage&step=welcome$/, { timeout: 120_000 });

  // Step 1 of the tour: this page, its Start button, the step card in the Solid Lens.
  await expect(page.locator('[data-tour="tour-start"]')).toBeVisible();
  await expect(page.locator('[data-tour="tour-start"]')).toHaveAttribute("href", "/wallet/");
  await expect(page.locator("solid-lens")).toHaveCount(1, { timeout: 60_000 });
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  expect((await podRequest(page, "wallet", marker)).status).toBe(404);
});
