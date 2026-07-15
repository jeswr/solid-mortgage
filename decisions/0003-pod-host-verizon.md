# 0003 — Trusted branded pod host: Verizon ("Data Vault")

**Status:** accepted (autonomous, 2026-07-15) — answers Jesse's direct request for guidance
**Input:** docs/research/pod-host.md

The borrower's pod + wallet is branded **"Data Vault — modelled on Verizon"**. Verizon is the
only candidate passing all four constraints: confirmed EDMA member (Mar 2021, spot-checked),
household US consumer brand, zero counterparty role in a mortgage, and existing paid consumer
data/identity products that make managed pod hosting a plausible SKU. The demo copy names the
trust inversion explicitly: a carrier once fined over location-data sharing now custodies a pod
it cannot read — user-held keys, consent-receipt ledger.

Narrative (not architecture): "custody powered by Snowflake" (member, CDMC-governed) may appear
in partner-phase slides. Microsoft Entra Verified ID is **dropped from the architecture** — see
decision 0004; if mentioned, Microsoft is a CDMC-workgroup participant, not a member.

Runners-up, with when-to-prefer: **Mastercard** (if membership confirms and the wallet UX
becomes the hero), **Snowflake solo** (EDMA-practitioner audience). Rejected: bank trust arms
(counterparty conflict), hyperscaler front brand (lowest consumer data-trust category), IoM
fiduciaries (wrong jurisdiction for a US consumer journey — reserve for a data-as-asset chapter).

Partner phase: re-verify Verizon's current engagement before outreach.
