// AUTHORED-BY Claude Opus 5.5
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const ROUTES = [
  "./",
  "./watch/mortgage",
  "./watch/moving-house",
  "./honesty",
  "./ledger",
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
      await expectNoAxeViolations(page);
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
  expect(sections).toEqual(["hero", "demos", "sectors", "apps", "real", "join"]);

  const cards = page.getByRole("list", { name: "Demos" }).getByRole("article");
  await expect(cards.first().getByRole("heading", { level: 3 })).toHaveText("Buying a home");
  await expect(cards.first().getByRole("link", { name: /^Try it yourself/ })).toHaveAttribute(
    "href",
    "/wallet/?tour=mortgage&step=welcome",
  );
  for (const card of await page.locator(".demo-card--coming").all()) {
    await expect(card.getByText("Coming next")).toBeVisible();
    await expect(card.locator("a, button")).toHaveCount(0);
  }

  const tiles = page.getByRole("list", { name: "Organisation apps" }).getByRole("link");
  await expect(tiles).toHaveCount(13);

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
  const play = page.getByRole("button", { name: /Play the narrated video/ });
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
  await expectNoAxeViolations(page);
});

test("watch page carries the full transcript", async ({ page }) => {
  await page.goto("./watch/mortgage");
  await expect(page).toHaveTitle("Watch: Buying a home · Solid demos for EDMA members");
  await expect(page.getByRole("heading", { name: "Transcript" })).toBeVisible();
  await expect(page.locator(".transcript__chapter")).toHaveCount(8);
  await expect(
    page.getByText("Thirteen applications. Eight grants. No documents uploaded."),
  ).toBeVisible();
});

test("honesty page reports the runtime mode and the fictional organisations", async ({ page }) => {
  await page.goto("./honesty");
  await expect(page.locator(".runtime-status")).not.toHaveAttribute(
    "data-runtime-mode",
    "checking",
  );
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(14);
});

test("ledger page leaves a marked mount point", async ({ page }) => {
  await page.goto("./ledger");
  await expect(page.locator("#journey-ledger[data-journey-ledger-mount]")).toHaveCount(1);
});

test.describe("at 390 px", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of ["./", "./watch/mortgage", "./honesty", "./ledger"]) {
    test(`${route} fits without horizontal scrolling and passes axe`, async ({ page }) => {
      await page.goto(route);
      await expectNoHorizontalScroll(page);
      await expectNoAxeViolations(page);
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
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});
