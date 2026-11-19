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

## Small business loan (demo 6)

One credential kind, `tax-compliance-credential`: a state revenue department attests that a
business's filings are up to date (`status`, `filingsCurrentThrough`) and the band its annual
turnover falls in (`turnoverBand`; the figure itself is never signed). The claim writer refuses
an unknown status or band and a tax ID suffix that is not four digits before anything is signed.
`test/tax-compliance.test.ts` covers issue and the fail-closed verify matrix (tampered band,
date or status, transplanted subject, extra disclosed property, wrong shape, untrusted issuer,
unknown key, validity window, revocation, unreachable status list, stripped proof).

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

### The prover's CRS comes from the site

In a browser, bb.js would download its CRS from Aztec's CDN every time it
starts: 2^20 G1 points (64 MiB) and a 2^16-point Grumpkin CRS (4 MiB), cached
only in that browser's IndexedDB. Proofs would then depend on a third party at
proof time. Instead, in a page or a worker, `zk/crs.ts` loads the CRS from the
site's own origin and hands it to bb.js:

- `crs/bn254-g1-32768-….dat`: the first 2^15 G1 points (2 MiB). Every committed
  circuit is 17,416 gates, 2^15 once padded; bb.js refuses with one point fewer
  (`test/zk-crs.test.ts` checks both on the real wasm).
- `crs/bn254-g2-….dat`: the G2 point (128 bytes).
- No Grumpkin CRS: only IPA accumulation uses it, and the `evm` flavour never
  runs it.

Each file is pinned by length and SHA-256 and checked when it loads; anything
else (a missing file, a redirect, one changed byte) fails closed, with no
fallback to the network. The bytes are the start of Aztec's published
`g1.dat` and its `g2.dat`. `tools/build-site.mjs` copies `crs/` to `dist/crs/`,
which the site serves same-origin only (`Cross-Origin-Resource-Policy`) and
caches for a year by hashed name. A circuit larger than 2^15 needs a larger G1
file and a new pin. In Node, bb.js uses its native binary and its own CRS
handling, unchanged.

`@mortgage/vc-kit/seed-tooling` is Node-only (it drives the sparq native
helper) and must not be imported from browser code.
