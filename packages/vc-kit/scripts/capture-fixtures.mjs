// sm-26 — programmatic capture of EVERY hand-captured vc-kit ZK fixture
// (mirrors sparq's site/scripts/capture-zk-manifest.mjs; decision 0004/0005/0012).
//
// Produces, from the sparq NATIVE toolchain + the pinned JS prover:
//   test/fixtures/operand-enc.json                 — encode_int_literal term encodings
//   test/fixtures/dual-sign-attestations.json      — Schnorr-BJJ dual-sign attestations
//   test/fixtures/PROVENANCE.json                  — toolchain + checkout provenance
//
// Prereqs: a local jeswr/sparq checkout (SPARQ_CHECKOUT env var), the Rust
// toolchain (cargo), and the PINNED nargo on PATH. Run via:
//
//   SPARQ_CHECKOUT=/path/to/sparq pnpm --filter @mortgage/vc-kit run capture:fixtures
//
// The static rebuild (decision 0017) dropped the precomputed composite proofs,
// so this script no longer captures proof manifests or composite circuits.
//
// HONESTY: the sparq ZK estate is research-grade and NOT externally audited
// (sparq bead sq-qhy4). Nothing here is fabricated: if the native toolchain
// cannot run, this script FAILS; it never fakes an operand_enc.
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  generateKeyPairForSuite,
  issueCredential,
  PINNED_BB_JS_VERSION,
  PINNED_NARGO_VERSION,
  PINNED_NOIR_JS_VERSION,
} from "../dist/index.js";
import {
  claimGraphToNTriples,
  DEMO_ASSET_CREDENTIAL_ID,
  DEMO_BACKDATED_VALIDITY,
  DEMO_INCOME_CREDENTIAL_ID,
  DEMO_ISSUER,
  DEMO_ISSUER_SEEDS,
  DEMO_OPERAND_VALUES,
  DEMO_STATUS_LIST_URL,
  DEMO_SUBJECT,
  DEMO_ZK_STATUS,
  demoAssetClaims,
  demoEmploymentClaims,
  fixtureIndexBlindingHex,
  fixtureSaltHex,
  SparqSeedHelper,
} from "../dist/seed-tooling/index.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(here, "..", "test", "fixtures");

// The sparq car-hire age-gate cross-check vector (site/public/zk AGE_OPERAND_ENC[30]).
const CAR_HIRE_OPERAND_ENC_30 =
  "0x132fa587351bf3f12fd3cbed64d5526f28791099d1d40870f94595873c78fa72";
