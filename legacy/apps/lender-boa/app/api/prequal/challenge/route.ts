/**
 * Scene-2 VP-POST rail, step 1 (decision 0012): the DPoP-authenticated
 * presenter mints one single-use challenge nonce per advertised statement.
 */
import { prequalService } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  return prequalService().challenge(request);
}
