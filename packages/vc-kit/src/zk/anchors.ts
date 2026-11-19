// AUTHORED-BY Claude Fable 5.2
/**
 * Issuer operand anchors from CAPTURED encodings (decisions 0005 and 0012).
 *
 * A live threshold proof is only worth anything when its public operand
 * encoding equals one the issuer signed. The encoding of a hidden integer is
 * sparq's `encode_int_literal`, which this package deliberately does not
 * reimplement in JavaScript. The table below holds the encodings captured
 * from the sparq native toolchain (`test/fixtures/operand-enc.json`, with its
 * provenance in `test/fixtures/PROVENANCE.json`); a test pins the table to
 * that file. An issuer can therefore mint an anchor in a browser worker for
 * exactly these values and for no other: an uncaptured value throws, it is
 * never guessed.
 *
 * The demo's two hidden values are 8,500 (monthly gross income, USD) and 742
 * (credit score).
 */

import type {
  BitstringStatusListEntry,
  BitstringStatusListEntryInput,
  KeyPair,
} from "@jeswr/solid-vc";
import { fitsZkBudget, zkBudgetFor } from "@mortgage/data-model";
import type { Quad_Subject } from "@rdfjs/types";
import { TermWrapper } from "@rdfjs/wrapper";
import { DataFactory, Store } from "n3";
import type { IssuedCredential, ValidityWindow } from "../issue.js";
import { issueCredential } from "../issue.js";
import { ZkError } from "./backend.js";

const XSD_INTEGER = "http://www.w3.org/2001/XMLSchema#integer";
const CANONICAL_NON_NEGATIVE_INTEGER = /^(0|[1-9][0-9]*)$/;

/** Captured `encode_int_literal` outputs, keyed by the integer's canonical lexical form. */
export const CAPTURED_OPERAND_ENCODINGS: Readonly<Record<string, string>> = Object.freeze({
  "0": "0x17371a31fd5b665a45225290dde2708b5a90e4181a6cffc057103fb7a5b19c66",
  "30": "0x132fa587351bf3f12fd3cbed64d5526f28791099d1d40870f94595873c78fa72",
  "99": "0x2d1ae908575923f3c1074b9144297485c306d07b904ca775a0c592837bd7fa28",
  "500": "0x15d1de175fe2005ee77eb9017ee784cfb4963a9f45e5f2193f551347c2474d5c",
  "619": "0x2e9210f8e3a6de858e7adc2884f8d0fc9a8c5984388fd6bbf25115096ff351e2",
  "620": "0x09b16305ec3bec27eafb59084b1d9467a9ed4e410350afa4cd19958892bab4db",
  "660": "0x0ce59c1353ad4549d10c4e684dc616a86df4294d0bbe4e22e149d9a5a8637437",
  "700": "0x05263ee44f48dfe07f3d25739db12b4cd1a9ef2386779bb11db1aab10b43e345",
  "720": "0x03991f97cea18f61d22cb2f762ddddfdfb03ed9ad32625cbbb3962bb2d59e59e",
  "742": "0x23b9c0f1ac8b90f9b1fd5d567d6994644332ac788d4254d76cc9ca025c7543f1",
  "850": "0x06ee7437d5fcd1ec1ae9be425fd0e1dbd0dcb911514521f0d7a8dd21a72a1b20",
  "1180": "0x1b2fdf40ae7e09daa977f4ef78c957a8ad8d9eb6c9f26d226746f97f11416b78",
  "2200": "0x1c1ba019a5ac42ec772999f33f1dbc57480afa339b59ba064cce4da00b82fc54",
  "2860": "0x07b66a6df9e52198d3d823f29c5030fd9721dafcf31b7a44da67a0f21d3710b0",
  "6500": "0x0512ecf0649dbd68336fbbf4edb3f9d70b40a7bbf41da0667487bd10205c48ae",
  "7000": "0x205e4dd0c2526b48ae2a94bfcdbbe30e19de4e8b85ce29ec0e7b35cba051b053",
  "8500": "0x205f3625597a2bc55792ed23304c85f878e5caa3d3d1decdd94fb477ef6ff6bc",
  "9999": "0x0ad5c5f2163a0400c5cd2a1a80fb43229689797c2b53ac9f93c6af28930e3c91",
  // Business KYB owner shares in basis points (test/fixtures/operand-enc-kyb.json): Dana Reyes,
  // Marcus Webb, Priya Nandakumar, Jordan Blake. Same sparq commit and toolchain.
  "1200": "0x03ba3e08637a48f1960b41c88eb697ed6c6dedaeef8e362d4f6c9d0e35cf8f95",
  "1800": "0x099b001db07d4133f375846dc5d36e64353e12191e23695c2c73b1a0b58eb734",
  "2800": "0x1f2027ca53100ba894a3287f5e0ad692464203bd8be74e38590ed9b8a3aa7e74",
  "4200": "0x0a0e87fb4532734a93ef0d3e31ea031d853b1688b98f7f1572b61ad057d37d96",
});

