/**
 * Demo loan-officer pipeline: the files received through the authenticated
 * application rail, each read live from the borrower's pod. Enabled only by
 * `MORTGAGE_DEMO_STAFF_VIEW=1` (see lib/server/intake.ts) — 404 otherwise.
 */
import { staffViewEnabled } from "../../../lib/server/intake";
import { readPipeline } from "../../../lib/server/pipeline";
import { lenderConfig, podErrorResponse } from "../../../lib/server/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!staffViewEnabled()) {
    return Response.json({ simulated: true, error: "not_found" }, { status: 404 });
  }
  try {
    return Response.json({ simulated: true, files: await readPipeline(lenderConfig()) });
  } catch (error) {
    return podErrorResponse(error);
  }
}
