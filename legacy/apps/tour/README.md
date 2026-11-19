# Tour multi-zone shell

The tour app is the public shell for all eight Next.js zones. It serves its own root route and
uses plain Next.js rewrites for every sibling path prefix. Set each value to the sibling
deployment origin, with a URL scheme and no trailing slash.

| Environment variable | Routed prefix |
| --- | --- |
| `MORTGAGE_WALLET_ZONE_URL` | `/wallet` |
| `MORTGAGE_VERIFICATIONS_ZONE_URL` | `/verifications` |
| `MORTGAGE_PRIMARY_LENDER_ZONE_URL` | `/lender-boa` |
| `MORTGAGE_COMPARISON_LENDER_ZONE_URL` | `/lender-53` |
| `MORTGAGE_UNDERWRITING_ZONE_URL` | `/gse` |
| `MORTGAGE_PROPERTY_ZONE_URL` | `/property` |
| `MORTGAGE_CLOSING_ZONE_URL` | `/closing` |

Non-routable `.invalid` origins let the shell build before deployment configuration exists;
all seven variables are required for a working deployed shell. Local tooling should allocate
ports dynamically and pass the resulting origins through these variables.

## Tour surfaces (sm-35)

- `/` — landing: pitch, quantified anchors with citations, interactive ecosystem map
  (12 org-map roles + the borrower's vault), chapter index, copy-ready demo identity card.
- `/chapters/<slug>` — the five scene chapters (SPEC §2) as a keyboard-navigable stepper.
  Chapter content is data (`app/content/chapters.ts`) with machine-enforced editorial limits
  (`test/chapters.test.ts`): word budgets, a required "what just happened underneath" panel
  on scenes 1/2/4, and a try-this-live deep link per step.
- `/examiner` — unbranded Examiner View: TRID/RESPA timing beats as an examiner-facing
  checklist over public rules, with an explicit CFPB non-affiliation statement.
- `/api/health` — the shell's own liveness probe. Every zone app exposes the same route;
  the launcher dock and map probe them same-origin through the zone rewrites and degrade
  honestly to "Not deployed".

One module — `app/content/services.ts` — drives the map, the launcher dock, and all
try-this-live links. Content modules live under `app/` (not `lib/`) so the R2 insignia guard
(`scripts/check-insignia.mjs`) scans them.
