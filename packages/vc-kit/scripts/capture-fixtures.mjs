// sm-26 — programmatic capture of EVERY hand-captured vc-kit ZK fixture
// (mirrors sparq's site/scripts/capture-zk-manifest.mjs; decision 0004/0005/0012).
//
// Produces, from the sparq NATIVE toolchain + the pinned JS prover:
//   test/fixtures/operand-enc.json                 — encode_int_literal term encodings
//   test/fixtures/dual-sign-attestations.json      — Schnorr-BJJ dual-sign attestations
//   test/fixtures/mortgage-composite-manifest.json — Tier B join+revoke+issuer capture
//   test/fixtures/car-hire-manifest.json           — the filter_int_d2 age-gate capture
//   test/fixtures/circuits/<member>.json           — compiled composite circuit artifacts
//   test/fixtures/PROVENANCE.json                  — toolchain + checkout provenance
//
// Prereqs: a local jeswr/sparq checkout (SPARQ_CHECKOUT env var), the Rust
// toolchain (cargo), and the PINNED nargo on PATH. Run via:
//
//   SPARQ_CHECKOUT=/path/to/sparq pnpm --filter @mortgage/vc-kit run capture:fixtures
//
// HONESTY: the sparq ZK estate is research-grade and NOT externally audited
// (sparq bead sq-qhy4). Nothing here is fabricated — every proof byte is a
// genuine UltraHonk transcript that self-verified before being written, and
// deliverable 5 of the bead applies: if the native toolchain cannot run, this
// script FAILS; it never fakes an operand_enc.
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  challengeFieldOf,
  generateKeyPairForSuite,
  issueCredential,
  loadCommittedCircuit,
  PINNED_BB_JS_VERSION,
  PINNED_NARGO_VERSION,
  PINNED_NOIR_JS_VERSION,
} from "../dist/index.js";
import {
  captureCompositeManifest,
  claimGraphToNTriples,
  DEMO_ASSET_CREDENTIAL_ID,
  DEMO_BACKDATED_VALIDITY,
  DEMO_INCOME_CREDENTIAL_ID,
  DEMO_ISSUER,
  DEMO_ISSUER_KEY_SET,
  DEMO_ISSUER_SEEDS,
  DEMO_OPERAND_VALUES,
  DEMO_STATUS_LIST_URL,
  DEMO_SUBJECT,
  DEMO_ZK_REVOKED_DECOYS,
  DEMO_ZK_STATUS,
  DEMO_ZK_STATUS_LIST_SIZE,
  defaultIndexBlindingHex,
  defaultSaltHex,
  demoAssetClaims,
  demoEmploymentClaims,
  deriveFieldHex,
  SparqSeedHelper,
} from "../dist/seed-tooling/index.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(here, "..", "test", "fixtures");
const circuitsDir = join(fixturesDir, "circuits");

// The sparq car-hire age-gate cross-check vector (site/public/zk AGE_OPERAND_ENC[30]).
const CAR_HIRE_OPERAND_ENC_30 =
  "0x132fa587351bf3f12fd3cbed64d5526f28791099d1d40870f94595873c78fa72";
// Capture-time nonce for the Tier B composite (decision 0012: precomputed,
// never challenge-fresh; the nonce string is recorded for provenance).
const COMPOSITE_NONCE = "sm-26 mortgage composite capture nonce v1";

