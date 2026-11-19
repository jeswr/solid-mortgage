import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { expect } from "@playwright/test";

/** Reserve a free localhost port by binding and releasing it. */
export async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a dynamic app port");
  }
  const { port } = address;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitUntilReady(url: string, child: ChildProcess, logs: string[]) {
  await expect
    .poll(
      async () => {
        if (child.exitCode !== null) {
          throw new Error(`App server exited early (${child.exitCode})\n${logs.join("")}`);
        }
        try {
          const response = await fetch(url, { redirect: "manual" });
          return response.status;
        } catch {
          return 0;
        }
      },
      { message: `Wait for ${url}`, timeout: 60_000 },
    )
    .toBe(200);
}

export interface StartAppOptions {
  packageName: string;
  /** Path polled for readiness (usually the app's landing route). */
  readyPath: string;
  /** `dev` evaluates next.config env at start time (the shell); `start` serves the build. */
  command: "dev" | "start";
  env?: NodeJS.ProcessEnv;
}

/**
 * Owns the child processes of the Next.js apps a spec boots on random free ports
 * (showcase-patterns §4: no `webServer` block — env depends on ports known only here).
 */
export class AppRunner {
  private readonly children: ChildProcess[] = [];
  readonly logsByPackage = new Map<string, string[]>();

  async start({ packageName, readyPath, command, env = {} }: StartAppOptions): Promise<string> {
    const port = await reservePort();
    const origin = `http://127.0.0.1:${port}`;
    const logs: string[] = [];
    this.logsByPackage.set(packageName, logs);
    const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const child = spawn(
      pnpm,
      ["--filter", packageName, command, "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: process.cwd(),
        detached: process.platform !== "win32",
        env: { ...process.env, ...env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    child.stdout?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => logs.push(chunk.toString()));
    this.children.push(child);
    await waitUntilReady(`${origin}${readyPath}`, child, logs);
    return origin;
  }

  stopAll(): void {
    for (const child of this.children.reverse()) {
      if (child.exitCode !== null || child.pid === undefined) continue;
      try {
        process.kill(process.platform === "win32" ? child.pid : -child.pid, "SIGTERM");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    }
  }
}
