# 0006 — Access-receipt ledger is app-level, not protocol-level

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps C7/M6

Scene 5's "who has had access" payoff is implemented as an **app-level consent-receipt ledger**:
DPV consent records + per-grant/revoke receipts written as pod resources by the wallet whenever
a grant is created or revoked (extending the access-manager request→approve pipeline surveyed in
sdk-survey). Revocation = actual WAC ACL update **plus** a receipt. The wallet renders the
ledger; demo copy must never imply WAC/ACP or the Solid protocol provides auditing. WAC-only
throughout (C8): ACP is upstream wishlist, not critical path.
