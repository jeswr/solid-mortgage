/**
 * Scene-2 VP-POST rail, step 2 (SECURITY-CRITICAL; decision 0012): verify the
 * presented Tier A proofs against their MANDATORY operand-anchor VCs — nine
 * fail-closed gates per statement, holder-bound to the DPoP-verified WebID.
 * No credit pull, no PII stored, nothing persisted.
 */
import { prequalService } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  return prequalService().verify(request);
}
