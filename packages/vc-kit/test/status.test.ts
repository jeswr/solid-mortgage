/**
 * Bitstring status lists: deterministic collision-safe index allocation, the
 * hosted list lifecycle (create / revoke / reinstate), and the fail-closed
 * refusal to mutate a tampered, foreign-signed or purpose-mismatched list.
 */

import { describe, expect, test } from "vitest";
import {
  deriveStatusIndex,
  generateKeyPairForSuite,
  MIN_STATUS_LIST_LENGTH,
  StatusIndexAllocator,
  StatusListClient,
  StatusListError,
  verifyCredential,
} from "../src/index.js";
import {
  hostedStatusList,
  ISSUER,
  issueEmployment,
  issuerKey,
  LIST_URL,
  NOW,
  resolveIssuerKey,
  stubHost,
} from "./support.js";

describe("deriveStatusIndex - deterministic issuer-side allocation", () => {
  test("the same seed always yields the same index", () => {
    const first = deriveStatusIndex("https://alex.example/credentials/income");
    const second = deriveStatusIndex("https://alex.example/credentials/income");
    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(MIN_STATUS_LIST_LENGTH);
  });

  test("different seeds spread across the list", () => {
    const indices = new Set(
      Array.from({ length: 64 }, (_, i) => deriveStatusIndex(`https://cred.example/${i}`)),
    );
    expect(indices.size).toBe(64);
  });

  test("collisions probe deterministically past occupied indices", () => {
    const seed = "collision-seed";
    const home = deriveStatusIndex(seed);
    const probed = deriveStatusIndex(seed, { isTaken: (index) => index === home });
    expect(probed).toBe((home + 1) % MIN_STATUS_LIST_LENGTH);
    const probedTwice = deriveStatusIndex(seed, {
      isTaken: (index) => index === home || index === (home + 1) % MIN_STATUS_LIST_LENGTH,
    });
    expect(probedTwice).toBe((home + 2) % MIN_STATUS_LIST_LENGTH);
  });

  test("a full list throws instead of reusing an index", () => {
    expect(() => deriveStatusIndex("seed", { listLength: 8, isTaken: () => true })).toThrowError(
      StatusListError,
    );
  });

  test("the allocator never hands out the same index twice", () => {
    const allocator = new StatusIndexAllocator(64);
    const seen = new Set<number>();
    for (let i = 0; i < 64; i += 1) {
      // Identical seeds force maximal collision pressure.
      const index = allocator.allocate("same-seed");
      expect(seen.has(index)).toBe(false);
      seen.add(index);
    }
    expect(() => allocator.allocate("same-seed")).toThrowError(StatusListError);
  });

  test("reserve() rejects out-of-range indices", () => {
    const allocator = new StatusIndexAllocator(8);
    expect(() => allocator.reserve(8)).toThrowError(StatusListError);
    expect(() => allocator.reserve(-1)).toThrowError(StatusListError);
  });
});

