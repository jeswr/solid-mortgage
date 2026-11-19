/**
 * Scene-3: submit the application — writes the URLA-subset application and
 * the instant decision back into the AUTHENTICATED caller's own pod (decision
 * 0015: pod + WebID derived from the verified DPoP token, never from the
 * body) and returns the Loan Estimate payload (TRID: delivered or placed in
 * the mail within 3 business days of the application; here it lands in the
 * pod immediately).
 */
import { podRailService } from "../../../../lib/server/service";

export function POST(request: Request): Promise<Response> {
  return podRailService().submit(request);
}
