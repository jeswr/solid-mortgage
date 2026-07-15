import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { connect, createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const zones = [
  ["@mortgage/app-wallet", "apps/wallet", "/wallet", "MORTGAGE_WALLET_ZONE_URL"],
  [
    "@mortgage/app-verifications",
    "apps/verifications",
    "/verifications",
    "MORTGAGE_VERIFICATIONS_ZONE_URL",
  ],
  [
    "@mortgage/app-lender-boa",
    "apps/lender-boa",
    "/lender-boa",
    "MORTGAGE_PRIMARY_LENDER_ZONE_URL",
  ],
  [
    "@mortgage/app-lender-53",
    "apps/lender-53",
    "/lender-53",
    "MORTGAGE_COMPARISON_LENDER_ZONE_URL",
  ],
  ["@mortgage/app-gse", "apps/gse", "/gse", "MORTGAGE_UNDERWRITING_ZONE_URL"],
  ["@mortgage/app-property", "apps/property", "/property", "MORTGAGE_PROPERTY_ZONE_URL"],
  ["@mortgage/app-closing", "apps/closing", "/closing", "MORTGAGE_CLOSING_ZONE_URL"],
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

function signalProcessGroup(child, signal) {
  if (child.pid === undefined) return;
  try {
    process.kill(process.platform === "win32" ? child.pid : -child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") console.error(`Could not send ${signal} to ${child.pid}:`, error);
  }
}

function stopChildren() {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    signalProcessGroup(child, "SIGTERM");
  }
  setTimeout(() => {
    for (const child of children) signalProcessGroup(child, "SIGKILL");
  }, 3_000);
}

function waitForPort(packageName, port, child) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 60_000;
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      child.off("error", onError);
      child.off("exit", onExit);
      if (error === undefined) resolve();
      else reject(error);
    };
    const onError = (error) => finish(error);
    const onExit = (code, signal) => {
      finish(new Error(`${packageName} stopped during startup (${signal ?? code ?? "unknown"})`));
    };
    const check = () => {
      if (settled) return;
      const socket = connect({ host, port });
      socket.once("connect", () => {
        socket.destroy();
        finish();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          finish(new Error(`${packageName} did not bind its port within 60 seconds`));
        } else {
          setTimeout(check, 100);
        }
      });
    };

    child.once("error", onError);
    child.once("exit", onExit);
    check();
  });
}

async function startApp(packageName, directory, port, env = process.env) {
  if (stopping) throw new Error(`Cannot start ${packageName} during shutdown`);
  const appDirectory = resolve(workspaceRoot, directory);
  const require = createRequire(resolve(appDirectory, "package.json"));
  const next = require.resolve("next/dist/bin/next");
  const child = spawn(process.execPath, [next, "dev", "--hostname", host, "--port", String(port)], {
    cwd: appDirectory,
    detached: process.platform !== "win32",
    env,
    stdio: "inherit",
  });
  children.push(child);
  await waitForPort(packageName, port, child);
  child.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(`${packageName} stopped unexpectedly (${signal ?? code ?? "unknown"})`);
    stopChildren();
    process.exitCode = code === null || code === 0 ? 1 : code;
  });
}

async function main() {
  const shellEnv = { ...process.env };
  for (const [packageName, directory, path, envName] of zones) {
    const port = await reservePort();
    const origin = `http://${host}:${port}`;
    shellEnv[envName] = origin;
    await startApp(packageName, directory, port);
    console.log(`${packageName}: ${origin}${path}`);
  }

  const tourPort = await reservePort();
  await startApp("@mortgage/app-tour", "apps/tour", tourPort, shellEnv);
  console.log(`@mortgage/app-tour: http://${host}:${tourPort}`);
}

process.once("SIGINT", stopChildren);
process.once("SIGTERM", stopChildren);
process.once("exit", () => stopChildren());

main().catch((error) => {
  console.error(error);
  stopChildren();
  process.exitCode = 1;
});