describe("StatusListClient lifecycle", () => {
  test("create is strict - a second create on the same URL fails", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    await expect(list.create({ now: NOW })).rejects.toThrowError(StatusListError);
  });

  test("revoke sets the hosted bit; reinstate clears it", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    expect(await list.readBit(42, { now: NOW })).toBe(false);
    await list.revoke(42, { now: NOW });
    expect(await list.readBit(42, { now: NOW })).toBe(true);
    await list.reinstate(42, { now: NOW });
    expect(await list.readBit(42, { now: NOW })).toBe(false);
  });

  test("an out-of-range index is refused (never treated as clear)", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    await expect(list.readBit(MIN_STATUS_LIST_LENGTH, { now: NOW })).rejects.toThrowError(
      StatusListError,
    );
    await expect(list.revoke(-1, { now: NOW })).rejects.toThrowError(StatusListError);
  });

  test("entry() emits the spec shape for issuance", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    expect(list.entry(7)).toEqual({
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: "7",
      statusListCredential: LIST_URL,
    });
  });

  test("a tampered hosted list is refused for mutation (fail-closed)", async () => {
    const host = stubHost();
    const list = await hostedStatusList(host);
    const hosted = host.resources.get(LIST_URL);
    if (hosted === undefined) throw new Error("list not hosted");
    // Flip a byte inside the encodedList payload.
    host.resources.set(LIST_URL, {
      ...hosted,
      body: hosted.body.replace(
        /"encodedList":\s*"u([A-Za-z0-9_-])/,
        (_m, c: string) => `"encodedList": "u${c === "A" ? "B" : "A"}`,
      ),
    });
    await expect(list.revoke(1, { now: NOW })).rejects.toThrowError(StatusListError);
  });

  test("a hosted list signed by a FOREIGN key is refused for mutation", async () => {
    const host = stubHost();
    const foreignKey = await generateKeyPairForSuite(`${ISSUER}#key-1`, "Ed25519");
    // Host a list signed by the foreign key at the same URL...
    const foreign = new StatusListClient({
      url: LIST_URL,
      issuer: ISSUER,
      key: foreignKey,
      fetch: host.fetch,
    });
    await foreign.create({ now: NOW });
    // ...the legitimate client refuses to mutate it.
    const list = new StatusListClient({
      url: LIST_URL,
      issuer: ISSUER,
      key: await issuerKey(),
      fetch: host.fetch,
    });
    await expect(list.revoke(1, { now: NOW })).rejects.toThrowError(StatusListError);
  });

  test("a purpose-mismatched list makes credential verification fail closed", async () => {
    const host = stubHost();
    // Host a SUSPENSION list where the credential's entry claims REVOCATION.
    const suspensionList = new StatusListClient({
      url: LIST_URL,
      issuer: ISSUER,
      key: await issuerKey(),
      fetch: host.fetch,
      statusPurpose: "suspension",
    });
    await suspensionList.create({ now: NOW });
    const revocationList = new StatusListClient({
      url: LIST_URL,
      issuer: ISSUER,
      key: await issuerKey(),
      fetch: host.fetch,
    });
    const issued = await issueEmployment(revocationList, 6);
    const outcome = await verifyCredential(issued.body, {
      expectShape: "employment-income-credential",
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    });
    expect(outcome.verified).toBe(false);
    expect(outcome.errors.map((error) => error.code)).toContain("STATUS_UNREACHABLE");
  });

  test("an EXPIRED hosted list fails credential verification closed", async () => {
    const host = stubHost();
    const list = new StatusListClient({
      url: LIST_URL,
      issuer: ISSUER,
      key: await issuerKey(),
      fetch: host.fetch,
    });
    // List validity ended yesterday.
    await list.create({
      now: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000),
      validUntil: new Date(NOW.getTime() - 24 * 60 * 60 * 1000),
    });
    const issued = await issueEmployment(list, 8);
    const outcome = await verifyCredential(issued.body, {
      expectShape: "employment-income-credential",
      now: NOW,
      resolveKey: resolveIssuerKey,
      statusFetch: host.fetch,
    });
    expect(outcome.verified).toBe(false);
    expect(outcome.errors.map((error) => error.code)).toContain("STATUS_UNREACHABLE");
  });

  test("concurrent update loses (412) and surfaces as a retryable error", async () => {
    const host = stubHost();
    await hostedStatusList(host);
    const hosted = host.resources.get(LIST_URL);
    if (hosted === undefined) throw new Error("list not hosted");
    const raced: typeof host.fetch = async (input, init) => {
      if (init?.method === "PUT") {
        // Another writer bumps the version between our GET and PUT.
        host.resources.set(LIST_URL, { ...hosted, version: hosted.version + 1 });
      }
      return host.fetch(input, init);
    };
    const racyList = new StatusListClient({
      url: LIST_URL,
      issuer: ISSUER,
      key: await issuerKey(),
      fetch: raced,
    });
    await expect(racyList.revoke(1, { now: NOW })).rejects.toThrowError(/412|retry/);
  });
});
