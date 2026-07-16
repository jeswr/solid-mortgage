import { closingService } from "@/lib/server/service";

export function POST(request: Request): Promise<Response> {
  return closingService().grantServicer(request);
}
