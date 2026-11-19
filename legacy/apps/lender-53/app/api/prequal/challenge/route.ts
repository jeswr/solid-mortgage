import { prequalService } from "../../../../lib/server/service";

export async function POST(request: Request): Promise<Response> {
  return prequalService().challenge(request);
}
