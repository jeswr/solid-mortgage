/**
 * First American-modelled title issuance: signs a TitleClearCredential
 * (clear/clouded status) and writes it into the AUTHENTICATED caller's own pod
 * (decision 0015: pod + WebID derived from the verified DPoP token, never from
 * the request).
 */
import { propertyRailService } from "../../../../lib/server/service";

export function POST(request: Request): Promise<Response> {
  return propertyRailService().issueTitle(request);
}
