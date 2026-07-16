/**
 * Shared ZK test rig (sm-25). Proving is expensive (~2 s per proof plus a
 * one-off WASM cold start in single-threaded Node), so the suite proves each
 * scenario ONCE in a shared cache and reuses the transcript across the
 * negative matrix - negative tests vary the VERIFICATION inputs, which never
 * requires a new proof. Measured on this rig (Node, 1 thread): backend init
 * ~1-2 s, witness ~70 ms, prove ~2 s, verify ~180 ms.
 */

import { MORT } from "@mortgage/data-model";
import {
  type IssuedCredential,
  issueCredential,
  proveTierA,
  type TierAProof,
  type TierAStatement,
} from "../src/index.js";
import {
  BACKDATED_VALIDITY,
  hostedStatusList,
  ISSUER,
  issuerKey,
  NOW,
  type StubHost,
  SUBJECT,
  stubHost,
} from "./support.js";

/**
 * PROVENANCE: genuine sparq term encodings of `"<value>"^^xsd:integer`,
 * captured from `sparq_zk_compose::build::encode_int_literal` at sparq
 * checkout commit 947480b02fcbd174f80f9247b55ee02202d2e345 (see
 * fixtures/README.md). In production the ISSUER computes these at issuance
 * and signs them into the operand-anchor VC; the encoding is deterministic
 * and salt-free, so an ADVERSARY can equally compute one for any value they
 * like - which is the decision-0012 forgeability scenario the verifier's
 * anchor-equality gate exists to stop.
 */
export const OPERAND_ENC: Readonly<Record<number, string>> = {
  8500: "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  7000: "0x205e4dd0c2526b48ae2a94bfcdbbe30e19de4e8b85ce29ec0e7b35cba051b053",
  6500: "0x0512ecf0649dbd68336fbbf4edb3f9d70b40a7bbf41da0667487bd10205c48ae",
  9999: "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
  742: "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
  700: "0x05263ee44f48dfe07f3d25739db12b4cd1a9ef2386779bb11db1aab10b43e345",
  620: "0x09b16305ec3bec27eafb59084b1d9467a9ed4e410350afa4cd19958892bab4db",
  619: "0x2e9210f8e3a6de858e7adc2884f8d0fc9a8c5984388fd6bbf25115096ff351e2",
};

export function encOf(value: number): string {
  const enc = OPERAND_ENC[value];
  if (enc === undefined) throw new Error(`no captured operand_enc fixture for ${value}`);
  return enc;
}

/** The decision-0005 statements the suite exercises. */
export const INCOME_STATEMENT: TierAStatement = {
  field: MORT.monthlyGrossIncomeUsd,
  op: "ge",
  bound: 7000,
};
export const SCORE_STATEMENT: TierAStatement = {
  field: MORT.creditScoreValue,
  op: "ge",
  bound: 620,
};

/** Fixed challenge nonces the shared proofs are produced for (see cache note). */
export const NONCE_INCOME = "zk-test-nonce-income-8500";
export const NONCE_SCORE = "zk-test-nonce-score-742";
export const NONCE_FORGED = "zk-test-nonce-forged-9999";

const proofCache = new Map<string, Promise<TierAProof>>();

function cachedProve(key: string, prove: () => Promise<TierAProof>): Promise<TierAProof> {
  let pending = proofCache.get(key);
  if (!pending) {
    pending = prove();
    proofCache.set(key, pending);
  }
  return pending;
}

/** A genuine proof of income 8500 >= 7000 (filter_int_d4), for NONCE_INCOME. */
export function incomeProof(): Promise<TierAProof> {
  return cachedProve("income", () =>
    proveTierA({
      statement: INCOME_STATEMENT,
      value: 8500,
      operandEnc: encOf(8500),
      nonce: NONCE_INCOME,
    }),
  );
}

/** A genuine proof of score 742 >= 620 (filter_int_d3), for NONCE_SCORE. */
export function scoreProof(): Promise<TierAProof> {
  return cachedProve("score", () =>
    proveTierA({
      statement: SCORE_STATEMENT,
      value: 742,
      operandEnc: encOf(742),
      nonce: NONCE_SCORE,
    }),
  );
}

/**
 * The decision-0012 FORGERY: the adversary's real income is 6500 (< 7000), so
 * they compute the salt-free encoding of 9999 themselves and prove
 * `9999 >= 7000` - an HONEST proof of a true statement about a value no
 * issuer ever attested. Every cryptographic step succeeds; only the
 * anchor-equality gate can reject it.
 */
export function forgedIncomeProof(): Promise<TierAProof> {
  return cachedProve("forged", () =>
    proveTierA({
      statement: INCOME_STATEMENT,
      value: 9999,
      operandEnc: encOf(9999),
      nonce: NONCE_FORGED,
    }),
  );
}

/** One-shot nonce consumer accepting exactly (sessionKey, nonce) - then burned. */
export function oneShotNonce(sessionKey: string, nonce: string) {
  let live = true;
  return {
    consume(gotSession: string, gotNonce: string): boolean {
      if (!live || gotSession !== sessionKey || gotNonce !== nonce) return false;
      live = false;
      return true;
    },
  };
}

export interface AnchorRig {
  readonly host: StubHost;
  readonly issue: (overrides?: {
    field?: string;
    operandEnc?: string;
    subject?: string;
    index?: number;
    validity?: { validFrom: Date; validUntil?: Date };
  }) => Promise<IssuedCredential>;
  readonly revoke: (index: number) => Promise<void>;
}

/**
 * An anchor-issuing rig: a stub-hosted Bitstring status list plus an issuer
 * that signs operand-anchor VCs against it. Defaults to a genuine income
 * anchor for 8500, subject SUBJECT, status index 7.
 */
export async function anchorRig(): Promise<AnchorRig> {
  const host = stubHost();
  const list = await hostedStatusList(host);
  return {
    host,
    issue: async (overrides = {}) =>
      issueCredential({
        kind: "zk-operand-anchor",
        credentialId: "https://alex.example/credentials/income-anchor",
        issuer: ISSUER,
        subject: overrides.subject ?? SUBJECT,
        claims: {
          kind: "zk-operand-anchor",
          field: overrides.field ?? MORT.monthlyGrossIncomeUsd,
          operandEnc: overrides.operandEnc ?? encOf(8500),
        },
        validity: overrides.validity ?? BACKDATED_VALIDITY,
        status: list.entry(overrides.index ?? 7),
        key: await issuerKey(),
      }),
    revoke: (index) => list.revoke(index, { now: NOW }),
  };
}
