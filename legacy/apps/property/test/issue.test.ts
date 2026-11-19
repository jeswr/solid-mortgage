/**
 * Property issuance (bead sm-33), server-free: issue each credential through the
 * scene logic against a capturing in-memory pod, then assert on the SIGNED
 * document that lands in the pod.
 *
 * The load-bearing invariant (decision 0005): the appraised value is a PLAIN
 * DISCLOSED, signed claim — it appears in the clear as `schema:value` and is
 * NEVER wrapped in a ZK operand anchor (no `mort:operandEnc`, no `mort:field`,
 * no `mort:ZkOperandAnchor`). Asserted directly on the issued graph.
 */

import { MORT, PERSONA_VALUES, validate } from "@mortgage/data-model";
import { DataFactory } from "n3";
import { describe, expect, test } from "vitest";
import { appraisalConsistency, issueAppraisal, issueTitle } from "../lib/server/issue";
import { createIssuerRegistry } from "../lib/server/issuers";
import { PodAccessError } from "../lib/server/pod";
import { baseConfig, capturingPod, parseTurtle, testIssuerRegistry } from "./support";

const NOW = new Date("2026-07-16T00:00:00Z");
const POD_BASE = "https://alex.pod.example/";
const SUBJECT = "https://alex.pod.example/profile/card#me";

const CRED = "https://www.w3.org/2018/credentials#";
const SEC_PROOF = "https://w3id.org/security#proof";
const SCHEMA_VALUE = "https://schema.org/value";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

const alex = PERSONA_VALUES[0];
if (alex === undefined) throw new Error("persona fixtures missing");

async function issueAppraisalInto() {
  const pod = capturingPod();
  const registry = await testIssuerRegistry();
  const result = await issueAppraisal(POD_BASE, SUBJECT, registry, baseConfig(), {
    now: () => NOW,
    podFetch: pod.fetch,
  });
  const body = pod.writes.get(result.credentialIri);
  if (body === undefined) throw new Error("no appraisal credential was written");
  return { result, body, store: parseTurtle(body) };
}

async function issueTitleInto() {
  const pod = capturingPod();
  const registry = await testIssuerRegistry();
  const result = await issueTitle(POD_BASE, SUBJECT, registry, baseConfig(), {
    now: () => NOW,
    podFetch: pod.fetch,
  });
  const body = pod.writes.get(result.credentialIri);
  if (body === undefined) throw new Error("no title credential was written");
  return { result, body, store: parseTurtle(body) };
}

describe("appraisal issuance — disclosed value, never ZK-anchored", () => {
  test("the issued AppraisalCredential is SHACL shape-valid", { timeout: 30_000 }, async () => {
    const { result, body } = await issueAppraisalInto();
    const report = await validate(body, {
      expect: "appraisal-credential",
      focusNode: result.credentialIri,
    });
    expect(report.conforms).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("the appraised value is a disclosed schema:value claim (in the clear)", async () => {
    const { result, body, store } = await issueAppraisalInto();
    // The disclosed figure appears as a plaintext decimal literal.
    expect(body).toContain("425000");
    expect(result.appraisedValueUsd).toBe(alex.appraisedValueUsd);
    const valueQuads = store.getQuads(null, DataFactory.namedNode(SCHEMA_VALUE), null, null);
    expect(valueQuads.length).toBe(1);
    expect(Number(valueQuads[0]?.object.value)).toBe(alex.appraisedValueUsd);
  });

  test("the appraised value is NOT wrapped in any ZK operand anchor", async () => {
    const { body, store } = await issueAppraisalInto();
    // No hidden-operand encoding, no anchored field, no anchor type — the value
    // is disclosed, so proving a property of it would violate decision 0005.
    expect(store.getQuads(null, DataFactory.namedNode(MORT.operandEnc), null, null)).toHaveLength(
      0,
    );
    expect(store.getQuads(null, DataFactory.namedNode(MORT.field), null, null)).toHaveLength(0);
    expect(
      store.getQuads(
        null,
        DataFactory.namedNode(RDF_TYPE),
        DataFactory.namedNode(MORT.ZkOperandAnchor),
        null,
      ),
    ).toHaveLength(0);
    expect(body).not.toContain("operandEnc");
    expect(body).not.toContain("ZkOperandAnchor");
  });

  test("the credential is signed (eddsa-rdfc-2022) and subject-bound to the caller", async () => {
    const { result, store } = await issueAppraisalInto();
    expect(store.getQuads(null, DataFactory.namedNode(SEC_PROOF), null, null).length).toBe(1);
    const subject = store.getQuads(
      DataFactory.namedNode(result.credentialIri),
      DataFactory.namedNode(`${CRED}credentialSubject`),
      null,
      null,
    );
    expect(subject[0]?.object.value).toBe(SUBJECT);
    expect(result.issuer).toBe("https://amc.example/orgs/appraisal-management#id");
  });

  test("the credential carries a minted revocation status entry", async () => {
    const { result, body } = await issueAppraisalInto();
    expect(Number.isInteger(result.statusListIndex)).toBe(true);
    expect(result.statusListCredential).toBe("https://amc.example/status/appraisal");
    expect(body).toContain("statusListIndex");
  });
});

describe("title issuance", () => {
  test("the issued TitleClearCredential is SHACL shape-valid", { timeout: 30_000 }, async () => {
    const { result, body } = await issueTitleInto();
    const report = await validate(body, {
      expect: "title-clear-credential",
      focusNode: result.credentialIri,
    });
    expect(report.conforms).toBe(true);
    expect(report.violations).toEqual([]);
  });

  test("the title status is the clear SKOS concept", async () => {
    const { result, store } = await issueTitleInto();
    expect(result.titleStatus).toBe("clear");
    const statusQuads = store.getQuads(
      null,
      DataFactory.namedNode(MORT.titleStatus),
      DataFactory.namedNode(MORT.TitleStatus_Clear),
      null,
    );
    expect(statusQuads.length).toBe(1);
  });
});

describe("appraisal consistency (disclosed figures only — no ZK, no hidden operand)", () => {
  test("the persona's appraised value covers its requested loan", () => {
    const check = appraisalConsistency(alex.appraisedValueUsd, alex.requestedLoanUsd);
    expect(check.appraisalCoversLoan).toBe(true);
  });

  test("a loan above the appraised value is inconsistent", () => {
    const check = appraisalConsistency(300_000, 340_000);
    expect(check.appraisalCoversLoan).toBe(false);
  });

  test("equal value and loan is consistent (LTV = 100%)", () => {
    expect(appraisalConsistency(340_000, 340_000).appraisalCoversLoan).toBe(true);
  });
});

describe("runtime-issuance gate (fail-closed)", () => {
  test("the default registry refuses to sign when runtime issuance is disabled", async () => {
    const registry = createIssuerRegistry(baseConfig({ enableRuntimeIssuance: false }));
    await expect(registry.resolve("appraisal")).rejects.toBeInstanceOf(PodAccessError);
    await expect(registry.resolve("title")).rejects.toMatchObject({ status: 503 });
  });
});
