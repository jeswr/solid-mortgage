/**
 * Scene-3: URLA-subset prefill from the borrower's granted pod (decision 0012
 * rail 2) behind the decision-0015 boundary: the caller must present
 * DPoP-bound Solid-OIDC credentials, and BOTH the borrower WebID and the pod
 * are derived from the verified token — `pod`/`webid` parameters are rejected.
 * Every fetched document is SHACL-revalidated and subject-bound before a value
 * is reflected.
 */
import { podRailService } from "../../../../lib/server/service";

export function GET(request: Request): Promise<Response> {
  return podRailService().prefill(request);
}
