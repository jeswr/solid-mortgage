import { spawn } from "node:child_process";
import { createServer } from "node:net";

const host = "127.0.0.1";
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const zones = [
  ["@mortgage/app-wallet", "/wallet", "MORTGAGE_WALLET_ZONE_URL"],
  ["@mortgage/app-verifications", "/verifications", "MORTGAGE_VERIFICATIONS_ZONE_URL"],
  ["@mortgage/app-lender-boa", "/lender-boa", "MORTGAGE_PRIMARY_LENDER_ZONE_URL"],
  ["@mortgage/app-lender-53", "/lender-53", "MORTGAGE_COMPARISON_LENDER_ZONE_URL"],
  ["@mortgage/app-gse", "/gse", "MORTGAGE_UNDERWRITING_ZONE_URL"],
  ["@mortgage/app-property", "/property", "MORTGAGE_PROPERTY_ZONE_URL"],
  ["@mortgage/app-closing", "/closing", "MORTGAGE_CLOSING_ZONE_URL"],
];

const children = [];
let stopping = false;

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a dynamic app port");
  }
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

function stopChildren(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    try {
      process.kill(process.platform === "win32" ? child.pid : -child.pid, signal);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
}

function startApp(packageName, port, env = process.env) {
  const child = spawn(
    pnpm,
    ["--filter", packageName, "dev", "--hostname", host, "--port", String(port)],
    {
      cwd: process.cwd(),
      detached: process.platform !== "win32",
      env,
      stdio: "inherit",
    },
  );
  children.push(child);
  child.once("error", (error) => {
    console.error(`Could not start ${packageName}:`, error);
    stopChildren();
    process.exitCode = 1;
  });
  child.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(`${packageName} stopped unexpectedly (${signal ?? code ?? "unknown"})`);
    stopChildren();
    process.exitCode = code ?? 1;
  });
}

async function main() {
  const shellEnv = { ...process.env };
  for (const [packageName, path, envName] of zones) {
    const port = await reservePort();
    const origin = `http://${host}:${port}`;
    shellEnv[envName] = origin;
    startApp(packageName, port);
    console.log(`${packageName}: ${origin}${path}`);
  }

  const tourPort = await reservePort();
  startApp("@mortgage/app-tour", tourPort, shellEnv);
  console.log(`@mortgage/app-tour: http://${host}:${tourPort}`);
}

process.once("SIGINT", () => stopChildren("SIGINT"));
process.once("SIGTERM", () => stopChildren("SIGTERM"));
process.once("exit", () => stopChildren());

main().catch((error) => {
  console.error(error);
  stopChildren();
  process.exitCode = 1;
});
