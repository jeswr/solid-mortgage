<!-- AUTHORED-BY Claude Fable 5.2 -->
# @mortgage/vc-kit

Issue, verify, revoke and re-issue the demo's Verifiable Credentials, and prove
a threshold over a hidden value. Security-critical: every gate fails closed.

## What it does

| Area | Entry points |
|---|---|
| Issue | `issueCredential` signs a typed claim set after its SHACL shape passes |
| Verify | `verifyCredential` checks signature, shape, validity window, issuer and status |
| Rely | `verifyWithTrustList` adds a required status entry and membership of a scheme's trusted-issuer list |
| Status | `StatusListClient` hosts one Bitstring Status List per issuer |
| Re-issue | `reissueCredential` revokes the old credential and issues its successor |
| Threshold proof | `proveTierA` / `verifyTierA`, bound to an issuer operand anchor |
| Operand anchors | `mintCapturedOperandAnchor` for the captured values |

Credential kinds: employment and income, assets, credit score, appraisal,
identity, title commitment, evidence of insurance, KYC attestation and the
operand anchor.
`title-clear-credential` has had no importer since `packages/solid-kit` was
deleted and is due for removal; new code uses the title commitment.

Precomputed proof manifests were removed in the static rebuild. The only proof
this package makes is the live threshold proof.

## Relying on another institution's checks

`verifyWithTrustList(body, { expectShape, now, trustList: { iri, document }, ... })` is what a
relying party runs on a KYC attestation (reusable KYC demo). It passes only when every
`verifyCredential` gate passes and also:

- the credential carries a status entry (`STATUS_MISSING` otherwise: `verifyCredential` alone
  accepts a credential without one);
- the list conforms to `mshape:TrustedIssuerListShape` under the given IRI, is in force at
  `now` and covers the credential's class (`TRUST_LIST_INVALID`, `TRUST_LIST_OUT_OF_FORCE`,
  `TRUST_LIST_WRONG_TYPE`);
- the issuer has an entry in force both when the credential took effect and at `now`
  (`ISSUER_NOT_LISTED`, `LISTING_NOT_IN_FORCE`);
- for a KYC attestation, no check is dated after the credential took effect
  (`CHECK_AFTER_ISSUANCE`).

The result names each gate (`gates.signature`, `status`, `content`, `list`, `listed`) so a
screen can show what was checked, and the entry (agreement reference) that admitted the
issuer. The list is unsigned: it is only as trustworthy as the place the caller read it from,
which in the demo is the relying party's own pod copy of the scheme's publication.

The KYC attestation's shape is closed and has no evidence link, so no document image, scan,
document number or tax identifier can be signed into it.

## Time comes from the caller

Nothing here reads the wall clock. The demo passes its calendar:

```ts
import { instantOn, validityOn } from "@mortgage/vc-kit";

const validity = validityOn(calendar, 1, { validDays: 120 }); // issued on demo day 1
const outcome = await verifyCredential(body, { now: instantOn(calendar, 31), ... });
```

A status list is itself a signed credential with a validity window, 24 hours
by default. A demo whose calendar jumps by weeks either gives the issuer's
`StatusListClient` a longer `listLifetimeMs` or calls `refresh({ now })` when
the day changes. A verifier refuses an expired list.

## Keys come from the caller

Issuer keys are WebCrypto Ed25519 key pairs (`generateKeyPairForSuite`, or
`importKeyPair` for a stored one). The package holds no private key.

## Hidden values and their anchors

A threshold proof is checked against an operand encoding the issuer signed.
The encoding function belongs to the sparq native toolchain and is not
reimplemented here. `CAPTURED_OPERAND_ENCODINGS` holds the values captured
from it, including the demo's 8,500 (monthly income) and 742 (credit score).
`mintCapturedOperandAnchor` works for those values and throws for any other.

## Business KYB (demo 3)

`src/zk/kyb/` carries the business KYB ZK layer, ported from `jeswr/solid-kyb`:

- three credential kinds the register issues: `organisational-identity-credential` (an
  illustrative LEI only), `officer-authorisation-credential` and
  `beneficial-ownership-credential` (owner shares in basis points);
- `mintOwnerShareAnchor` (Tier A, one owner's share, captured encodings only: 1200, 1800, 2800,
  4200) and `mintOwnerArrayAnchor` (Tier B, a BLAKE3 commitment over the eight-slot owner
  array). Both read the shares from the signed claim graph;
- `proveCompleteness` / `verifyCompleteness`: the bespoke `kyb_completeness_scan_n8` circuit
  (Noir source in `circuits/kyb_completeness_scan/`), proved live. It shows that exactly
  `disclosedCount` owners hold 25 percent or more, bound to the anchored array. The verifier
  runs nine fail-closed gates, as Tier A does.

BLAKE3 is written out for one chunk in `blake3.ts` (no new dependency) and checked against the
published test vectors and, end to end, by the circuit itself.

## Running in a browser or a worker

This package's own code uses only web platform APIs. The pinned
`@jeswr/solid-vc` build imports three Node modules and uses the `Buffer`
global. Stand-ins for exactly the functions it calls ship here:

```ts
// vite.config.ts
resolve: {
  alias: {
    "node:zlib": "@mortgage/vc-kit/browser/zlib",
    "node:crypto": "@mortgage/vc-kit/browser/crypto",
    "@jeswr/guarded-fetch/node": "@mortgage/vc-kit/browser/guarded-fetch",
  },
}
```

```ts
// first import of the worker or page entry
import "@mortgage/vc-kit/browser/buffer";
```

The stand-ins are tested against Node's own `zlib`, `crypto` and `Buffer`
(`test/browser-shims.test.ts`). They have not been run in a real browser in
this package's test suite: the app lanes' browser tests are where that is
proved. In a browser every call that reaches the network must be given a
`fetch`; the guarded-fetch stand-in rejects instead of falling back to the
global one.

`@mortgage/vc-kit/seed-tooling` is Node-only (it drives the sparq native
helper) and must not be imported from browser code.
