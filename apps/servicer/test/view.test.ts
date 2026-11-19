// AUTHORED-BY Claude Opus 5.5
import type { LensEntry } from "@mortgage/demo-kit/contracts";
import { describe, expect, it } from "vitest";
import { EMPTY_LOG, foldEntry, type PodLog } from "../src/log.ts";
import {
  canRead,
  connection,
  handoffUrl,
  nextDebit,
  pendingRequestPath,
  requestedItems,
  TABS,
  usd,
} from "../src/view.ts";

let id = 0;
const write = (pod: string, path: string, status = 201): LensEntry =>
  ({
    actor: { org: "alex", viaAgent: false, webid: "https://x/pods/alex/profile/card#me" },
    at: "2026-10-12T10:00:00Z",
    id: ++id,
    kind: "write",
    method: "PUT",
    path,
    pod,
    source: "pod",
    status,
  }) as LensEntry;

const logOf = (...paths: string[]): PodLog =>
  paths.map((path) => write("alex", path)).reduce(foldEntry, EMPTY_LOG);

describe("the connection, from what the pods answered", () => {
  it("walks from Juniper's notice to connected", () => {
    expect(connection(EMPTY_LOG)).toBe("awaiting-notice");
    const steps = [
      "/mortgage/juniper/servicing-transfer-notice",
      "/inbox/request-g8-4f2a",
      "/consents/g8-given",
      "/mortgage/servicing/transfer-notice",
    ];
    const states = steps.map((_, index) => connection(logOf(...steps.slice(0, index + 1))));
    expect(states).toEqual(["ready", "requested", "approved", "connected"]);
  });

  it("ends when G8 is withdrawn or expires", () => {
    expect(connection(logOf("/mortgage/servicing/transfer-notice", "/consents/g8-withdrawn"))).toBe(
      "ended",
    );
    expect(connection(logOf("/consents/g8-given", "/consents/g8-expired"))).toBe("ended");
  });

  it("reads only while G8 is active", () => {
    expect(["approved", "connected"].every((state) => canRead(state as never))).toBe(true);
    expect(["ready", "requested", "ended"].some((state) => canRead(state as never))).toBe(false);
  });

  it("finds the pending request's path", () => {
    expect(pendingRequestPath(logOf("/inbox/request-g8-4f2a"))).toBe("/inbox/request-g8-4f2a");
    expect(pendingRequestPath(logOf("/inbox/request-g7-1"))).toBeUndefined();
  });

  it("ignores a request in another pod", () => {
    const log = foldEntry(EMPTY_LOG, write("servicer", "/inbox/request-g8-x"));
    expect(connection(log)).toBe("awaiting-notice");
  });
});

describe("the hand-off and the page copy", () => {
  it("sends only the request and the return address to the wallet", () => {
    const url = new URL(handoffUrl("http://h/pods/alex/inbox/request-g8-1"), "http://h");
    expect(url.pathname).toBe("/wallet/requests");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      request: "http://h/pods/alex/inbox/request-g8-1",
      return: "/servicer/connect?from=wallet",
    });
  });

  it("lists G8's three reads and its drawer from the grant", () => {
    expect(requestedItems().map((item) => [item.path, item.access])).toEqual([
      ["profile/contact", "Read"],
      ["insurance/", "Read"],
      ["banking/payment-mandate", "Read"],
      ["mortgage/servicing/", "Read and Write"],
    ]);
  });

  it("finds the next debit date on or after today", () => {
    expect(nextDebit("2026-10-01", 1).toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(nextDebit("2026-10-12", 1).toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(nextDebit("2026-12-20", 1).toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("has five tabs and formats money with cents", () => {
    expect(TABS.map((tab) => tab.label)).toEqual([
      "Welcome",
      "Connect",
      "Account",
      "Escrow",
      "Insurance",
    ]);
    expect(usd(2659.03)).toBe("$2,659.03");
  });
});
