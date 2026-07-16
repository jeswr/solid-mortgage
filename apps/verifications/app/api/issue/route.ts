import { issuerService } from "@/lib/server/service";

export function POST(request: Request): Promise<Response> {
  return issuerService().issue(request);
}
