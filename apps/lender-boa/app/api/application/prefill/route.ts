/**
 * Scene-3: URLA-subset prefill from the GRANTED pod (decision 0012 rail 2).
 * `?pod=` is confined to the operator allowlist (SSRF fail-closed) and every
 * fetched document is SHACL-revalidated before a value is reflected.
 */

import { prefillFromPod } from "../../../../lib/server/prefill";
import { lenderConfig, podErrorResponse } from "../../../../lib/server/service";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pod = url.searchParams.get("pod");
  const webid = url.searchParams.get("webid");
  if (pod === null || webid === null) {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "pod and webid are required" },
      { status: 400 },
    );
  }
  try {
    return Response.json(await prefillFromPod(pod, webid, lenderConfig()));
  } catch (error) {
    return podErrorResponse(error);
  }
}
