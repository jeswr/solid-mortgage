import { configFromEnv } from "./config";
import { createWalletService, type WalletService } from "./wallet-rail";

/** Process singleton: the verifier owns the DPoP replay cache and must not be per-request. */
let wallet: WalletService | undefined;

export function walletService(): WalletService {
  wallet ??= createWalletService({ config: configFromEnv() });
  return wallet;
}
