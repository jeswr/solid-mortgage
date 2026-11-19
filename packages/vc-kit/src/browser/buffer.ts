// AUTHORED-BY Claude Fable 5.2
/**
 * The four `Buffer` operations the pinned `@jeswr/solid-vc` build performs,
 * for runtimes that have no `Buffer` global (a browser page or worker):
 * `Buffer.from(bytes)`, `Buffer.from(text, "base64url")`,
 * `buffer.toString("base64url" | "utf8")`, `Buffer.byteLength(text, "utf8")`
 * and `Buffer.concat(chunks)`; plus `alloc`/`allocUnsafe`/`allocUnsafeSlow`, `isBuffer`,
 * `from(arrayBuffer)`, `from(text, "hex" | "base64")` and `toString("hex" | "base64")` for other libraries that detect the global.
 *
 * Importing this module for its side effect installs the stand-in only when
 * `globalThis.Buffer` is missing, so Node keeps its own. Import it before
 * anything that issues or verifies a credential (see the README).
 */

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASE64URL_VALUES = (() => {
  const values = new Int16Array(128).fill(-1);
  for (let i = 0; i < BASE64URL.length; i += 1) values[BASE64URL.charCodeAt(i)] = i;
  // Node's base64url decoder also accepts the standard alphabet.
  values["+".charCodeAt(0)] = 62;
  values["/".charCodeAt(0)] = 63;
  return values;
})();

function decodeBase64Url(text: string): Uint8Array {
  const out = new Uint8Array(Math.floor((text.length * 3) / 4));
  let bits = 0;
  let available = 0;
  let length = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const value = code < 128 ? (BASE64URL_VALUES[code] as number) : -1;
    if (value < 0) break; // Node stops at the first character outside the alphabet.
    bits = (bits << 6) | value;
    available += 6;
    if (available >= 8) {
      available -= 8;
      out[length] = (bits >>> available) & 0xff;
      length += 1;
    }
  }
  return out.subarray(0, length);
}

function encodeBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] as number;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += BASE64URL[a >> 2];
    out += BASE64URL[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += BASE64URL[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += BASE64URL[c & 63];
  }
  return out;
}

function decodeHex(text: string): Uint8Array {
  const out = new Uint8Array(text.length >> 1);
  let length = 0;
  for (; length < out.length; length += 1) {
    const byte = Number.parseInt(text.slice(length * 2, length * 2 + 2), 16);
    if (Number.isNaN(byte)) break; // Node stops at the first pair that is not hex.
    out[length] = byte;
  }
  return out.subarray(0, length);
}

/** A `Uint8Array` with Node's `toString(encoding)` for the two encodings solid-vc uses. */
export class BufferShim extends Uint8Array {
  static override from(source: ArrayLike<number> | Iterable<number> | string, encoding?: unknown) {
    if (typeof source === "string") {
      if (encoding === "base64url") return BufferShim.wrap(decodeBase64Url(source));
      if (encoding === undefined || encoding === "utf8" || encoding === "utf-8") {
        return BufferShim.wrap(new TextEncoder().encode(source));
      }
      if (encoding === "hex") return BufferShim.wrap(decodeHex(source));
      // Node's base64 decoder accepts both alphabets and ignores padding, as decodeBase64Url does.
      if (encoding === "base64") return BufferShim.wrap(decodeBase64Url(source.replace(/=+$/, "")));
      throw new Error(`BufferShim.from does not support the ${String(encoding)} encoding`);
    }
    // Node's Buffer.from(arrayBuffer) views the bytes; a copy is equivalent for every caller here.
    if (source instanceof ArrayBuffer) return BufferShim.wrap(new Uint8Array(source));
    return BufferShim.wrap(Uint8Array.from(source as ArrayLike<number>));
  }

  /**
   * Zero-filled allocation. Other libraries in the same bundle (msgpackr, which the proof
   * toolchain uses) see a `Buffer` global and call these; Node's unsafe variants may return
   * uninitialised memory, so zero-filled is a strictly safer substitute.
   */
  static alloc(size: number, fill = 0): BufferShim {
    const buffer = new BufferShim(size);
    if (fill !== 0) buffer.fill(fill);
    return buffer;
  }

  static allocUnsafe(size: number): BufferShim {
    return new BufferShim(size);
  }

  static allocUnsafeSlow(size: number): BufferShim {
    return new BufferShim(size);
  }

  static isBuffer(value: unknown): value is BufferShim {
    return value instanceof BufferShim;
  }

  private static wrap(bytes: Uint8Array): BufferShim {
    const buffer = new BufferShim(bytes.length);
    buffer.set(bytes);
    return buffer;
  }

  static byteLength(text: string, encoding: string = "utf8"): number {
    if (encoding !== "utf8" && encoding !== "utf-8") {
      throw new Error(`BufferShim.byteLength does not support the ${encoding} encoding`);
    }
    return new TextEncoder().encode(text).length;
  }

  static concat(chunks: readonly Uint8Array[]): BufferShim {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const out = new BufferShim(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  override toString(encoding: string = "utf8"): string {
    if (encoding === "base64url") return encodeBase64Url(this);
    if (encoding === "base64") {
      const url = encodeBase64Url(this).replaceAll("-", "+").replaceAll("_", "/");
      return url.padEnd(Math.ceil(url.length / 4) * 4, "=");
    }
    if (encoding === "hex") {
      let out = "";
      for (const byte of this) out += byte.toString(16).padStart(2, "0");
      return out;
    }
    if (encoding === "utf8" || encoding === "utf-8") return new TextDecoder().decode(this);
    throw new Error(`BufferShim.toString does not support the ${encoding} encoding`);
  }
}

/** Install {@link BufferShim} as `globalThis.Buffer` when the runtime has none. */
export function installBufferShim(): boolean {
  const scope = globalThis as { Buffer?: unknown };
  if (scope.Buffer !== undefined) return false;
  scope.Buffer = BufferShim;
  return true;
}

installBufferShim();
