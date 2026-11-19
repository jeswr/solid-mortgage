import { configFromEnv } from "./config";
import { type ClosingService, createClosingService } from "./pod-rail";

/** Process singleton: the verifier owns the DPoP replay cache and must not be per-request. */
let closing: ClosingService | undefined;

export function closingService(): ClosingService {
  closing ??= createClosingService({ config: configFromEnv() });
  return closing;
}
