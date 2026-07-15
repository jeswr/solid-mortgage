/**
 * Scene-4 freshness (decision 0007): `isFresh` window semantics and the
 * one-click re-issue flow - same claims, fresh window, old index revoked.
 */

import { describe, expect, test } from "vitest";
import {
  deriveStatusIndex,
  isFresh,
  ReissueError,
  reissueCredential,
  StatusIndexAllocator,
  verifyCredential,
} from "../src/index.js";
import {
  BACKDATED_VALIDITY,
  DAY_MS,
  hostedStatusList,
  ISSUER,
  issueEmployment,
  issuerKey,
  NOW,
  parseTurtle,
  resolveIssuerKey,
  stubHost,
} from "./support.js";

describe("isFresh - decision 0007 window semantics", () => {
  const window = {
    validFrom: BACKDATED_VALIDITY.validFrom.toISOString(),
    validUntil: BACKDATED_VALIDITY.validUntil.toISOString(),
  };

  test("fresh inside the window", () => {
    expect(isFresh(window, NOW)).toBe(true);
    expect(isFresh(window, BACKDATED_VALIDITY.validFrom)).toBe(true);
    expect(isFresh(window, BACKDATED_VALIDITY.validUntil)).toBe(true);
  });

  test("stale after validUntil (the scene-4 beat)", () => {
    expect(isFresh(window, new Date(NOW.getTime() + 15 * DAY_MS))).toBe(false);
  });

  test("not yet fresh before validFrom", () => {
    expect(isFresh(window, new Date(NOW.getTime() - 31 * DAY_MS))).toBe(false);
  });

  test("fail-closed: a missing or malformed window is never fresh", () => {
    expect(isFresh({}, NOW)).toBe(false);
    expect(isFresh({ validFrom: window.validFrom }, NOW)).toBe(false);
    expect(isFresh({ validUntil: window.validUntil }, NOW)).toBe(false);
    expect(isFresh({ validFrom: "garbage", validUntil: window.validUntil }, NOW)).toBe(false);
    // Date.parse-lenient but non-xsd:dateTime lexicals are refused too.
    expect(isFresh({ validFrom: "2026", validUntil: window.validUntil }, NOW)).toBe(false);
    expect(isFresh({ validFrom: window.validFrom, validUntil: "2027" }, NOW)).toBe(false);
    // Regex-shaped but calendar-impossible values are refused (NaN guard).
    expect(isFresh({ validFrom: "2026-02-30T00:00:00Z", validUntil: window.validUntil }, NOW)).toBe(
      false,
    );
  });
});

