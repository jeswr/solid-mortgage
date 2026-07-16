/**
 * Scene-3: submit the application — writes the URLA-subset application and
 * the instant decision back into the granted pod and returns the Loan
 * Estimate payload (TRID: delivered or placed in the mail within 3 business
 * days of the application; here it lands in the pod immediately).
 */
import { submitApplication } from "../../../../lib/server/loan";
import { lenderConfig, podErrorResponse } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  let pod: unknown;
  let webid: unknown;
  try {
    ({ pod, webid } = (await request.json()) as Record<string, unknown>);
  } catch {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "body must be JSON" },
      { status: 400 },
    );
  }
  if (typeof pod !== "string" || typeof webid !== "string") {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "pod and webid are required" },
      { status: 400 },
    );
  }
  try {
    return Response.json(await submitApplication(pod, webid, lenderConfig()));
  } catch (error) {
    return podErrorResponse(error);
  }
}
