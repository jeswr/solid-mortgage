/**
 * Scenes 3 + 4: run the deterministic AUS over the GRANTED loan file and
 * deliver the decision + findings to the requesting party AND into the
 * borrower's pod — behind the decision-0015 boundary: the borrower identity
 * AND the evaluated pod are derived from the caller's verified DPoP token,
 * and the pod reads run over the AUS service identity the borrower's grant
 * names (real WAC enforcement, no anonymous fallback).
 */
import { ausRailService } from "../../../../lib/server/service";

export function POST(request: Request): Promise<Response> {
  return ausRailService().run(request);
}
