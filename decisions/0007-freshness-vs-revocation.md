# 0007 — Freshness ≠ revocation

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps C11 (status-list details pend presentation-protocol research)

Scene 4's pre-close re-verification (the 10-business-day verbal-VOE rule, Fannie B3-3.1-04)
demonstrates **freshness by re-issuance**: the employment VC carries a short `validUntil`; the
lender's freshness check reads `validFrom`/`validUntil` and, when stale, requests a re-issue
from the verifications app (one-click for the borrower, since the grant already exists — that IS
the demo beat). Status lists signal **revocation only** (employer terminates → revoked), not
recency. Scene 4's green tick = valid window + not revoked.
