/**
 * sm-65 — the seeded DEV POD: boots one in-memory sparq dev-server account,
 * seeds the full scripted-persona mortgage layout (seeder-design §4.3 "dev
 * server" consumption point) and prints the pod coordinates for the apps.
 *
 *   pnpm run dev:pod            # fresh seeded pod (strict create)
 *   SPARQ_CHECKOUT=… dev:pod    # + real native dual-sign rail (witnesses)
 *
 * Requires built workspace packages (`pnpm run build`). Runs on Node ≥ 24
 * via native type stripping — imports therefore carry explicit `.ts`
 * extensions. The pod is in-memory: stopping the process discards it, and
 * every boot reseeds deterministically from the same override layer.
 */

import { seedMortgagePod } from "@mortgage/solid-kit/mortgage-seed";
import { startSolidServer } from "@mortgage/solid-kit/testing";
import { createMortgageIssuance, nativeBridgeFromEnv } from "../e2e/support/mortgage-issuance.ts";

async function main(): Promise<void> {
  const server = await startSolidServer({});
  const account = server.accounts[0];
  if (account === undefined) throw new Error("solid server booted with no primary account");
  const now = new Date();
  const native = nativeBridgeFromEnv();
  const issuance = createMortgageIssuance({
    podOrigin: account.baseUrl,
    now,
    ...(native ?? {}),
  });
  const seeded = await seedMortgagePod({
    target: { webid: account.webid, baseUrl: account.baseUrl, authFetch: account.authFetch },
    issuance,
    now,
    mode: "create",
  });

  console.log(`Seeded dev pod (persona ${seeded.persona.id})`);
  console.log(`  origin : ${new URL(seeded.baseUrl).origin}`);
  console.log(`  webid  : ${seeded.webid}`);
  console.log(
    `  zk rail: ${native === undefined ? "captured operand encodings (no witnesses)" : "native dual-sign (SPARQ_CHECKOUT)"}`,
  );
  for (const pod of seeded.manifest.pods) {
    for (const resource of pod.resources) {
      console.log(`  ${resource.status.padEnd(8)} ${resource.url}`);
    }
  }
  console.log("Ctrl-C to stop (pod is in-memory; every boot reseeds).");

  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
