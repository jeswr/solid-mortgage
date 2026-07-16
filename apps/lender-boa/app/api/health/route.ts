/** Tiny liveness probe for the tour app's live-status dock. */
export function GET(): Response {
  return Response.json({ ok: true, app: "lender-boa", simulated: true });
}
