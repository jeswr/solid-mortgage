/**
 * Scene-4: pre-close freshness re-check over the granted pod's employment VC
 * (decision 0007: green tick = valid window AND positively-confirmed status),
 * behind the decision-0015 boundary: the borrower identity AND the checked
 * pod are derived from the caller's verified DPoP token — a caller can never
 * point the check at someone else's pod.
 */
import { podRailService } from "../../../lib/server/service";

export function GET(request: Request): Promise<Response> {
  return podRailService().freshness(request);
}
