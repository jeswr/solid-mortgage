import { walletService } from "@/lib/server/service";

export function POST(request: Request): Promise<Response> {
  return walletService().changeGrant(request);
}
