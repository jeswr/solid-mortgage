# GLEIF — the organisational-identity seat

*Concept demonstration — all data simulated; every app is framed role-first ("modelled on X",
never "by X"); no affiliation or endorsement implied; nothing here or in the demo is an offer
or solicitation of credit (decision 0002, R1).*

## Where you sit in the ecosystem

Every party in a mortgage — lender, verifier, title company, servicer — must be identifiable
by every other party. GLEIF's LEI is the identifier, and the vLEI extends it to LEI-anchored
verifiable credentials with role credentials (OOR/ECR) for signing officers — the natural
credential behind every stakeholder organisation's WebID (org-map role 10). You are
non-commercial and neutral, and the role-map already lists you as the identifier authority
(role-map sheet, R5).

## Your seat in the demo

Not an app — the layer under all of them. Every stakeholder organisation in the demo is
referenced by its GLEIF LEI in the RDF data model (SPEC §3). Honestly scoped: the demo uses
LEI-as-identifier only; vLEI (KERI/ACDC) role credentials are partner-phase narrative, not in
the build (SPEC §3; research-gaps C5). Your seat becomes visible wherever an org identity is
resolved — the tour app's ecosystem map and each org's WebID profile.

> SCREENSHOT-TODO: `apps/tour` ecosystem map with an org profile showing its LEI reference.

## The proposition

The role-map sheet's pitch, verbatim: *"Co-define the LEI/vLEI ↔ WebID binding and become the
identity backbone for every organisational Pod in the network"* — and R5's generic pitch:
*"make your identifier the default in every conformant Pod"* (role-map sheet). Bindings are
only as good as the identifiers they resolve to (role-map sheet, R5); the CoP's core
deliverable is exactly such a binding table (master narrative §3), and the organisational-
identity column of it is yours to hold.

## What building it for real entails

- Co-author the LEI/vLEI ↔ WebID/VC binding as a CoP standards deliverable, alongside the
  FIBO↔MISMO table (org-map role 9; role-map sheet, R5 commitments).
- vLEI role credentials (OOR/ECR) for the signing officers behind each stakeholder org's
  WebID — the partner-phase upgrade from LEI-as-identifier (org-map role 10).
- Keep identifiers resolvable and support the mapping work — the R5 commitment set (role-map
  sheet).
- No app build required: this is a standards contribution, the lightest seat in the map.

## The CDMC hook

The CoP's bindings are conformance-anchored to CDMC (role-map sheet, read-me): identifier
resolvability and org-identity binding become assessable criteria. A conformant pod ecosystem
is one where the LEI is structurally load-bearing — a durable, framework-level position for a
non-commercial authority.

## The ask + next step

Co-define the organisational-identity binding (SPEC §12 lists GLEIF in the member outreach
set). **Next step:** a standards working session with the CoP conveners — review how the demo
references LEIs today and scope the vLEI role-credential extension for the partner phase.

---

*Sources: org-map = `docs/research/org-map.md`; role-map sheet = EDMA member/role directory
(internal, 4 Jun 2026); SPEC §3/§12; research-gaps C5.*