/** Pretty-print JSON but keep long numeric arrays ("proof": [...]) on one line. */
function stringifyWithInlineProofs(value) {
  return `${JSON.stringify(
    value,
    (_key, entry) =>
      Array.isArray(entry) && entry.length > 64 && entry.every((n) => typeof n === "number")
        ? `@@${entry.join(",")}@@`
        : entry,
    2,
  ).replaceAll(/"@@([\d,]*)@@"/g, "[$1]")}\n`;
}

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

  // ── 2. One native job: encodings + dual-sign + composite witness build ────────
  const credentialInput = (name, credential, issuerSeed, zkStatus) => ({
    name,
    ntriples: claimGraphToNTriples(credential.claimQuads),
    saltHex: defaultSaltHex(credential.credentialId),
    issuerSeed,
    status: { ...zkStatus, indexBlindingHex: defaultIndexBlindingHex(zkStatus) },
  });
  const challengeHex = await challengeFieldOf(COMPOSITE_NONCE);
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
    composite: {
      challengeHex,
      join: {
        a: "employment",
        b: "asset",
        slotA: 0,
        slotB: 0,
        blindingHex: deriveFieldHex("sm-26 join blinding v1"),
      },
      revoke: {
        credential: "employment",
        depth: 10,
        size: DEMO_ZK_STATUS_LIST_SIZE,
        revokedIndices: [...DEMO_ZK_REVOKED_DECOYS],
      },
      hiddenIssuer: {
        issuerSeeds: [...DEMO_ISSUER_KEY_SET],
        credential: "employment",
        depth: 4,
      },
    },
  });

  const enc30 = result.encodings["30"];
  if (enc30 !== CAR_HIRE_OPERAND_ENC_30) {
    throw new Error(
      `encode_int_literal(30) = ${enc30} does not match the sparq site's committed ` +
        `car-hire anchor ${CAR_HIRE_OPERAND_ENC_30} — sparq encoding contract changed; STOP`,
    );
  }

  // ── 3. Compile the composite members with the pinned nargo ────────────────────
  const members = [
    result.composite.join.member,
    result.composite.revoke.member,
    result.composite.hiddenIssuer.member,
  ];
  const workDir = join(tmpdir(), "sm26-zk-compose");
  console.log(`[capture-fixtures] compiling ${members.join(", ")} (nargo, ${workDir})`);
  const circuits = await helper.compileCircuits(members, workDir);

  // ── 4. Prove + self-verify the Tier B composite ────────────────────────────────
  const capturedAt = new Date().toISOString().slice(0, 10);
  const manifest = await captureCompositeManifest({
    result,
    nonce: COMPOSITE_NONCE,
    circuits,
    capturedAt,
  });
  console.log(
    `[capture-fixtures] composite: ${manifest.subProofs
      .map((sub) => `${sub.member} (${sub.proof.length} B)`)
      .join(", ")}`,
  );

  // ── 5. Re-capture the car-hire manifest (sparq's exact statement) ──────────────
  const carHire = await captureCarHire(enc30);

  // ── 6. Write every fixture ─────────────────────────────────────────────────────
  await mkdir(circuitsDir, { recursive: true });
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
    compositeNonce: COMPOSITE_NONCE,
    note:
      "All values are genuine sparq-native outputs (encode_int_literal, Poseidon2 " +
      "commitments, Schnorr-BJJ signatures) and genuine self-verified UltraHonk " +
      "transcripts. Research-grade; NOT externally audited (sparq bead sq-qhy4).",
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
            saltHex: defaultSaltHex(employment.credentialId),
            indexBlindingHex: defaultIndexBlindingHex(DEMO_ZK_STATUS.employment),
            attestation: result.attestations.employment,
          },
          asset: {
            credentialId: asset.credentialId,
            issuerSeed: DEMO_ISSUER_SEEDS.bank,
            zkStatus: DEMO_ZK_STATUS.asset,
            saltHex: defaultSaltHex(asset.credentialId),
            indexBlindingHex: defaultIndexBlindingHex(DEMO_ZK_STATUS.asset),
            attestation: result.attestations.asset,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(fixturesDir, "mortgage-composite-manifest.json"),
    stringifyWithInlineProofs(manifest),
  );
  await writeFile(join(fixturesDir, "car-hire-manifest.json"), stringifyWithInlineProofs(carHire));
  for (const [member, artifact] of Object.entries(circuits)) {
    await writeFile(
      join(circuitsDir, `${member}.json`),
      `${JSON.stringify({ provenance: provenanceRef(provenance), ...artifact }, null, 2)}\n`,
    );
  }
  console.log(`[capture-fixtures] wrote fixtures to ${fixturesDir}`);
  // bb.js keeps a wasm worker pool alive; exit explicitly (sparq does the same).
  process.exit(0);
}

function provenanceRef(provenance) {
  return {
    see: "PROVENANCE.json",
    sparqCommit: provenance.sparqCommit,
    capturedAt: provenance.capturedAt,
  };
}

/**
 * Re-capture sparq's car-hire age-gate manifest with the SAME inputs the
 * sparq site ships (site/scripts/capture-zk-manifest.mjs): filter_int_d2,
 * age 30 >= 25, challenge 0x1, the committed operand anchor for 30.
 */
async function captureCarHire(operandEnc30) {
  const circuit = await loadCommittedCircuit("filter_int_d2");
  const { Noir } = await import("@noir-lang/noir_js");
  const bb = await import("@aztec/bb.js");
  const api = await bb.Barretenberg.new({ threads: 1 });
  const backend = new bb.UltraHonkBackend(circuit.bytecode, api);
  const CAPTURED_AGE = 30;
  const inputs = {
    challenge: "0x1",
    operand_enc: operandEnc30,
    op: "3", // OP_GE
    bound: "25",
    expected: true,
    // PRIVATE — the exact age as ASCII digit bytes, never disclosed.
    digits: [...String(CAPTURED_AGE)].map((char) => String(char.charCodeAt(0))),
  };
  const noir = new Noir(circuit);
  const { witness } = await noir.execute(inputs);
  const { proof, publicInputs } = await backend.generateProof(witness, { verifierTarget: "evm" });
  const verified = await backend.verifyProof({ proof, publicInputs }, { verifierTarget: "evm" });
  if (!verified) {
    throw new Error("car-hire capture did not self-verify — refusing to write a bad fixture");
  }
  if (publicInputs.some((entry) => BigInt(entry) === BigInt(CAPTURED_AGE))) {
    throw new Error("car-hire capture leaks the hidden age into the public inputs — aborting");
  }
  return {
    type: "urn:sparq:zk:ProofManifest",
    note:
      "Research-grade, NOT externally audited (sparq bead sq-qhy4). One genuinely " +
      "captured + in-tab-verifiable sub-proof: the age-gate FILTER (age >= 25). The " +
      "hidden age is never in the public inputs. Re-captured programmatically by " +
      "packages/vc-kit/scripts/capture-fixtures.mjs (sm-26), mirroring sparq's " +
      "site/scripts/capture-zk-manifest.mjs inputs exactly.",
    circuit: "filter_int_d2",
    proofOptions: { verifierTarget: "evm" },
    capturedAt: new Date().toISOString().slice(0, 10),
    subProof: {
      member: "filter_int_d2",
      relation: "age >= 25 over a hidden integer age",
      proof: Array.from(proof),
      publicInputs,
    },
  };
}

main().catch((error) => {
  console.error("[capture-fixtures] FAILED:", error);
  process.exit(1);
});
