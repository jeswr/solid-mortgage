import { walletService } from "@/lib/server/service";

export function GET(request: Request): Promise<Response> {
  return walletService().grants(request);
}
