/** SECURITY-CRITICAL: real Tier A + mandatory operand-anchor verification. */
import { prequalService } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  return prequalService().verify(request);
}
