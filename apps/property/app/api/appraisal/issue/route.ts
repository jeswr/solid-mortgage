/**
 * Cotality-modelled appraisal issuance: signs an AppraisalCredential (with the
 * appraised value as a plain DISCLOSED claim — never ZK-proved, decision 0005)
 * and writes it into the AUTHENTICATED caller's own pod (decision 0015: pod +
 * WebID derived from the verified DPoP token, never from the request).
 */
import { propertyRailService } from "../../../../lib/server/service";

export function POST(request: Request): Promise<Response> {
  return propertyRailService().issueAppraisal(request);
}
