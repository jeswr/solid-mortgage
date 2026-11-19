// AUTHORED-BY Claude Opus 5.5
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import {
  expectAccessible,
  expectNoSideScroll,
  expectTrustSurfaces,
  WCAG_21,
} from "../../../test-support/e2e.ts";

const FORUM = "https://edmconnect.edmcouncil.org/solidforum/home";

/** Answer /api/feedback/status as a configured deployment would. */
async function configured(page: Page, status = { interviewer: true, sending: true }) {
  await page.route("**/api/feedback/status", (route) => route.fulfill({ json: status }));
}

test.describe("every route", () => {
  for (const route of ["./", "./nope"]) {
    test(`${route} has the banner, noindex, its theme colour, no axe violations and fits 390 px`, async ({
      page,
    }) => {
      await page.goto(route);
      await expectTrustSurfaces(page);
      await expect(page.getByRole("note", { name: "Concept demonstration notice" })).toBeVisible();
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#13212E");
      await expect(page.getByRole("contentinfo")).toContainText(
        "All organisations and people are fictional.",
      );
      // The feedback page's banner does not link to itself.
      await expect(page.locator("[data-demo-feedback]")).toHaveCount(0);
      if (route === "./")
        await expect(page.getByRole("form", { name: "Feedback questionnaire" })).toBeVisible();
      await expectAccessible(page, WCAG_21);
      await expectNoSideScroll(page);
    });
  }
});