async function main() {
  const sparqCheckout = process.env.SPARQ_CHECKOUT;
  if (!sparqCheckout) {
    throw new Error(
      "SPARQ_CHECKOUT is not set — point it at a local jeswr/sparq checkout. " +
        "operand_enc / attestations MUST come from the sparq native toolchain (bead sm-26 rule 5).",
    );
  }
  const helper = new SparqSeedHelper({ sparqCheckout });
  const sparqCommit = await helper.sparqCommit();
  console.log(`[capture-fixtures] sparq checkout at ${sparqCommit}`);

  // ── 1. Issue the demo credentials exactly as the test rig does ────────────────
  const key = await generateKeyPairForSuite(`${DEMO_ISSUER}#key-1`, "Ed25519");
  const employment = await issueCredential({
    kind: "employment-income-credential",
    credentialId: DEMO_INCOME_CREDENTIAL_ID,
    issuer: DEMO_ISSUER,
    subject: DEMO_SUBJECT,
    claims: demoEmploymentClaims(),
    validity: DEMO_BACKDATED_VALIDITY,
    status: {
      statusPurpose: "revocation",
      statusListIndex: "42",
      statusListCredential: DEMO_STATUS_LIST_URL,
    },
    key,
  });
  const asset = await issueCredential({
    kind: "asset-credential",
    credentialId: DEMO_ASSET_CREDENTIAL_ID,
    issuer: DEMO_ISSUER,
    subject: DEMO_SUBJECT,
    claims: demoAssetClaims(),
    validity: DEMO_BACKDATED_VALIDITY,
    status: {
      statusPurpose: "revocation",
      statusListIndex: "7",
      statusListCredential: DEMO_STATUS_LIST_URL,
    },
    key,
  });

  // ── 2. One native job: encodings + dual-sign ─────────────────────────────────
  const credentialInput = (name, credential, issuerSeed, zkStatus) => ({
    name,
    ntriples: claimGraphToNTriples(credential.claimQuads),
    saltHex: fixtureSaltHex(credential.credentialId),
    issuerSeed,
    status: { ...zkStatus, indexBlindingHex: fixtureIndexBlindingHex(zkStatus) },
  });
  const result = await helper.run({
    encodeInts: [...DEMO_OPERAND_VALUES],
    credentials: [
      credentialInput(
        "employment",
        employment,
        DEMO_ISSUER_SEEDS.employer,
        DEMO_ZK_STATUS.employment,
      ),
      credentialInput("asset", asset, DEMO_ISSUER_SEEDS.bank, DEMO_ZK_STATUS.asset),
    ],
  });

  const enc30 = result.encodings["30"];
  if (enc30 !== CAR_HIRE_OPERAND_ENC_30) {
    throw new Error(
      `encode_int_literal(30) = ${enc30} does not match the sparq site's committed ` +
        `car-hire anchor ${CAR_HIRE_OPERAND_ENC_30} — sparq encoding contract changed; STOP`,
    );
  }

  // ── 3. Write every fixture ─────────────────────────────────────────────────────
  const capturedAt = new Date().toISOString().slice(0, 10);
  const provenance = {
    generatedBy: "packages/vc-kit/scripts/capture-fixtures.mjs (sm-26)",
    regenerate:
      "SPARQ_CHECKOUT=<sparq checkout> pnpm --filter @mortgage/vc-kit run capture:fixtures",
    sparqRepository: "https://github.com/jeswr/sparq",
    sparqCommit,
    toolchain: {
      nargo: PINNED_NARGO_VERSION,
      noirJs: PINNED_NOIR_JS_VERSION,
      bbJs: PINNED_BB_JS_VERSION,
      node: process.version,
    },
    capturedAt,
    note:
      "All values are genuine sparq-native outputs (encode_int_literal, Poseidon2 " +
      "commitments, Schnorr-BJJ signatures). Research-grade; NOT externally audited (sparq bead sq-qhy4).",
  };
  await writeFile(join(fixturesDir, "PROVENANCE.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  await writeFile(
    join(fixturesDir, "operand-enc.json"),
    `${JSON.stringify({ provenance: provenanceRef(provenance), encodings: result.encodings }, null, 2)}\n`,
  );
  await writeFile(
    join(fixturesDir, "dual-sign-attestations.json"),
    `${JSON.stringify(
      {
        provenance: provenanceRef(provenance),
        subject: DEMO_SUBJECT,
        credentials: {
          employment: {
            credentialId: employment.credentialId,
            issuerSeed: DEMO_ISSUER_SEEDS.employer,
            zkStatus: DEMO_ZK_STATUS.employment,
            saltHex: fixtureSaltHex(employment.credentialId),
            indexBlindingHex: fixtureIndexBlindingHex(DEMO_ZK_STATUS.employment),
            attestation: result.attestations.employment,
          },
          asset: {
            credentialId: asset.credentialId,
            issuerSeed: DEMO_ISSUER_SEEDS.bank,
            zkStatus: DEMO_ZK_STATUS.asset,
            saltHex: fixtureSaltHex(asset.credentialId),
            indexBlindingHex: fixtureIndexBlindingHex(DEMO_ZK_STATUS.asset),
            attestation: result.attestations.asset,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`[capture-fixtures] wrote fixtures to ${fixturesDir}`);
  process.exit(0);
}

function provenanceRef(provenance) {
  return {
    see: "PROVENANCE.json",
    sparqCommit: provenance.sparqCommit,
    capturedAt: provenance.capturedAt,
  };
}

main().catch((error) => {
  console.error("[capture-fixtures] FAILED:", error);
  process.exit(1);
});