describe("reissueCredential - same claims, fresh window, old one revoked", () => {
  test("the full scene-4 flow", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const allocator = new StatusIndexAllocator();
    allocator.reserve(42);
    const old = await issueEmployment(list, 42);

    // 30 days later the old credential is genuinely stale...
    const later = new Date(NOW.getTime() + 15 * DAY_MS);
    expect(
      isFresh(
        {
          validFrom: BACKDATED_VALIDITY.validFrom.toISOString(),
          validUntil: BACKDATED_VALIDITY.validUntil.toISOString(),
        },
        later,
      ),
    ).toBe(false);

    // ...one click re-issues it.
    const result = await reissueCredential(parseTurtle(old.body), {
      key: await issuerKey(),
      now: later,
      validity: { validFrom: later, validUntil: new Date(later.getTime() + 14 * DAY_MS) },
      statusList: list,
      allocator,
    });

    expect(result.revokedIndex).toBe(42);
    expect(result.newIndex).not.toBe(42);
    // Same claims (verbatim), fresh window.
    expect(result.issued.body).toContain("8500");
    expect(result.issued.body).toContain("Ridgeline Analytics LLC");
    expect(result.issued.body).toContain(later.toISOString());

    const verifyOptions = {
      expectShape: "employment-income-credential" as const,
      now: later,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    };
    // The replacement verifies...
    const fresh = await verifyCredential(result.issued.body, verifyOptions);
    expect(fresh.errors).toEqual([]);
    expect(fresh.verified).toBe(true);
    expect(isFresh(fresh.credential ?? {}, later)).toBe(true);
    // ...and the old credential is now revoked (in addition to being expired).
    const stale = await verifyCredential(old.body, verifyOptions);
    expect(stale.verified).toBe(false);
    expect(stale.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(["EXPIRED", "STATUS_REVOKED"]),
    );
  });

  test("a distinct replacement IRI keeps both documents addressable", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const allocator = new StatusIndexAllocator();
    allocator.reserve(42);
    const old = await issueEmployment(list, 42);
    const result = await reissueCredential(parseTurtle(old.body), {
      key: await issuerKey(),
      now: NOW,
      validity: BACKDATED_VALIDITY,
      statusList: list,
      allocator,
      credentialId: "https://alex.example/credentials/income-2",
    });
    expect(result.issued.credentialId).toBe("https://alex.example/credentials/income-2");
    const outcome = await verifyCredential(result.issued.body, {
      expectShape: "employment-income-credential",
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    });
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
  });

  test("refuses a credential whose status entry points at a FOREIGN list", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const foreignHost = stubHost();
    const foreignList = await hostedStatusList(foreignHost, {
      url: "https://issuer.example/status/other",
    });
    const old = await issueEmployment(foreignList, 42);
    await expect(
      reissueCredential(parseTurtle(old.body), {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
      }),
    ).rejects.toThrowError(ReissueError);
  });

  test("refuses a foreign-issuer credential", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const old = await issueEmployment(list, 42);
    const foreign = parseTurtle(old.body.replaceAll(ISSUER, "https://mallory.example/org"));
    await expect(
      reissueCredential(foreign, {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
      }),
    ).rejects.toThrowError(ReissueError);
  });

  test("refuses a TAMPERED old document - re-issue must never be a signing oracle", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const old = await issueEmployment(list, 42);
    // The holder edits their own pod copy: income 8500 -> 9900 (inside the
    // SHACL range, so only the signature can catch it).
    const tampered = parseTurtle(old.body.replace("8500", "9900"));
    await expect(
      reissueCredential(tampered, {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
      }),
    ).rejects.toThrowError(/INVALID_SIGNATURE|refusing to re-sign/);
  });

  test("refuses an old document whose proof was stripped", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const old = await issueEmployment(list, 42);
    const store = parseTurtle(old.body);
    for (const link of store.match(null, null, null)) {
      if (link.predicate.value === "https://w3id.org/security#proof") store.delete(link);
    }
    await expect(
      reissueCredential(store, {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
      }),
    ).rejects.toThrowError(/NO_PROOF|refusing to re-sign/);
  });

  test("refuses an ALREADY-REVOKED old credential (explicit issuer decision)", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const old = await issueEmployment(list, 42);
    await list.revoke(42, { now: NOW });
    await expect(
      reissueCredential(parseTurtle(old.body), {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
      }),
    ).rejects.toThrowError(/already revoked/);
  });

  test("reserves the old index before allocating - collision cannot revoke the replacement", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const old = await issueEmployment(list, 42);
    // A replacement id whose deterministic home index IS the old index, in a
    // small allocator that never had 42 reserved (partial rehydration).
    const listLength = 64;
    let replacementId = "";
    for (let i = 0; ; i += 1) {
      const candidate = `https://alex.example/credentials/income-${i}`;
      if (deriveStatusIndex(candidate, { listLength }) === 42) {
        replacementId = candidate;
        break;
      }
    }
    const result = await reissueCredential(parseTurtle(old.body), {
      key: await issuerKey(),
      now: NOW,
      validity: BACKDATED_VALIDITY,
      statusList: list,
      allocator: new StatusIndexAllocator(listLength),
      credentialId: replacementId,
    });
    expect(result.revokedIndex).toBe(42);
    expect(result.newIndex).not.toBe(42);
  });

  test("refuses a malformed replacement credentialId (IRI injection guard)", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const old = await issueEmployment(list, 42);
    await expect(
      reissueCredential(parseTurtle(old.body), {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
        credentialId: "https://alex.example/x> <https://evil.example/y",
      }),
    ).rejects.toThrowError(ReissueError);
  });

  test("refuses a malformed old document", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    await expect(
      reissueCredential(parseTurtle(""), {
        key: await issuerKey(),
        now: NOW,
        validity: BACKDATED_VALIDITY,
        statusList: list,
        allocator: new StatusIndexAllocator(),
      }),
    ).rejects.toThrowError(ReissueError);
  });
});
