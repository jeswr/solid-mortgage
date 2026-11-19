<!-- AUTHORED-BY Claude Opus 5.5 -->
# Business KYB with LEI (demo 3)

Northwind Logistics LLC (a fictional business holder, `northwind` in the holder registry) is
onboarded by two fictional banks from one set of register credentials in its own pod. The tour is
the twelve steps of `docs/rebuild/flows.md` section 3; step ids match `video/business-kyb/narration.md`.

| File | What it holds |
| --- | --- |
| `facts.ts` | The story: days, the entity, its illustrative LEI (prefix `9999`), the owners before and after the sale, pod paths |
| `register.ts` | Halyard LEI Services (the `registry` app): pod preparation, the three credentials, the ownership anchors, re-issue and revocation |
| `grants.ts` | K1 (Alder Bank, due diligence, 1 year) and K2 (Brackenridge Bank, credit decision, 90 days): requests, agreements, consent records, ACLs |
| `banks.ts` | Alder's due diligence (checks at source, the CDD decision record in its own pod), back-office re-reads, Brackenridge's deal sheet |
| `proof.ts` | Step 7: Brackenridge's challenge, Northwind's in-browser Tier B and Tier A proofs, Brackenridge's verification and pre-decision |
| `journey.ts` | One function per step, called by the pages and by the headless test |
| `tour.ts`, `mount.ts`, `browser.ts` | Tour copy, `mountDemo` options (Lens, examiner obligations), the browser world |

Ported from `jeswr/solid-kyb` (data model, fictional LEIs, ZK prover and circuits now live in
`@mortgage/data-model` and `@mortgage/vc-kit`). The headless journey test
(`content/test/business-kyb/journey.test.ts`) runs every step against the real wasm pod server.

Known limit: after the sale Jordan Blake holds 6000 bps, a value with no captured `filter_int_d4`
operand encoding, so his share anchor is withdrawn rather than minted (`unanchored`); the
completeness anchor (Tier B) is always re-minted.
