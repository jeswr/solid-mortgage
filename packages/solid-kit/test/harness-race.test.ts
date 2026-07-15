/**
 * Deterministic stop()-vs-provisionAccount() race (sm-4, roborev finding on f8149bf):
 * gate the harness's port probe behind a mock so stop() provably lands while an account is
 * mid-boot, then assert the late pod was actually shut down — observable from outside via
 * the recorded port, no internal seams.
 */
import { expect, test, vi } from "vitest";

const gate: { intercept: boolean; ports: number[]; waiters: Array<() => void> } = {
  intercept: false,
  ports: [],
  waiters: [],
};

vi.mock("get-port", async (importOriginal) => {
  const actual = await importOriginal<typeof import("get-port")>();
  return {
    default: async (): Promise<number> => {
      const port = await actual.default();
      if (gate.intercept) {
        gate.ports.push(port);
        // Hold the provision here until the test has called stop().
        await new Promise<void>((resolve) => gate.waiters.push(resolve));
      }
      return port;
    },
  };
});

const { startSolidServer } = await import("../src/testing.js");

test("stop() landing mid-provision stops the late pod (deterministic)", {
  timeout: 30_000,
}, async () => {
  const scoped = await startSolidServer(); // primary boots normally (intercept off)
  gate.intercept = true;
  try {
    const pending = scoped.provisionAccount();
    // Wait until the provision is parked inside the port probe…
    await vi.waitFor(() => {
      expect(gate.waiters).toHaveLength(1);
    });
    // …so this stop() is GUARANTEED to precede the account's boot completing.
    const stopping = scoped.stop();
    gate.waiters.shift()?.();

    await expect(pending).rejects.toThrow(/stopped while provisioning/);
    await stopping; // resolves only if late-account cleanup succeeded

    // The port the late pod booted on must refuse connections afterwards.
    const [latePort] = gate.ports;
    expect(latePort).toBeGreaterThan(0);
    await expect(fetch(`http://127.0.0.1:${latePort}/`)).rejects.toThrow();
    await expect(fetch(`${scoped.baseUrl}/`)).rejects.toThrow();
  } finally {
    gate.intercept = false;
    for (const release of gate.waiters.splice(0)) release();
  }
});