test("every other app's banner links here, remembering where the visitor came from", async ({
  page,
}) => {
  await page.goto("/welcome/");
  const link = page.locator("[data-demo-feedback]");
  await expect(link).toHaveAttribute("href", "/feedback/?from=welcome");
  await link.click();
  await expect(page).toHaveURL(/\/feedback\/\?from=welcome$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Give feedback");
});

test("not switched on: the questionnaire, a plain notice, a download and the forum", async ({
  page,
}) => {
  await page.goto("./");
  // Nothing to download before any answer.
  await expect(page.getByRole("button", { name: "Download my answers" })).toBeDisabled();
  await page.goto("./?from=lender&demo=mortgage");
  await expect(page).toHaveTitle("Give feedback · Solid demos for EDMA members");
  const notice = page
    .getByRole("status")
    .filter({ hasText: "Sending feedback is not switched on yet." });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole("link", { name: "EDMA Solid forum" })).toHaveAttribute(
    "href",
    FORUM,
  );
  await expect(page.getByRole("button", { name: /^Send/ })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Name (optional)" })).toHaveCount(0);
  const download = page.getByRole("button", { name: "Download my answers" });

  // The demo the visitor came from is preselected; its debrief questions follow.
  await expect(page.getByRole("checkbox", { name: "Buying a home" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Motor claim" }).check();
  await page
    .getByLabel("Thinking back to Motor claim, what stood out first, and then what?")
    .fill("The repairer losing access when the job ended.");
  await page
    .getByRole("group", { name: "Overall, how easy or difficult was Motor claim to follow?" })
    .getByRole("radio", { name: "6 out of 7" })
    .check();
  await page.getByRole("radio", { name: "Insurer" }).check();
  await page
    .getByRole("group", {
      name: "How likely are you to explore Solid further with your organisation?",
    })
    .getByRole("radio", { name: "4 out of 5" })
    .check();
  await page
    .getByLabel("What is the one thing you would change in the demos first?")
    .fill("Shorter videos");
  await page.getByRole("radio", { name: "Yes, the forum" }).check();

  const downloading = page.waitForEvent("download");
  await download.click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe("solid-mortgage-feedback.zip");
  const path = await file.path();
  const zip = readFileSync(path);
  // A stored ZIP: the record is readable as plain bytes inside it.
  expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
  const text = zip.toString("utf8");
  expect(text).toContain('"from": "lender"');
  expect(text).toContain('"mode": "questionnaire"');
  expect(text).toContain('"seq_motor-claim": 6');
  expect(text).toContain('"likelihood": 4');
  expect(text).toContain('"community": "Yes, the forum"');
  expect(text).toContain("The repairer losing access when the job ended.");

  await expect(
    page.getByRole("status").filter({ hasText: "Saved as solid-mortgage-feedback.zip" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Join the EDMA Solid forum" })).toHaveAttribute(
    "href",
    FORUM,
  );
  await expect(page.getByRole("link", { name: "Register for the weekly meeting" })).toHaveAttribute(
    "href",
    "https://hub.edmcouncil.org/NC__Event?id=a0lVQ0000061alxYAA",
  );
  await expectNoSideScroll(page);
});

test("sending on, interviewer off: the questionnaire sends and shows the reference", async ({
  page,
}) => {
  await configured(page, { interviewer: false, sending: true });
  let sent: Record<string, unknown> | undefined;
  await page.route("**/api/feedback/submit", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { reference: 31 } });
  });
  await page.goto("./");
  await expect(page.getByText("Sending feedback is not switched on yet.")).toHaveCount(0);
  await page.getByLabel("Tell us about something that worked").fill("The Lens made it click.");
  await page.getByRole("textbox", { name: "Email (optional)" }).fill("member@example.org");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your reference is #31" })).toBeVisible();
  const record = sent?.record as {
    answers: Record<string, unknown>;
    contact: { email: string };
    mode: string;
  };
  expect(record.mode).toBe("questionnaire");
  expect(record.answers.general).toBe("The Lens made it click.");
  expect(record.answers.summary).toBe("• The Lens made it click.");
  expect(record.contact.email).toBe("member@example.org");
  expect(sent?.receipts).toEqual([]);
});

test("configured: the interviewer leads, the read-back is confirmed and the feedback is sent", async ({
  page,
}) => {
  await configured(page);
  let turns = 0;
  await page.route("**/api/feedback/turn", async (route) => {
    const body = route.request().postDataJSON();
    turns++;
    if (turns === 1) {
      expect(body.messages.at(-1).content).toBe("I run data governance at an insurer.");
      await route.fulfill({
        json: {
          reply: "Thanks. How likely are you to explore Solid further with your organisation?",
          answers: { ...body.answers, context_role: "Data governance at an insurer" },
          question: { id: "likelihood" },
          done: false,
        },
      });
    } else if (turns === 2) {
      expect(body.answers.likelihood).toBe(4);
      await route.fulfill({
        json: {
          reply:
            "• You run data governance.\n• You would explore it further.\nDid I get that right?",
          answers: { ...body.answers, summary: "• Data governance\n• Likely to explore" },
          question: { id: "confirmed" },
          done: false,
        },
      });
    } else {
      expect(body.answers.confirmed).toBe("yes");
      await route.fulfill({
        json: { reply: "Thank you. Ready to send.", answers: body.answers, done: true },
      });
    }
  });
  let record: Record<string, unknown> | undefined;
  await page.route("**/api/feedback/submit", async (route) => {
    record = route.request().postDataJSON().record;
    await route.fulfill({ json: { reference: 12 } });
  });
  await page.goto("./?from=insurer");
  await page.getByRole("button", { name: "Start the interview" }).click();
  await expect(page.getByRole("log", { name: "Feedback conversation" })).toContainText(
    "What is your role",
  );
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("I run data governance at an insurer.");
  await page.getByRole("button", { name: "Send answer" }).click();
  await page.getByRole("button", { name: "4 out of 5" }).click();
  await page.getByRole("button", { name: "Yes, that's right" }).click();
  await expect(page.getByText("Ready to send", { exact: true })).toBeVisible();
  await expectAccessible(page, WCAG_21);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your reference is #12" })).toBeVisible();
  expect(record).toMatchObject({
    mode: "interview",
    pathway: "guided",
    metadata: { from: "insurer" },
    answers: { likelihood: 4, confirmed: "yes", summary: "• Data governance\n• Likely to explore" },
  });
  expect(record?.transcript).toHaveLength(7);
});

test("configured: when the interviewer fails, the answers carry over to the questionnaire", async ({
  page,
}) => {
  await configured(page);
  await page.route("**/api/feedback/turn", (route) =>
    route.fulfill({ status: 502, contentType: "text/plain", body: "RAW_UPSTREAM_ERROR" }),
  );
  const ids: unknown[] = [];
  await page.route("**/api/feedback/submit", (route) => {
    ids.push(route.request().postDataJSON().record.id);
    return route.fulfill({
      status: 413,
      contentType: "text/html",
      body: "<h1>RAW_PLATFORM_ERROR</h1>",
    });
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Start the interview" }).click();
  await page.getByLabel("Your answer", { exact: true }).fill("Enterprise architect");
  await page.getByRole("button", { name: "Send answer" }).click();
  await expect(page.getByText("The interviewer couldn't reply.")).toBeVisible();
  await expect(
    page.getByLabel("What is your role, and what does your work with data involve day to day?"),
  ).toHaveValue("Enterprise architect");
  await page.getByRole("button", { name: "Send feedback" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Download my answers");
  await expect(page.getByText(/RAW_(UPSTREAM|PLATFORM)_ERROR/)).toHaveCount(0);
  // A retry sends the same submission id, so the server can store the feedback only once.
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect.poll(() => ids.length).toBe(2);
  expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(ids[1]).toBe(ids[0]);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my answers" }).click();
  expect((await downloading).suggestedFilename()).toBe("solid-mortgage-feedback.zip");
});

test("interviewer on, sending off: the page says where interview answers go", async ({ page }) => {
  await configured(page, { interviewer: true, sending: false });
  await page.goto("./");
  const privacy = page.getByRole("complementary", { name: "How your feedback is handled" });
  await expect(privacy).toContainText("sent to Anthropic's Claude");
  await expect(privacy).not.toContainText("Nothing is sent anywhere");
  await expect(page.getByText("Sending feedback is not switched on yet.")).toBeVisible();
});
