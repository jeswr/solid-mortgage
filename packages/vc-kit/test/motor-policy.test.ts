// AUTHORED-BY Claude Opus 5.5
/**
 * The motor policy credential (motor claim demo, flows.md section 7): issued by the insurer into
 * the claimant's pod and checked at source by the claims desk. vc-kit is security-critical, so
 * the new kind gets the full fail-closed matrix: it issues and verifies on calendar time, and
 * every tamper, transplant, wrong shape, untrusted issuer, revocation and malformed input fails.
 */

import { MORT } from "@mortgage/data-model";
import { DataFactory, Parser, Store } from "n3";
import { beforeAll, describe, expect, test } from "vitest";
import {
  asCredentialKind,
  credentialKindOfTypes,
  credentialSchemaIri,
  type DayClock,
  instantOn,
  issueCredential,
  type MotorPolicyClaims,
  StatusListClient,
  targetClassOf,
  type VerifyCredentialOptions,
  validityOn,
  verifyCredential,
} from "../src/index.js";
import {
  ISSUER,
  issuerKey,
  LIST_URL,
  resolveIssuerKey,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";

const { literal, namedNode, quad } = DataFactory;

/** Demo day 1 is Monday 3 August 2026, as in the demo calendar. */
const calendar: DayClock = {
  clock(day, time = "09:00") {
    const date = new Date(Date.UTC(2026, 7, 3 + (day - 1)));
    return new Date(`${date.toISOString().slice(0, 10)}T${time}:00-04:00`);
  },
};

const CLAIMS: MotorPolicyClaims = {
  coverages: ["Collision", "Liability", "Comprehensive"],
  deductibleUsd: 500,
  kind: "motor-policy-credential",
  policyEnd: "2027-07-01",
  policyNumber: "WM-AU-771204",
  policyStart: "2026-07-01",
  vehicle: { color: "Blue", name: "Larkspur Tern", vin: "DEMOVIN0000000001" },
};
const CREDENTIAL_ID = "https://holder.example/insurance/motor-policy";
const SCHEMA = "https://schema.org/";

let host: StubHost;
let list: StatusListClient;
let body = "";

const parse = (turtle: string) => new Store(new Parser({ format: "text/turtle" }).parse(turtle));
const codesOf = (outcome: { errors: readonly { code: string }[] }) =>
  outcome.errors.map((error) => error.code);

function options(overrides: Partial<VerifyCredentialOptions> = {}): VerifyCredentialOptions {
  return {
    expectShape: "motor-policy-credential",
    now: instantOn(calendar, 81, "10:00"),
    resolveKey: resolveIssuerKey,
    statusFetch: host.fetch,
    trustedIssuers: [ISSUER],
    ...overrides,
  };
}

async function issue(claims: MotorPolicyClaims, index: number, day = 20) {
  return issueCredential({
    claims,
    credentialId: CREDENTIAL_ID,
    issuer: ISSUER,
    key: await issuerKey(),
    kind: "motor-policy-credential",
    status: list.entry(index),
    subject: SUBJECT,
    validity: validityOn(calendar, day, { validDays: 365 }),
  });
}

beforeAll(async () => {
  host = stubHost();
  list = new StatusListClient({
    fetch: host.fetch,
    issuer: ISSUER,
    key: await issuerKey(),
    listLifetimeMs: 400 * 24 * 60 * 60 * 1000,
    url: LIST_URL,
  });
  await list.create({ now: instantOn(calendar, 1, "08:00") });
  body = (await issue(CLAIMS, 300)).body;
}, 30_000);

describe("the motor-policy-credential kind is registered", () => {
  test("its schema, target class and type lookups agree", () => {
    expect(credentialSchemaIri("motor-policy-credential")).toBe(
      "https://solid-mortgage-vocab.vercel.app/shapes#MotorPolicyCredentialShape",
    );
    expect(targetClassOf("motor-policy-credential")).toBe(MORT.MotorPolicyCredential);
    expect(asCredentialKind("motor-policy-credential")).toBe("motor-policy-credential");
    expect(
      credentialKindOfTypes([
        "https://www.w3.org/2018/credentials#VerifiableCredential",
        MORT.MotorPolicyCredential,
      ]),
    ).toBe("motor-policy-credential");
    // The claim file documents are shapes, not credentials.
    expect(asCredentialKind("damage-report")).toBeUndefined();
    expect(asCredentialKind("claim-case")).toBeUndefined();
  });
});

describe("issue and verify on calendar time", () => {
  test("verifies during the policy window, with the claims as issued", async () => {
    const outcome = await verifyCredential(body, options());
    expect(outcome.errors).toEqual([]);
    expect(outcome.verified).toBe(true);
    expect(outcome.credential?.issuer).toBe(ISSUER);
    const store = parse(body);
    const subject = namedNode(SUBJECT);
    expect(store.getObjects(subject, `${SCHEMA}identifier`, null)[0]?.value).toBe("WM-AU-771204");
    expect(
      store
        .getObjects(subject, MORT.coverage, null)
        .map((term) => term.value)
        .sort(),
    ).toEqual(["Collision", "Comprehensive", "Liability"]);
  });

  test("is not yet valid before issue and expired after its window", async () => {
    expect(
      codesOf(await verifyCredential(body, options({ now: instantOn(calendar, 19) }))),
    ).toContain("NOT_YET_VALID");
    expect(
      codesOf(await verifyCredential(body, options({ now: instantOn(calendar, 400) }))),
    ).toContain("EXPIRED");
  });

  test("revocation at source flips it to STATUS_REVOKED, reinstatement back", async () => {
    const revocable = await issue(CLAIMS, 301);
    await list.revoke(301, { now: instantOn(calendar, 80) });
    const outcome = await verifyCredential(revocable.body, options());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("STATUS_REVOKED");
    await list.reinstate(301, { now: instantOn(calendar, 80) });
    expect((await verifyCredential(revocable.body, options())).verified).toBe(true);
  });
});

describe("tampering and misuse fail closed", () => {
  test("a raised deductible or an added coverage breaks the signature", async () => {
    const lowered = parse(body);
    const subject = namedNode(SUBJECT);
    lowered.add(quad(subject, namedNode(MORT.coverage), literal("Rental car")));
    const outcome = await verifyCredential(lowered, options());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");

    const raised = parse(body.replace(/500(\.0)?(?=\b)/, "50"));
    expect((await verifyCredential(raised, options())).verified).toBe(false);
  });

  test("a policy moved to another driver breaks the signature", async () => {
    const outcome = await verifyCredential(
      body.replaceAll(SUBJECT, "https://mallory.example/profile/card#me"),
      options(),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });

  test("a car swapped for another breaks the signature", async () => {
    const outcome = await verifyCredential(body.replace("Larkspur Tern", "Calder Vane"), options());
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("INVALID_SIGNATURE");
  });

  test("an extra, undisclosed subject property fails the closed shape and the signature", async () => {
    const store = parse(body);
    store.add(quad(namedNode(SUBJECT), namedNode(`${SCHEMA}telephone`), literal("(614) 555-0142")));
    const outcome = await verifyCredential(store, options());
    expect(codesOf(outcome)).toEqual(
      expect.arrayContaining(["SHAPE_VIOLATION", "INVALID_SIGNATURE"]),
    );
  });

  test("presented as another kind, it fails the shape gate", async () => {
    for (const expectShape of [
      "evidence-of-insurance-credential",
      "identity-credential",
    ] as const) {
      const outcome = await verifyCredential(body, options({ expectShape }));
      expect(outcome.verified).toBe(false);
      expect(codesOf(outcome)).toContain("SHAPE_VIOLATION");
    }
  });

  test("an issuer outside the allowlist is refused", async () => {
    const outcome = await verifyCredential(
      body,
      options({ trustedIssuers: ["https://pods.example/pods/state/profile/card#me"] }),
    );
    expect(outcome.verified).toBe(false);
    expect(codesOf(outcome)).toContain("UNTRUSTED_ISSUER");
  });

  test("an unreachable status list is a failure, never a pass", async () => {
    const outcome = await verifyCredential(
      body,
      options({ statusFetch: async () => new Response("", { status: 404 }) }),
    );
    expect(outcome.verified).toBe(false);
  });
});

describe("unsafe input is refused before signing", () => {
  const signing = async (claims: MotorPolicyClaims) => issue(claims, 310);

  test("no coverage", async () => {
    await expect(signing({ ...CLAIMS, coverages: [] })).rejects.toThrow();
  });

  test("a date that is not YYYY-MM-DD", async () => {
    await expect(signing({ ...CLAIMS, policyStart: "1 July 2026" })).rejects.toThrow();
  });

  test("a policy that ends before it starts", async () => {
    await expect(signing({ ...CLAIMS, policyEnd: "2025-07-01" })).rejects.toThrow();
  });

  test("a malformed vehicle identification number", async () => {
    await expect(
      signing({ ...CLAIMS, vehicle: { name: "Larkspur Tern", vin: "short" } }),
    ).rejects.toThrow();
  });

  test("a negative deductible", async () => {
    await expect(signing({ ...CLAIMS, deductibleUsd: -1 })).rejects.toThrow();
  });

  test("claims of another kind under this kind", async () => {
    await expect(
      issueCredential({
        claims: { ...CLAIMS, kind: "identity-credential" } as never,
        credentialId: CREDENTIAL_ID,
        issuer: ISSUER,
        key: await issuerKey(),
        kind: "motor-policy-credential",
        status: list.entry(311),
        subject: SUBJECT,
        validity: validityOn(calendar, 20, { validDays: 365 }),
      }),
    ).rejects.toThrow();
  });
});
