/**
 * Scene-4: the lender-side "request re-verification" click. The RE-ISSUE
 * itself is the ISSUER's act (the verifications app re-signs through the
 * borrower's EXISTING grant — decision 0007); this endpoint records the
 * lender's request and tells the client to re-check until the replacement
 * credential appears in the pod. Nothing is persisted (no PII). Same
 * decision-0015 boundary as the other pod routes: authenticated caller only,
 * no pod/webid parameters.
 */
import { podRailService } from "../../../../lib/server/service";

export function POST(request: Request): Promise<Response> {
  return podRailService().reissueRequest(request);
}
