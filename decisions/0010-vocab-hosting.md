# 0010 — Project vocab host: dedicated Vercel project

**Status:** accepted (autonomous, 2026-07-15) — resolves research-gaps Q9/Q10. Veto window
matters here: IRIs are forever once minted into committed RDF.

The residue vocab (title status, decision statuses, ZK scaled-unit fields, marital status — see
vocab.md §5) is published from a **dedicated tiny Vercel project** `solid-mortgage-vocab`, IRI
namespace `https://solid-mortgage-vocab.vercel.app/mort#` — a real, dereferenceable URL we
control indefinitely, independent of app renames and of this repo staying private (GitHub Pages
is unavailable on a private repo without a public split). One `vocab/mort.ttl` source of truth;
Turtle + JSON-LD + HTML via content negotiation; CI checks every `mort:` term used in code or
shapes exists in the published file; `lint:iris` gates.

**No `mort:` IRI is minted into committed RDF before the vocab project is live.**

If Jesse prefers `solid-mortgage.jeswr.org` (DNS action, `needs:user`), do it BEFORE first mint;
after first mint the vercel.app namespace is permanent and a jeswr.org alias may only be added
as an owl:sameAs/redirect layer. Demo-persona WebIDs live on the deployed pod host's domain
(see deployed-infra decision); real stakeholder orgs are identified by GLEIF LEI, never
fabricated identifiers.
