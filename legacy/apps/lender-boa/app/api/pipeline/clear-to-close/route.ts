/**
 * Demo loan-officer action: conditions satisfied, write the final approval
 * into the borrower's pod. Enabled only by `MORTGAGE_DEMO_STAFF_VIEW=1`.
 */
import { staffViewEnabled } from "../../../../lib/server/intake";
import { clearToClose } from "../../../../lib/server/pipeline";
import { lenderConfig, podErrorResponse } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  if (!staffViewEnabled()) {
    return Response.json({ simulated: true, error: "not_found" }, { status: 404 });
  }
  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    id = undefined;
  }
  if (typeof id !== "string" || id === "") {
    return Response.json(
      { simulated: true, error: "malformed_request", detail: "body must name a file id" },
      { status: 400 },
    );
  }
  try {
    const file = await clearToClose(id, lenderConfig());
    if (file === undefined) {
      return Response.json({ simulated: true, error: "not_found" }, { status: 404 });
    }
    return Response.json({ simulated: true, file });
  } catch (error) {
    return podErrorResponse(error);
  }
}
