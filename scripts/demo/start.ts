/**
 * `pnpm demo` — the whole Solid Mortgage Showcase on ONE local origin, ready to click.
 *
 *   pnpm install && pnpm build   # once
 *   pnpm demo                    # then open the printed URL
 *
 * Boots (all loopback-only, in memory, gone on Ctrl-C):
 *   - the demo borrower's identity provider (a local Solid-OIDC dev issuer),
 *   - one service identity per organisation that writes to the pod,
 *   - the borrower's pod (sparq's Solid server), seeded with the scripted persona's data
 *     and five signed credentials, behind a recorder that logs every request,
 *   - every app (`next start` on the build), wired with the same configuration the
 *     cross-app journey e2e uses,
 *   - the gateway (`./gateway.ts`) that signs visitors in automatically and adds the
 *     guided-steps bar and the pod activity sidebar to every page.
 *
 * Runs on Node >= 24 via native type stripping (imports carry `.ts`).
 * DEMO_PORT overrides the gateway port (default 4400).
 */
import { type ChildProcess, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seedMortgagePod } from "@mortgage/solid-kit/mortgage-seed";
import { profileCardFixture, seedPod, startDevOidcIssuer } from "@mortgage/solid-kit/testing";
import {
  createMortgageIssuance,
  nativeBridgeFromEnv,
  type SeedIssuerExport,
} from "../../e2e/support/mortgage-issuance.ts";
import { ActivityLog, startPodRecorder } from "./activity.ts";
import { startGateway } from "./gateway.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const host = "127.0.0.1";
/** The overview's port; each app gets the next one (4401, 4402, …), like its own subdomain. */
const gatewayPort = Number(process.env.DEMO_PORT ?? 4400);

/**
 * The grantable parties' WebIDs (RFC 2606 `.example`: ACL agents, never dereferenced) —
 * the same IRIs the Data Vault grants to (`apps/wallet/lib/grants/client.ts`).
 */
const PARTY_WEBIDS = {
  lender: "https://lender.example/orgs/underwriting#id",
  lender53: "https://lender53.example/orgs/prequal#id",
  gse: "https://gse.example/orgs/automated-underwriting#id",
  closing: "https://closing.example/orgs/eclose#id",
  servicer: "https://servicer.example/orgs/servicing#id",
} as const;

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((done, fail) => {
    server.once("error", fail);
    server.listen(0, host, done);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("no free port");
  await new Promise<void>((done) => server.close(() => done()));
  return address.port;
}

async function waitFor(url: string, child: ChildProcess, name: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${name} exited during startup`);
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(`${name} did not come up at ${url}`);
}

const children: ChildProcess[] = [];

async function startApp(
  name: string,
  directory: string,
  readyPath: string,
  env: Record<string, string>,
): Promise<number> {
  const port = await freePort();
  const appDir = resolve(root, directory);
  const next = createRequire(resolve(appDir, "package.json")).resolve("next/dist/bin/next");
  const child = spawn(
    process.execPath,
    [next, "start", "--hostname", host, "--port", String(port)],
    {
      cwd: appDir,
      detached: process.platform !== "win32",
      env: { ...process.env, NODE_ENV: "production", ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const logs: string[] = [];
  child.stdout?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => {
    logs.push(chunk.toString());
    if (process.env.DEMO_VERBOSE) process.stderr.write(`[${name}] ${chunk}`);
  });
  children.push(child);
  try {
    await waitFor(`http://${host}:${port}${readyPath}`, child, name);
  } catch (error) {
    console.error(logs.join(""));
    throw error;
  }
  return port;
}

