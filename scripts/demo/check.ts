/**
 * `pnpm demo:check` — drive the WHOLE guided click-through in a headless browser against a
 * running `pnpm demo`, the way a visitor would: accept each app's concept-demo notice,
 * press "Do it for me" on every action step, wait for the app's own success marker, press
 * Next. Then check the pod activity log recorded the journey's writes and access changes.
 *
 *   pnpm demo            # in one terminal
 *   pnpm demo:check      # in another (DEMO_URL overrides http://127.0.0.1:4400;
 *                        #  DEMO_SCREENSHOTS=<dir> saves one screenshot per step)
 */
import { chromium } from "@playwright/test";
import { GUIDED_STEPS } from "./steps.ts";

const base = (process.env.DEMO_URL ?? "http://127.0.0.1:4400").replace(/\/+$/, "");
const STEP_TIMEOUT = 180_000;

interface LoggedEvent {
  kind: string;
  summary: string;
  path?: string;
  app?: string;
}

async function main(): Promise<void> {
  const reset = await fetch(`${base}/__demo/reset`, { method: "POST" });
  if (!reset.ok) throw new Error(`demo is not running at ${base} (reset: ${reset.status})`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(`page error on ${page.url()}: ${error.message}`));

  await page.goto(`${base}/?guided=1`);
  const guide = page.locator('section[aria-label="Guided demo"]');

  for (const [index, step] of GUIDED_STEPS.entries()) {
    const started = Date.now();
    await page.waitForURL(
      (url) => url.pathname.replace(/\/+$/, "") === (step.path.replace(/\/+$/, "") || ""),
      {
        timeout: 60_000,
      },
    );
    await guide
      .locator(`text=Step ${index + 1} of ${GUIDED_STEPS.length}`)
      .waitFor({ timeout: 30_000 });

    const notice = page.getByRole("button", { name: "I understand — enter the demo" });
    if (await notice.isVisible().catch(() => false)) await notice.click();

    if (step.action !== undefined) {
      const doIt = guide.locator("[data-guide-do]");
      await doIt.waitFor({ state: "visible", timeout: 60_000 });
      await page.waitForFunction(
        () => {
          const host = document.getElementById("solid-demo-overlay");
          const button = host?.shadowRoot?.querySelector(
            "[data-guide-do]",
          ) as HTMLButtonElement | null;
          return button !== null && button !== undefined && !button.disabled && !button.hidden;
        },
        undefined,
        { timeout: 60_000 },
      );
      await doIt.click();
      await guide.locator("[data-guide-status][data-done]").waitFor({ timeout: STEP_TIMEOUT });
    } else if (step.doneSelector !== undefined) {
      await page.locator(step.doneSelector).first().waitFor({ timeout: 60_000 });
    }
    if (process.env.DEMO_SCREENSHOTS) {
      await page.screenshot({
        path: `${process.env.DEMO_SCREENSHOTS}/${String(index + 1).padStart(2, "0")}-${step.id}.png`,
      });
    }
    console.log(`  ✓ ${index + 1}. ${step.title} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    await guide.locator("[data-guide-next]").click();
  }
  await guide.waitFor({ state: "hidden", timeout: 10_000 });

  const events = (await fetch(`${base}/__demo/activity.json`).then((r) =>
    r.json(),
  )) as LoggedEvent[];
  const count = (kind: string) => events.filter((event) => event.kind === kind).length;
  const expectations: [string, boolean][] = [
    ["sign-ins recorded", count("auth") >= 4],
    ["pod reads recorded", count("read") >= 10],
    [
      "assets credential written",
      events.some((e) => e.kind === "write" && e.path === "/mortgage/credentials/assets"),
    ],
    ["access rules changed", count("access") >= 2],
    [
      "a grant was logged",
      events.some((e) => e.kind === "access" && e.summary.includes("granted")),
    ],
    [
      "a revocation was logged",
      events.some((e) => e.kind === "access" && e.summary.includes("removed")),
    ],
    [
      "application written via the assistant",
      events.some((e) => e.kind === "write" && e.path === "/mortgage/application"),
    ],
    [
      "loan officer wrote the final decision",
      events.filter(
        (e) =>
          e.kind === "write" && e.path === "/mortgage/decision" && e.app === "Mortgage Origination",
      ).length >= 2,
    ],
  ];
  for (const [label, ok] of expectations) {
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failures.push(label);
  }
  console.log(
    `  activity: ${events.length} events (${count("read")} reads, ${count("write")} writes, ${count("access")} access changes, ${count("auth")} sign-ins)`,
  );
  await browser.close();
  if (failures.length > 0) {
    console.error(`\nFAILED:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log("\nGuided click-through completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
