// AUTHORED-BY Claude Opus 5.5
/**
 * Acceptance test 14 (build-plan.md §4, design.md §b.2): each of the 13 organisation apps has
 * its own title, favicon and theme-color. Home-screen screenshots are attached to the report
 * for the manual "no two apps look interchangeable" sign-off.
 */
import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { appPath, ORG_SLUGS, ORGS, requireApps } from "./support/site.ts";

test("14 Distinct apps: own title, favicon and theme-color; home screenshots attached", async ({
  page,
  request,
}) => {
  test.setTimeout(5 * 60_000);
  requireApps([...ORG_SLUGS]);
  const seen = {
    favicons: new Map<string, string>(),
    themes: new Map<string, string>(),
    titles: new Map<string, string>(),
  };
  const problems: string[] = [];
  for (const slug of ORG_SLUGS) {
    const org = ORGS[slug];
    await page.goto(appPath(slug));
    await page.waitForLoadState("networkidle");
    const title = await page.title();
    const theme =
      (await page.locator('meta[name="theme-color"]').first().getAttribute("content")) ?? "";
    const iconHref = await page.locator('link[rel~="icon"]').first().getAttribute("href");
    if (!title.includes(org.title))
      problems.push(`${slug}: title "${title}" does not name "${org.title}"`);
    if (theme.toLowerCase() !== org.themeColor.toLowerCase()) {
      problems.push(`${slug}: theme-color ${theme || "missing"}, registry says ${org.themeColor}`);
    }
    let iconHash = "";
    if (iconHref === null) problems.push(`${slug}: no favicon link`);
    else {
      const iconUrl = new URL(iconHref, page.url()).href;
      if (!new URL(iconUrl).pathname.startsWith(`/${slug}/`)) {
        problems.push(`${slug}: favicon ${iconUrl} is not served from its own /${slug}/ base`);
      }
      const icon = await request.get(iconUrl);
      if (!icon.ok()) problems.push(`${slug}: favicon ${iconUrl} answers ${icon.status()}`);
      else
        iconHash = createHash("sha256")
          .update(await icon.body())
          .digest("hex");
    }
    for (const [kind, value] of [
      ["titles", title],
      ["themes", theme.toLowerCase()],
      ["favicons", iconHash],
    ] as const) {
      if (value === "") continue;
      const other = seen[kind].get(value);
      if (other !== undefined)
        problems.push(`${slug} shares its ${kind.slice(0, -1)} with ${other}`);
      seen[kind].set(value, slug);
    }
    await test.info().attach(`home-${slug}.png`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
  }
  expect(problems).toEqual([]);
});
