/**
 * Scene-4: the lender-side "request re-verification" click. The RE-ISSUE
 * itself is the ISSUER's act (the verifications app re-signs through the
 * borrower's EXISTING grant — decision 0007); this endpoint records the
 * lender's request and tells the client to re-check until the replacement
 * credential appears in the pod. Nothing is persisted (no PII).
 */

import { assertAllowedPodBase, PodAccessError } from "../../../../lib/server/pod";
import { lenderConfig } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  let pod: unknown;
  try {
    ({ pod } = (await request.json()) as Record<string, unknown>);
  } catch {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "body must be JSON" },
      { status: 400 },
    );
  }
  if (typeof pod !== "string") {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "pod is required" },
      { status: 400 },
    );
  }
  try {
    assertAllowedPodBase(pod, lenderConfig());
  } catch (error) {
    if (error instanceof PodAccessError) {
      return Response.json(
        { simulated: true, error: "pod_access", detail: error.message },
        { status: error.status },
      );
    }
    return Response.json({ simulated: true, error: "internal_error" }, { status: 500 });
  }
  return Response.json({
    simulated: true,
    requested: true,
    nextStep:
      "The employment verifier re-issues through the existing grant (one click for the borrower); re-run the freshness check to pick up the replacement credential.",
  });
}
