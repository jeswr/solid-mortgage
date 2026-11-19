// AUTHORED-BY Claude Opus 5.5
import { ORG_SLUGS } from "@mortgage/demo-kit/registry";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryLocation } from "wouter/memory-location";
import { App } from "../src/App.tsx";
import { EXPLAINER, FOOTER_LINE, HEADLINE, HONESTY_STATEMENT } from "../src/copy.ts";
import { DEMOS } from "../src/demos.ts";
import { LINKS } from "../src/site.ts";

const at = (path: string) => memoryLocation({ path }).hook;
const missing = async () => false;
const present = async () => true;

vi.mock("../src/guided-tour.ts", () => ({
  mountJourneyLedger: vi.fn(async () => () => undefined),
  readGrantsOnRecord: vi.fn(async () => []),
  startFresh: vi.fn(async () => undefined),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("every route", () => {
  for (const path of [
    "/",
    "/watch/mortgage",
    "/watch/moving-house",
    "/watch/motor-claim",
    "/watch/small-dollar-lending",
    "/watch/business-kyb",
    "/honesty",
    "/journey",
    "/nope",
  ]) {
    it(`renders the trust banner and the fictional line on ${path}`, () => {
      render(<App hook={at(path)} probe={missing} />);
      expect(screen.getByRole("note", { name: "Concept demonstration notice" })).toBeTruthy();
      expect(
        screen.getByText("Every organisation in these demos is a fictional organisation."),
      ).toBeTruthy();
      expect(screen.getByText(FOOTER_LINE)).toBeTruthy();
      expect(screen.getByText(/All organisations and people are fictional\./)).toBeTruthy();
    });
  }
});

describe("home", () => {
  it("leads with the headline and the explainer for data managers", () => {
    render(<App hook={at("/")} probe={missing} />);
    expect(screen.getByRole("heading", { level: 1, name: HEADLINE })).toBeTruthy();
    expect(screen.getByText(EXPLAINER)).toBeTruthy();
    expect(screen.getAllByText(/EDMA Solid Community of Practice/).length).toBeGreaterThan(0);
  });

  it("keeps the sections in the order design.md §e gives", () => {
    const { container } = render(<App hook={at("/")} probe={missing} />);
    const order = [...container.querySelectorAll("main > section")].map((s) => s.id || "hero");
    expect(order).toEqual(["hero", "demos", "sectors", "apps", "real", "join"]);
  });

  it("lists the mortgage first, with Watch and Try it yourself", () => {
    render(<App hook={at("/")} probe={missing} />);
    const list = screen.getByRole("list", { name: "Demos" });
    const cards = within(list).getAllByRole("article");
    expect(cards).toHaveLength(DEMOS.length);
    const first = cards[0] as HTMLElement;
    expect(within(first).getByRole("heading", { level: 3 }).textContent).toBe("Buying a home");
    expect(
      within(first)
        .getByRole("link", { name: /^Watch/ })
        .getAttribute("href"),
    ).toBe("/watch/mortgage");
    expect(
      within(first)
        .getByRole("link", { name: /^Try it yourself/ })
        .getAttribute("href"),
    ).toBe("/welcome/?tour=mortgage&step=welcome");
  });

  it("shows coming demos as Coming next with no links at all", () => {
    render(<App hook={at("/")} probe={missing} />);
    const coming = DEMOS.filter((demo) => demo.status === "coming");
    expect(coming.length).toBeGreaterThan(0);
    for (const demo of coming) {
      const card = document.getElementById(`demo-${demo.id}`) as HTMLElement;
      expect(within(card).getByText("Coming next")).toBeTruthy();
      expect(card.querySelectorAll("a, button")).toHaveLength(0);
    }
  });

  it("says Video coming soon while the recording is missing", async () => {
    render(<App hook={at("/")} probe={missing} />);
    // One player per live demo card.
    const placeholders = await screen.findAllByRole("img", { name: /video coming soon/ });
    expect(placeholders).toHaveLength(DEMOS.filter((demo) => demo.status === "live").length);
    expect(document.querySelector("video")).toBeNull();
  });

  it("offers a play button and seekable chapters once the recording exists", async () => {
    render(<App hook={at("/")} probe={present} />);
    expect(
      (await screen.findAllByRole("button", { name: /Play the narrated video/ }))[0],
    ).toBeTruthy();
    const mortgage = DEMOS[0];
    for (const chapter of mortgage?.chapters ?? []) {
      expect(
        screen.getByRole("button", { name: `Play from chapter: ${chapter.title}` }),
      ).toBeTruthy();
    }
  });

  it("opens the video in place with captions and preload none", async () => {
    render(<App hook={at("/")} probe={present} />);
    // The mortgage card comes first.
    (await screen.findAllByRole("button", { name: /Play the narrated video/ }))[0]?.click();
    const video = await waitFor(() => {
      const found = document.querySelector("video");
      if (found === null) throw new Error("no video yet");
      return found;
    });
    expect(video.getAttribute("preload")).toBe("none");
    expect(video.getAttribute("poster")).toBe("/video/mortgage/poster.jpg");
    const captions = video.querySelector('track[kind="captions"]');
    expect(captions?.getAttribute("src")).toBe("/video/mortgage/captions.vtt");
    expect(captions?.hasAttribute("default")).toBe(true);
    expect(video.querySelector("source")?.getAttribute("src")).toBe("/video/mortgage/video.mp4");
  });

  it("has the four sectors strip", () => {
    render(<App hook={at("/")} probe={missing} />);
    const strip = document.querySelector(".sector-strip") as HTMLElement;
    const labels = [...strip.querySelectorAll(".sector-strip__label")].map((n) => n.textContent);
    expect(labels).toEqual([
      "Buy a home",
      "Insure it",
      "Tell everyone you moved",
      "Hand over a medication list",
    ]);
    for (const link of strip.querySelectorAll("a")) {
      const target = link.getAttribute("href")?.slice(1) ?? "";
      expect(document.getElementById(target)).not.toBeNull();
    }
  });

  it("launches every organisation app in its own colours", () => {
    render(<App hook={at("/")} probe={missing} />);
    const tiles = within(screen.getByRole("list", { name: "Organisation apps" })).getAllByRole(
      "link",
    );
    expect(tiles).toHaveLength(ORG_SLUGS.length);
    expect(tiles.map((tile) => tile.getAttribute("href"))).toContain("/lender-desk/");
    for (const tile of tiles) {
      expect(tile.style.getPropertyValue("--tile-bg")).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("links the weekly meeting, the forum and the source", () => {
    render(<App hook={at("/")} probe={missing} />);
    expect(
      screen.getByRole("link", { name: /Register for the weekly meeting/ }).getAttribute("href"),
    ).toBe(LINKS.meeting);
    expect(screen.getByRole("link", { name: /Join the forum/ }).getAttribute("href")).toBe(
      LINKS.forum,
    );
    expect(screen.getAllByRole("link", { name: /source code/i })[0]?.getAttribute("href")).toBe(
      LINKS.source,
    );
    expect(LINKS).toEqual({
      meeting: "https://hub.edmcouncil.org/NC__Event?id=a0lVQ0000061alxYAA",
      forum: "https://edmconnect.edmcouncil.org/solidforum/home",
      source: "https://github.com/jeswr/solid-mortgage",
    });
  });
});

describe("watch pages", () => {
  it("gives the mortgage video its transcript, chapter by chapter", () => {
    render(<App hook={at("/watch/mortgage")} probe={missing} />);
    const mortgage = DEMOS[0];
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(mortgage?.videoTitle);
    for (const chapter of mortgage?.chapters ?? []) {
      expect(document.getElementById(`chapter-${chapter.id}`)).not.toBeNull();
      expect(chapter.transcript.length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/Thirteen applications\. Eight grants\./)).toBeTruthy();
  });

  it("gives a coming demo a Coming next page without a player", () => {
    render(<App hook={at("/watch/small-business-loan")} probe={present} />);
    expect(screen.getByRole("heading", { name: "This demo is being built" })).toBeTruthy();
    expect(document.querySelector("video, .player")).toBeNull();
  });

  it("answers an unknown demo with not found", () => {
    render(<App hook={at("/watch/no-such-demo")} probe={missing} />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});

describe("honesty and ledger", () => {
  it("states what is real and what is simulated in the design's words", () => {
    render(<App hook={at("/honesty")} />);
    expect(screen.getByText(HONESTY_STATEMENT)).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    // A header row, then one row per organisation app.
    expect(screen.getAllByRole("row")).toHaveLength(ORG_SLUGS.length + 1);
  });

  it("redirects the old ledger path to /journey", async () => {
    const location = memoryLocation({ path: "/ledger", record: true });
    render(<App hook={location.hook} />);
    await waitFor(() => expect(location.history?.at(-1)).toBe("/journey"));
  });

  it("mounts the journey ledger where the tour's last step points", async () => {
    const { mountJourneyLedger } = await import("../src/guided-tour.ts");
    render(<App hook={at("/journey")} />);
    await waitFor(() => expect(mountJourneyLedger).toHaveBeenCalled());
    expect(document.querySelector('[data-tour="journey-ledger"]')?.id).toBe("journey-ledger");
    const mount = document.querySelector("[data-journey-ledger-mount]");
    expect(mount?.id).toBe("journey-ledger");
    expect(screen.getByRole("heading", { level: 1, name: "Journey ledger" })).toBeTruthy();
  });

  it("lists the grants on record in Alex's pod, read when the page opens", async () => {
    const { readGrantsOnRecord } = await import("../src/guided-tour.ts");
    vi.mocked(readGrantsOnRecord).mockResolvedValueOnce([
      { code: "G4", name: "Apply", state: "revoked", to: "Juniper", when: "Day 40" },
      { code: "G8", name: "Service", state: "active", to: "Marigold", when: "Day 39" },
    ]);
    render(<App hook={at("/journey")} />);
    const table = await screen.findByRole("table");
    expect(readGrantsOnRecord).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Grants on record in Alex's pod" })).toBeTruthy();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      "G4JuniperApplyWithdrawnDay 40",
      "G8MarigoldServiceActiveDay 39",
    ]);
  });

  it("shows no grants table when the pod has no grant on record", async () => {
    const { readGrantsOnRecord } = await import("../src/guided-tour.ts");
    render(<App hook={at("/journey")} />);
    await waitFor(() => expect(readGrantsOnRecord).toHaveBeenCalled());
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("the guided tour", () => {
  it("restarts the demo before a plain click on Try it yourself follows the link", async () => {
    const { startFresh } = await import("../src/guided-tour.ts");
    render(<App hook={at("/")} probe={missing} />);
    const first = within(screen.getByRole("list", { name: "Demos" })).getAllByRole("article")[0];
    const link = within(first as HTMLElement).getByRole("link", { name: /^Try it yourself/ });
    const modified = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
    link.dispatchEvent(modified);
    expect(startFresh).not.toHaveBeenCalled();
    link.click();
    await waitFor(() => expect(startFresh).toHaveBeenCalledTimes(1));
    expect(vi.mocked(startFresh).mock.calls[0]?.[0]).toMatch(
      /\/welcome\/\?tour=mortgage&step=welcome$/,
    );
    expect(link.getAttribute("aria-busy")).toBe("true");
  });

  it("shows the Start button of step 1 only on a page the tour opened", () => {
    render(<App hook={at("/")} probe={missing} />);
    expect(document.querySelector('[data-tour="tour-start"]')).toBeNull();
    cleanup();
    window.history.replaceState(null, "", "/?tour=mortgage&step=welcome");
    render(<App hook={at("/")} probe={missing} />);
    const start = document.querySelector('[data-tour="tour-start"]');
    expect(start?.textContent).toBe("Start");
    expect(start?.getAttribute("href")).toBe("/wallet/");
  });
});
