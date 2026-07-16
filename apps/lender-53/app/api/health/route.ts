/** Tour-shell live health probe; all demo API payloads carry `simulated`. */
export function GET(): Response {
  return Response.json({ ok: true, service: "lender-53", simulated: true });
}
