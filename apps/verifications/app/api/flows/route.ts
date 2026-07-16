import { issuerService } from "@/lib/server/service";

export function GET(request: Request): Promise<Response> {
  return issuerService().flows(request);
}
