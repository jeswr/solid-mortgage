# Verizon — the pod-host seat ("Data Vault")

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1).*

## Where you sit in the ecosystem

Deliberately *nowhere* in the mortgage value chain — that is the point. The borrower's pod
needs a custodian with no counterparty stake in the loan. Verizon is the only candidate that
passes all four constraints: confirmed EDMA member (Mar 2021, spot-checked — research-gaps
§3), household US consumer brand, zero counterparty role in a mortgage, and existing paid
consumer data/identity products that make managed pod hosting a plausible SKU (decision 0003).
The role-map already maps you to exactly this seat: R3, Managed Pod Hosting / Data-Custody
Operator (role-map sheet).

## Your seat in the demo

`apps/wallet` — the "Data Vault", modelled on Verizon: the borrower's profile, credential
wallet, access grants, consent-receipt ledger, and revocation controls (decisions 0002/0003).
It is the only app on screen in **every** scene, and the demo's closing payoff is its ledger
view: every grant and every revocation, receipted (scene 5). Honesty note the presenter owns:
the ledger is an application feature built by the wallet, not something the Solid protocol
provides for free (decision 0006).

> SCREENSHOT-TODO: `apps/wallet` consent-receipt ledger (scene 5) and credential wallet
> (scene 1).

## The proposition

The role-map sheet's pitch, verbatim: *"Host citizen/consumer Pods at carrier scale and pilot
a consumer data wallet"* — and the R3 generic pitch: *"launch managed Pod hosting as a new
regulated revenue line, using CoP conformance as your trust mark"* (role-map sheet). The demo
names the trust inversion: a carrier once fined over location-data sharing now custodies a pod
whose access the *user* alone grants, every grant receipted (decision 0003). Stated honestly:
the demo shows access control and receipts — the host remains inside the trust boundary;
making the host technically unable to read stored data (client-side encryption, host-blind
custody) is a partner-phase design requirement, not a property of today's stack. Most adopters
will rent pods, not run them (role-map sheet, R3): the custodian seat is the recurring-revenue
seat.

## What building it for real entails

- A managed consumer pod-hosting service: user-held keys, custody SLAs, and audit obligations
  (role-map sheet, R3 commitments) — with host-blind custody (client-side encryption)
  evaluated as a design requirement, since access control alone leaves the host able to read
  stored data.
- The consumer wallet UX productised — grants, receipts, revocation — on top of the hosting
  layer (the demo's wallet is the reference pattern).
- Hosting conformance against the CoP's CDMC-anchored criteria as they are defined (role-map
  sheet, R3).
- Strict neutrality: the custodian holds no mortgage-counterparty role — the property that
  qualified you for the seat (decision 0003).

## The CDMC hook

R3's charter hook *is* CDMC (role-map sheet): hosting conformance is the trust mark that makes
"your data, custodied by your carrier" credible to regulators and consumers alike. First
conformant consumer pod host is a category-defining claim inside EDMA's own framework.

## The ask + next step

Take the pod-host anchor seat in the partner phase (SPEC §12). **Next step:** a Data Vault
walkthrough with your consumer data/identity product team — scene 1 and scene 5 show the
wallet end-to-end — then scope a managed-hosting pilot and co-draft the hosting-conformance
criteria. Re-verify current EDMA engagement before outreach (decision 0003).

---

*Sources: org-map = `docs/research/org-map.md`; role-map sheet = EDMA member/role directory
(internal, 4 Jun 2026); decisions 0003/0006 in `decisions/`.*
