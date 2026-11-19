// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 10 (build-plan.md §4, design.md §b.2, AGENTS.md rule 5): the concept-demo
 * banner, the fictional-organisation line and `noindex` on every route of every app, including
 * not-found pages; and `check:insignia` finds no real organisation in the built site.
 */
import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import {
  APP_SLUGS,
  appPath,
  DIST,
  isConvenerApp,
  ORGS,
  type OrgSlug,
  REPO_ROOT,
  requireApps,
} from "./support/site.ts";

/** Routes per app: its home, and a path no app serves (the not-found page). */
const ROUTES = ["", "no-such-page-e2e/at-all"];

for (const slug of APP_SLUGS) {
  test(`10 Trust: banner, fictional line and noindex on every route of ${slug}`, async ({
    page,
  }) => {
    requireApps([slug]);
    for (const route of ROUTES) {
      const url = appPath(slug, route);
      const response = await page.goto(url);
      expect(response?.status(), `GET ${url}`).toBe(200);
      expect(response?.headers()["x-robots-tag"], `X-Robots-Tag on ${url}`).toMatch(/noindex/);
      await expect(
        page.getByRole("note", { name: "Concept demonstration notice" }),
        `trust banner on ${url}`,
      ).toBeVisible();
      // The convener's own pages (the front door, the feedback page) name no organisation.
      if (!isConvenerApp(slug)) {
        const line = `${ORGS[slug as OrgSlug].organisation} is a fictional organisation.`;
        await expect(page.getByText(line).first(), `"${line}" on ${url}`).toBeVisible();
      }
      await expect(page.locator('meta[name="robots"]'), `robots meta on ${url}`).toHaveAttribute(
        "content",
        /noindex/,
      );
    }
  });
}

test("10 Trust: check:insignia finds no real organisation name in the built site", () => {
  requireApps([...APP_SLUGS]);
  try {
    execFileSync(process.execPath, ["tools/check-insignia.mjs", DIST], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    throw new Error(`check-insignia failed on dist/:\n${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
});
