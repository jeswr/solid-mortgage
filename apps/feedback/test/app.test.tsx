// AUTHORED-BY Claude Opus 5.5
import { FEEDBACK_DEMOS } from "@mortgage/feedback";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { DEMOS } from "../../welcome/src/demos.ts";
import { App } from "../src/App.tsx";
import { readArrival } from "../src/feedback/FeedbackPage.tsx";

const at = (path: string) => memoryLocation({ path }).hook;

function answerStatus(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      ok
        ? new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })
        : new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } }),
    ),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the feedback page", () => {
  it("lists exactly the welcome page's demos", () => {
    expect(FEEDBACK_DEMOS.map((d) => ({ id: d.id, title: d.title }))).toEqual(
      DEMOS.map((d) => ({ id: d.id, title: d.title })),
    );
  });

  for (const path of ["/", "/nope"]) {
    it(`renders the trust banner on ${path}, without a feedback link to itself`, () => {
      answerStatus({}, false);
      render(<App hook={at(path)} />);
      expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
      expect(
        screen.getByText(/Every organisation in these demos is a fictional organisation\./),
      ).toBeTruthy();
    });
  }

  it("shows the questionnaire and says sending is off when the API is not there", async () => {
    answerStatus({}, false);
    render(<App hook={at("/")} search="?from=lender&demo=motor-claim" />);
    expect(await screen.findByText("Sending feedback is not switched on yet.")).toBeTruthy();
    expect(screen.getByRole("form", { name: "Feedback questionnaire" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Send/ })).toBeNull();
    // The demo the visitor came from is preselected, and its debrief questions are shown.
    const demo = screen.getByRole("checkbox", { name: "Motor claim" }) as HTMLInputElement;
    expect(demo.checked).toBe(true);
    expect(
      screen.getByLabelText("Thinking back to Motor claim, what stood out first, and then what?"),
    ).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "EDMA Solid forum" })[0]?.getAttribute("href")).toBe(
      "https://edmconnect.edmcouncil.org/solidforum/home",
    );
  });

  it("offers the interview, a quick note and the questionnaire when the interviewer is on", async () => {
    answerStatus({ interviewer: true, sending: true });
    render(<App hook={at("/")} search="" />);
    fireEvent.click(await screen.findByRole("button", { name: "Start the interview" }));
    expect(screen.getByRole("log", { name: "Feedback conversation" }).textContent).toContain(
      "What is your role",
    );
    expect(screen.getByRole("button", { name: "Send what I've said so far" })).toBeTruthy();
  });

  it("reads only well-formed arrival parameters", () => {
    expect(readArrival("?from=lender-desk&demo=mortgage")).toEqual({
      from: "lender-desk",
      demos: ["mortgage"],
    });
    expect(readArrival("?from=%3Cscript%3E&demo=nope")).toEqual({ from: "", demos: [] });
  });
});
