import { closingService } from "@/lib/server/service";

export function GET(request: Request): Promise<Response> {
  return closingService().ledger(request);
}
