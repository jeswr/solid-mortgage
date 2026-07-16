/** Shared process-wide security state: verifier replay cache + nonce store. */
import { configFromEnv } from "./config";
import { createPrequalService, type PrequalService } from "./prequal";

let prequal: PrequalService | undefined;

export function prequalService(): PrequalService {
  prequal ??= createPrequalService({ config: configFromEnv() });
  return prequal;
}
