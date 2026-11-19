/**
 * Side-effect patch for the browser `Buffer` polyfill: Next's bundled
 * feross/buffer does not implement the `"base64url"` encoding that
 * `@jeswr/solid-vc`'s Bitstring status-list codec uses
 * (`Buffer.from(compressed).toString("base64url")` on encode,
 * `Buffer.from(payload, "base64url")` on decode). Node's real Buffer is
 * untouched (the patch applies only when base64url is missing).
 *
 * Import this ONCE, before any status-list encode/decode runs in a browser
 * context — the pod worker entry and the client credential reader both do.
 */
import { Buffer } from "node:buffer";

function hasNativeBase64Url(): boolean {
  try {
    return (
      Buffer.from("_-A", "base64url").length > 0 &&
      Buffer.from([255]).toString("base64url") === "_w"
    );
  } catch {
    return false;
  }
}

if (!hasNativeBase64Url()) {
  const bufferClass = Buffer as unknown as {
    from: (...args: unknown[]) => Buffer;
    prototype: { toString: (...args: unknown[]) => string };
  };
  const originalToString = bufferClass.prototype.toString;
  bufferClass.prototype.toString = function (this: Buffer, ...args: unknown[]): string {
    if (args[0] === "base64url") {
      return originalToString
        .call(this, "base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
    return originalToString.apply(this, args);
  };
  const originalFrom = bufferClass.from.bind(Buffer);
  bufferClass.from = (...args: unknown[]): Buffer => {
    if (typeof args[0] === "string" && args[1] === "base64url") {
      const base64 = args[0].replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      return originalFrom(padded, "base64");
    }
    return originalFrom(...args);
  };
}
