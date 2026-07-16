/**
 * Scene-4: pre-close freshness re-check over the granted pod's employment VC
 * (decision 0007: green tick = valid window AND positively-confirmed status).
 */
import { checkEmploymentFreshness } from "../../../lib/server/freshness";
import { lenderConfig, podErrorResponse } from "../../../lib/server/service";

export async function GET(request: Request): Promise<Response> {
  const pod = new URL(request.url).searchParams.get("pod");
  if (pod === null) {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "pod is required" },
      { status: 400 },
    );
  }
  try {
    return Response.json(await checkEmploymentFreshness(pod, lenderConfig()));
  } catch (error) {
    return podErrorResponse(error);
  }
}
