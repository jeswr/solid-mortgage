/**
 * Zone health probe for the tour shell's live-status dock (SPEC §4 tour pattern).
 * Same-origin via the shell's multi-zone rewrites; `simulated: true` per SPEC §4.
 */
export function GET(): Response {
  return Response.json({ ok: true, service: "property", simulated: true });
}
