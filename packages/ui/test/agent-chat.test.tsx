// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  AgentConversation,
  AgentSteps,
  agentStepsHeading,
  ConsentRequest,
} from "../src/agent-chat.js";

afterEach(cleanup);

test("ConsentRequest with defaults allows the required source only", () => {
  const allowed: (readonly string[])[] = [];
  render(
    <ConsentRequest
      onAllow={(ids) => allowed.push(ids)}
      onManual={() => undefined}
      sources={[
        { id: "pod", name: "Alex's pod", reads: "Use Alex's pod to prepare the application." },
        { id: "email", name: "Demo rent receipts", optional: true, reads: "Optional." },
      ]}
    />,
  );
  const pod = document.querySelector<HTMLInputElement>('[data-consent-source="pod"]');
  const email = document.querySelector<HTMLInputElement>('[data-consent-source="email"]');
  expect(pod?.checked).toBe(true);
  expect(email?.checked).toBe(false);
  document.querySelector<HTMLButtonElement>("[data-consent-allow]")?.click();
  expect(allowed).toEqual([["pod"]]);
});

test("ConsentRequest without optional flags keeps every source selected", () => {
  const allowed: (readonly string[])[] = [];
  render(
    <ConsentRequest
      onAllow={(ids) => allowed.push(ids)}
      onManual={() => undefined}
      sources={[
        { id: "a", name: "A", reads: "a" },
        { id: "b", name: "B", reads: "b" },
      ]}
    />,
  );
  screen.getByRole("button", { name: "Allow selected sources" }).click();
  expect(allowed).toEqual([["a", "b"]]);
});

test("AgentSteps heading reflects the actual state", () => {
  expect(agentStepsHeading([{ id: "a", label: "A", state: "running" }])).toBe("Working on it");
  expect(agentStepsHeading([{ id: "a", label: "A", state: "done" }])).toBe("Checks complete");
  expect(agentStepsHeading([{ id: "a", label: "A", state: "failed" }])).toBe("Some steps failed");
  const { rerender } = render(
    <AgentSteps heading="auto" steps={[{ id: "a", label: "A", state: "done" }]} />,
  );
  expect(screen.getByText("Checks complete")).toBeDefined();
  rerender(<AgentSteps heading="Application saved" steps={[]} />);
  expect(screen.getByText("Application saved")).toBeDefined();
  rerender(<AgentSteps steps={[]} />);
  expect(document.querySelector("[data-agent-steps-heading]")).toBeNull();
});

test("AgentConversation names the engine only under About the assistant", () => {
  render(
    <AgentConversation
      agentName="Your assistant"
      engine="Claude Opus 5.5 through your local Claude Code"
      messages={[]}
    />,
  );
  expect(screen.getByText("Demo assistant. It acts only after you say yes.")).toBeDefined();
  const about = document.querySelector("details[data-agent-about]");
  expect(about?.hasAttribute("open")).toBe(false);
  expect(about?.textContent).toContain("Claude Opus 5.5");
});