function stopChildren(): void {
  for (const child of children) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    try {
      process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

async function main(): Promise<void> {
  const log = new ActivityLog();
  let muted = true;

  // ── Identities ────────────────────────────────────────────────────────────────
  // The issuer reads `storage` per request: it is filled in once the pod origin is known.
  const borrowerOptions: Parameters<typeof startDevOidcIssuer>[0] = {};
  const borrowerIssuer = await startDevOidcIssuer(borrowerOptions);
  const services = {
    wallet: await startDevOidcIssuer({
      clientCredentials: { clientId: "demo-wallet", clientSecret: "demo-wallet-secret" },
      webidScheme: "http",
    }),
    verifications: await startDevOidcIssuer({
      clientCredentials: {
        clientId: "demo-verifications",
        clientSecret: "demo-verifications-secret",
      },
      webidScheme: "http",
    }),
    aus: await startDevOidcIssuer({
      clientCredentials: { clientId: "demo-aus", clientSecret: "demo-aus-secret" },
      webidScheme: "http",
    }),
    closing: await startDevOidcIssuer({
      clientCredentials: { clientId: "demo-closing", clientSecret: "demo-closing-secret" },
      webidScheme: "http",
    }),
  };
  const clientOf = {
    wallet: ["demo-wallet", "demo-wallet-secret"],
    verifications: ["demo-verifications", "demo-verifications-secret"],
    aus: ["demo-aus", "demo-aus-secret"],
    closing: ["demo-closing", "demo-closing-secret"],
  } as const;

  // ── The borrower's pod, behind the activity recorder ─────────────────────────
  const recorderPort = await freePort();
  const podPort = await freePort();
  const podOrigin = `http://${host}:${recorderPort}`;
  const podBase = `${podOrigin}/`;
  const { startSolidServer } = (await import(
    createRequire(resolve(root, "packages/solid-kit/package.json")).resolve("@jeswr/solid-server")
  )) as typeof import("@jeswr/solid-server");

  let pod = await startSolidServer({
    port: podPort,
    baseUrl: podOrigin,
    ownerWebid: borrowerIssuer.webid,
  });

  const directory = new Map<string, string>([
    [borrowerIssuer.webid, "Alex Rivera (borrower)"],
    [services.wallet.webid, "Data Vault service"],
    [services.verifications.webid, "Verification Services"],
    [services.aus.webid, "Automated Underwriting service"],
    [services.closing.webid, "Digital Closing platform"],
    [PARTY_WEBIDS.lender, "Primary lender"],
    [PARTY_WEBIDS.lender53, "Competing lender"],
    [PARTY_WEBIDS.gse, "Underwriting (GSE)"],
    [PARTY_WEBIDS.closing, "Closing platform"],
    [PARTY_WEBIDS.servicer, "Loan servicer"],
  ]);

  let gatewayRef: Awaited<ReturnType<typeof startGateway>> | undefined;
  // Filled in once the app origins are known (before any browser can reach the pod).
  const browserOrigins = new Map<string, string>();
  const recorder = await startPodRecorder({
    listenPort: recorderPort,
    podPort,
    log,
    directory,
    attributeServerCall: () => gatewayRef?.inflightApp(),
    browserOrigins,
    isMuted: () => muted,
  });

  const now = new Date();
  const issuance = createMortgageIssuance({ podOrigin, now, ...(nativeBridgeFromEnv() ?? {}) });

  async function seed(): Promise<number> {
    const seeded = await seedMortgagePod({
      target: { webid: borrowerIssuer.webid, baseUrl: podOrigin, authFetch: fetch },
      issuance,
      now,
      mode: "create",
    });
    await seedPod(
      podOrigin,
      [
        profileCardFixture({
          webid: borrowerIssuer.webid,
          name: seeded.persona.displayName,
          storage: podBase,
        }),
      ],
      { fetch, ownerWebid: borrowerIssuer.webid },
    );
    // Scene 1 starts with the asset slot EMPTY, so the visitor's click really issues it.
    await fetch(`${podBase}mortgage/credentials/assets`, { method: "DELETE" });
    return seeded.manifest.pods.reduce((total, entry) => total + entry.resources.length, 0);
  }

  // The WebID's forward `pim:storage` claim (decision 0015 L2).
  borrowerOptions.storage = podBase;
  const resourceCount = await seed();
  muted = false;
  log.record({
    kind: "info",
    actor: "Demo setup",
    summary: `Created Alex Rivera's pod and filled it with ${resourceCount} resources: profile, loan documents, five signed credentials, and owner-only access rules`,
  });

  async function reset(): Promise<void> {
    muted = true;
    await pod.closeAsync();
    pod = await startSolidServer({
      port: podPort,
      baseUrl: podOrigin,
      ownerWebid: borrowerIssuer.webid,
    });
    log.clear();
    const count = await seed();
    muted = false;
    log.record({
      kind: "info",
      actor: "Demo setup",
      summary: `Reset: Alex Rivera's pod was recreated with ${count} resources`,
    });
  }

  // ── Apps ──────────────────────────────────────────────────────────────────────
  const exported = (await issuance.exportSeedIssuers()) as readonly SeedIssuerExport[];
  const issuer = (role: string) => {
    const entry = exported.find((candidate) => candidate.role === role);
    if (entry === undefined) throw new Error(`no seed issuer for ${role}`);
    return entry;
  };
  const employment = issuer("employment");
  const bank = issuer("bank");
  const bureau = issuer("bureau");
  const trustedCredentialIssuers = exported.map((entry) => entry.iri).join(",");

  const shared = {
    MORTGAGE_TRUSTED_OIDC_ISSUERS: borrowerIssuer.issuer,
    MORTGAGE_POD_ALLOWED_ORIGINS: podOrigin,
    MORTGAGE_DEV_ALLOW_LOOPBACK: "1",
    MORTGAGE_TRUST_FORWARDED_HEADERS: "1",
  };
  const servicePod = (prefix: string, service: keyof typeof services) => ({
    [`${prefix}_POD_SERVICE_ISSUER`]: services[service].issuer,
    [`${prefix}_POD_SERVICE_CLIENT_ID`]: clientOf[service][0],
    [`${prefix}_POD_SERVICE_CLIENT_SECRET`]: clientOf[service][1],
  });
  const flowIssuer = (flow: string, entry: SeedIssuerExport) => ({
    [`MORTGAGE_VERIFICATIONS_${flow}_ISSUER_WEBID`]: entry.iri,
    [`MORTGAGE_VERIFICATIONS_${flow}_ISSUER_KEY_JWK`]: entry.privateJwkJson,
    [`MORTGAGE_VERIFICATIONS_${flow}_ISSUER_KEY_VM`]: entry.verificationMethod,
    [`MORTGAGE_VERIFICATIONS_${flow}_STATUS_LIST_URL`]: entry.statusListUrl,
  });
  const parties = {
    MORTGAGE_LENDER_SERVICE_WEBID: PARTY_WEBIDS.lender,
    MORTGAGE_LENDER53_SERVICE_WEBID: PARTY_WEBIDS.lender53,
    MORTGAGE_GSE_SERVICE_WEBID: PARTY_WEBIDS.gse,
    MORTGAGE_SERVICER_SERVICE_WEBID: PARTY_WEBIDS.servicer,
  };

  console.log("Starting the apps (this takes a few seconds)…");
  const zoneSpecs = [
    {
      prefix: "/wallet",
      appName: "Data Vault",
      dir: "apps/wallet",
      env: {
        ...shared,
        ...parties,
        MORTGAGE_CLOSING_SERVICE_WEBID: PARTY_WEBIDS.closing,
        ...servicePod("MORTGAGE_WALLET", "wallet"),
        MORTGAGE_WALLET_SERVICE_WEBID: services.wallet.webid,
      },
    },
    {
      prefix: "/verifications",
      appName: "Verification Services",
      dir: "apps/verifications",
      env: {
        ...shared,
        ...servicePod("MORTGAGE_VERIFICATIONS", "verifications"),
        MORTGAGE_VERIFICATIONS_SERVICE_WEBID: services.verifications.webid,
        ...flowIssuer("EMPLOYMENT", employment),
        ...flowIssuer("ASSETS", bank),
        ...flowIssuer("CREDIT", bureau),
      },
    },
    {
      prefix: "/lender-boa",
      appName: "Mortgage Origination",
      dir: "apps/lender-boa",
      env: {
        ...shared,
        MORTGAGE_TRUSTED_ANCHOR_ISSUERS: [employment.iri, bureau.iri].join(","),
        MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS: trustedCredentialIssuers,
        // The loan-officer queue (no staff login exists in the demo; local only).
        MORTGAGE_DEMO_STAFF_VIEW: "1",
      },
    },
    {
      prefix: "/lender-53",
      appName: "Mortgage Pre-qualification",
      dir: "apps/lender-53",
      env: { ...shared, MORTGAGE_TRUSTED_ANCHOR_ISSUERS: [employment.iri, bureau.iri].join(",") },
    },
    {
      prefix: "/gse",
      appName: "Automated Underwriting",
      dir: "apps/gse",
      env: {
        ...shared,
        ...servicePod("MORTGAGE_AUS", "aus"),
        MORTGAGE_AUS_SERVICE_WEBID: services.aus.webid,
        MORTGAGE_TRUSTED_CREDENTIAL_ISSUERS: trustedCredentialIssuers,
      },
    },
    { prefix: "/property", appName: "Property Services", dir: "apps/property", env: { ...shared } },
    {
      prefix: "/closing",
      appName: "Digital Closing",
      dir: "apps/closing",
      env: {
        ...shared,
        ...parties,
        ...servicePod("MORTGAGE_CLOSING", "closing"),
        MORTGAGE_CLOSING_SERVICE_WEBID: services.closing.webid,
      },
    },
  ];

  const zones = await Promise.all(
    zoneSpecs.map(async (spec, index) => ({
      prefix: spec.prefix,
      appName: spec.appName,
      publicPort: gatewayPort + index + 1,
      port: await startApp(spec.appName, spec.dir, `${spec.prefix}/api/health`, spec.env),
    })),
  );
  const gatewayOrigin = `http://${host}:${gatewayPort}`;
  browserOrigins.set(gatewayOrigin, "Overview");
  for (const zone of zones) browserOrigins.set(`http://${host}:${zone.publicPort}`, zone.appName);
  const zoneEnv: Record<string, string> = {
    MORTGAGE_WALLET_ZONE_URL: gatewayOrigin,
    MORTGAGE_VERIFICATIONS_ZONE_URL: gatewayOrigin,
    MORTGAGE_PRIMARY_LENDER_ZONE_URL: gatewayOrigin,
    MORTGAGE_COMPARISON_LENDER_ZONE_URL: gatewayOrigin,
    MORTGAGE_UNDERWRITING_ZONE_URL: gatewayOrigin,
    MORTGAGE_PROPERTY_ZONE_URL: gatewayOrigin,
    MORTGAGE_CLOSING_ZONE_URL: gatewayOrigin,
  };
  const tourPort = await startApp("Tour", "apps/tour", "/api/health", zoneEnv);

  gatewayRef = await startGateway({
    port: gatewayPort,
    tourPort,
    zones,
    log,
    borrowerHeaders: (method, htu) => borrowerIssuer.authHeaders(method, htu),
    persona: { name: "Alex Rivera", webid: borrowerIssuer.webid, podBase },
    reset,
  });

  console.log("");
  console.log("  Solid Mortgage Showcase is running.");
  console.log(`  Overview:     ${gatewayOrigin}/  (guided demo: ${gatewayOrigin}/?guided=1)`);
  console.log(`  All apps:     ${gatewayOrigin}/apps`);
  for (const zone of zones) {
    console.log(
      `  ${`${zone.appName}:`.padEnd(29)} http://${host}:${zone.publicPort}${zone.prefix}`,
    );
  }
  console.log(`  Pod activity: ${gatewayOrigin}/__demo/activity`);
  console.log(`  Borrower pod: ${podBase}`);
  console.log("  Ctrl-C to stop. Everything is in memory and resets on restart.");

  const stop = async () => {
    stopChildren();
    for (const server of gatewayRef?.servers ?? []) server.close();
    recorder.close();
    await pod.closeAsync().catch(() => undefined);
    for (const identity of [borrowerIssuer, ...Object.values(services)]) {
      await identity.stop().catch(() => undefined);
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
}

main().catch((error) => {
  console.error(error);
  stopChildren();
  process.exit(1);
});