/** The captured encoding of `value`. Throws `NO_CAPTURED_ENCODING` for any other value. */
export function capturedOperandEncoding(value: number): string {
  const encoding = Number.isSafeInteger(value)
    ? CAPTURED_OPERAND_ENCODINGS[String(value)]
    : undefined;
  if (encoding === undefined) {
    throw new ZkError(
      "NO_CAPTURED_ENCODING",
      `no captured operand encoding for ${value}: capture it with the sparq native toolchain, never compute or guess it`,
    );
  }
  return encoding;
}

/** Typed read of one hidden integer claim (exactly one canonical `xsd:integer`). */
class ClaimSubject extends TermWrapper {
  integerClaim(predicate: string): number {
    const subject = this as unknown as Quad_Subject;
    const matches = [...this.dataset.match(subject, this.factory.namedNode(predicate), null)];
    if (matches.length !== 1) {
      throw new ZkError(
        "HIDDEN_FIELD_CARDINALITY",
        `expected exactly one value for hidden field ${predicate}, found ${matches.length}`,
      );
    }
    const term = matches[0]?.object;
    if (
      term?.termType !== "Literal" ||
      term.datatype.value !== XSD_INTEGER ||
      !CANONICAL_NON_NEGATIVE_INTEGER.test(term.value)
    ) {
      throw new ZkError(
        "HIDDEN_FIELD_NOT_INTEGER",
        `hidden field ${predicate} is not a canonical non-negative xsd:integer literal`,
      );
    }
    return Number(term.value);
  }
}

export interface MintCapturedAnchorOptions {
  /** The just-issued credential that carries the hidden field. */
  readonly credential: IssuedCredential;
  /** The hidden field IRI (a decision-0005 budget field). */
  readonly field: string;
  /** The subject WebID; must be the credential's subject. */
  readonly subject: string;
  /** The anchor issuer WebID: the same issuer as the anchored credential. */
  readonly issuer: string;
  /** The anchor credential IRI (the pod URL it will live at). */
  readonly anchorId: string;
  /** The anchor's own status entry (anchors are revocable). */
  readonly status: BitstringStatusListEntry | BitstringStatusListEntryInput;
  readonly validity: ValidityWindow;
  /** The issuer's Ed25519 signing key, supplied by the caller. */
  readonly key: KeyPair;
}

export interface CapturedAnchor {
  readonly field: string;
  readonly operandEnc: string;
  readonly credential: IssuedCredential;
}

/**
 * Mint the issuer-signed `mort:ZkOperandAnchor` for one hidden field of
 * `credential`, reading the value from the signed claim graph itself and
 * looking its encoding up in the captured table.
 */
export async function mintCapturedOperandAnchor(
  options: MintCapturedAnchorOptions,
): Promise<CapturedAnchor> {
  if (zkBudgetFor(options.field) === undefined) {
    throw new ZkError("NOT_A_ZK_FIELD", `${options.field} is not a ZK-provable field`);
  }
  const claims = new ClaimSubject(
    DataFactory.namedNode(options.subject),
    new Store([...options.credential.claimQuads]),
    DataFactory,
  );
  const value = claims.integerClaim(options.field);
  if (!fitsZkBudget(options.field, value)) {
    throw new ZkError(
      "BUDGET_VIOLATION",
      `the hidden value for ${options.field} does not fit its digit budget`,
    );
  }
  const operandEnc = capturedOperandEncoding(value);
  const credential = await issueCredential({
    claims: { field: options.field, kind: "zk-operand-anchor", operandEnc },
    credentialId: options.anchorId,
    issuer: options.issuer,
    key: options.key,
    kind: "zk-operand-anchor",
    status: options.status,
    subject: options.subject,
    validity: options.validity,
  });
  return { credential, field: options.field, operandEnc };
}
