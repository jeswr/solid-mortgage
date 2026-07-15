# EDMA sales enablement pack — plan

What EDMA's engagement/sales team needs to approach each target organisation, when each piece
can be built, and where it lives. Sources: `docs/research/org-map.md` (tailored propositions),
`mortgage-process.md` (quantified anchors), the EDMA role-map sheet. Everything ships as
markdown in `docs/sales/` (PDF/slide export is a build step at the end); recordings under the
demo domain. Tracked as the sales epic (sm-55) in beads.

## The pack

| # | Material | Contents | Ready when | Bead |
|---|---|---|---|---|
| 1 | **Master pitch narrative** | The "why now" story: quantified pain (~$11,600 cost to originate, 41–44 days to close, 14.7M/885M breach anchors), the Solid CoP context (bindings + CDMC conformance), the five-scene demo walkthrough script with talking points, honest-limits appendix (what is simulated) | now (research done); refreshed after build | sm-56 |
| 2 | **Quantified-benefits one-sheet** | One page of numbers with citations — days saved (up to 12, DU validation), $/loan saved ($165–388, LPA automation), re-verification eliminated, PII-copy count before/after | with #1 | sm-56 |
| 3 | **Per-organisation one-pagers (×12 roles)** | Org's role in the ecosystem → "your seat in the demo" (which app models them + screenshot) → tailored proposition (from the role-map sheet + org-map research) → what building it for real entails → CDMC/certification hook → the ask + next step. One page each: Freddie Mac, Fifth Third, Bank of America, Mastercard¹, Wolters Kluwer, Verizon, USAA, GLEIF, Truist + external targets Equifax, Cotality, First American (+ MISMO engagement note) | after #1; screenshots after apps deployed | sm-57 |
| 4 | **Contact & outreach plan** | Per org: which *public* roles/offices to approach (CDO office, digital-mortgage / innovation leads — titles from public sources only), the EDMA-internal route (member rep, DEP-founder relationships, CoP convener intro), DEP-founders-first sequencing (Freddie Mac, Fifth Third), suggested intro email per org, objection-handling notes (security, regulation, "who else has done this" — fed by the prior-art survey sm-40) | after #1; verify names/roles at send time | sm-58 |
| 5 | **Recorded demos** | (a) narrated full 10-minute journey; (b) 60–90s per-stakeholder cuts — each org's app in its moment; (c) 30s ZK pre-qualification teaser. Playwright-scripted captures for reproducibility (re-record on every polish pass), captioned | after deploy + cross-app e2e (sm-36/37) | sm-59 |
| 6 | **Technical FAQ + standards artifact** | 2-page architecture brief (pods, VCs, WAC, ZK posture incl. the honesty panel — engineers will probe), FAQ, and the **FIBO↔MISMO binding table** packaged as the CoP's standards deliverable | after data-model + ZK beads (sm-21/25) | sm-60 |
| 7 | **Partner-phase product-proposal template** | Per role: production scope, effort bands, upstream dependencies (sparq/Keycloak migration path from decision 0011), conformance/certification hooks (CDMC), pilot structure | after #3 | sm-61 |
| 8 | **Live demo kit** | Demo URLs + persona card + reset instructions + "what's real vs simulated" talking points for whoever drives the demo live | with #5 | sm-59 |

¹ Mastercard membership unconfirmed publicly — re-verify before its one-pager goes out (research-gaps C4).

## Rules

- Every claim in sales copy carries a citation back to `docs/research/` — no unverified numbers.
- Branding rules from decision 0002 apply to the materials too (role-first, no logos, demo
  framing); one-pagers must state the concept-demo status explicitly.
- Contact targets are public roles/offices, never scraped personal data; the EDMA-internal
  route is always the preferred channel.
- Delivery format/date of the CoP showcase is an open question to Jesse (sm-54) — it decides
  whether #5 leads with the narrated recording or a live-drive script.
