// AUTHORED-BY Claude Fable 5.2
/**
 * Browser stand-in for the two `node:zlib` functions the pinned
 * `@jeswr/solid-vc` build imports for Bitstring Status Lists (`gzipSync`,
 * `gunzipSync`). The platform's CompressionStream is asynchronous and the call
 * sites are synchronous, so this is a small synchronous implementation:
 *
 * - `gunzipSync` is a complete RFC 1951 inflate (stored, fixed and dynamic
 *   blocks) inside an RFC 1952 gzip frame, with the CRC-32 and length trailer
 *   checked and `maxOutputLength` enforced while decoding (zip-bomb bound).
 * - `gzipSync` writes run-length compressed output (one fixed-Huffman block
 *   whose only matches are distance-1 runs). That is valid DEFLATE which any
 *   gzip reader accepts, and it shrinks a status list, which is almost all
 *   zero bytes, about as well as a full compressor would.
 *
 * Alias `node:zlib` to this module in a browser bundle (see the README).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

class ZlibError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ZlibError";
    this.code = code;
  }
}

// --- deflate (write side) ------------------------------------------------------------------

class BitWriter {
  private readonly bytes: number[] = [];
  private current = 0;
  private filled = 0;

  /** Write `count` bits, least significant first (DEFLATE's order for everything but codes). */
  bits(value: number, count: number): void {
    for (let i = 0; i < count; i += 1) {
      this.current |= ((value >>> i) & 1) << this.filled;
      this.filled += 1;
      if (this.filled === 8) {
        this.bytes.push(this.current);
        this.current = 0;
        this.filled = 0;
      }
    }
  }

  /** Write a Huffman code, most significant bit first. */
  code(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i -= 1) this.bits((value >>> i) & 1, 1);
  }

  finish(): number[] {
    if (this.filled > 0) this.bytes.push(this.current);
    return this.bytes;
  }
}

/** A literal/length symbol in the fixed Huffman code (RFC 1951 section 3.2.6). */
function fixedSymbol(writer: BitWriter, symbol: number): void {
  if (symbol < 144) writer.code(0x30 + symbol, 8);
  else if (symbol < 256) writer.code(0x190 + (symbol - 144), 9);
  else if (symbol < 280) writer.code(symbol - 256, 7);
  else writer.code(0xc0 + (symbol - 280), 8);
}

const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131,
  163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
];
const DISTANCE_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049,
  3073, 4097, 6145, 8193, 12289, 16385, 24577,
];
const DISTANCE_EXTRA = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
];

/** Emit a run of `length` (3..258) copies of the previous byte: a match at distance 1. */
function fixedRun(writer: BitWriter, length: number): void {
  let index = LENGTH_BASE.length - 1;
  while ((LENGTH_BASE[index] as number) > length) index -= 1;
  fixedSymbol(writer, 257 + index);
  writer.bits(length - (LENGTH_BASE[index] as number), LENGTH_EXTRA[index] as number);
  writer.code(0, 5); // distance code 0 = distance 1
}

function deflateRunLength(data: Uint8Array): number[] {
  const writer = new BitWriter();
  writer.bits(1, 1); // final block
  writer.bits(1, 2); // fixed Huffman
  let position = 0;
  while (position < data.length) {
    const byte = data[position] as number;
    fixedSymbol(writer, byte);
    position += 1;
    let run = 0;
    while (position + run < data.length && data[position + run] === byte) run += 1;
    while (run >= 3) {
      const length = Math.min(run, 258);
      // Never leave a tail shorter than the minimum match.
      const take = run - length > 0 && run - length < 3 ? length - 3 : length;
      fixedRun(writer, take);
      position += take;
      run -= take;
    }
  }
  fixedSymbol(writer, 256);
  return writer.finish();
}

export function gzipSync(input: Uint8Array): Uint8Array {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  const body = deflateRunLength(data);
  const out = new Uint8Array(10 + body.length + 8);
  // ID1 ID2, CM = deflate, no flags, no mtime, no extra flags, OS = unknown.
  out.set([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 255]);
  out.set(body, 10);
  const view = new DataView(out.buffer);
  view.setUint32(10 + body.length, crc32(data), true);
  view.setUint32(10 + body.length + 4, data.length >>> 0, true);
  return out;
}

// --- inflate (read side) -------------------------------------------------------------------

interface Huffman {
  readonly counts: Uint16Array;
  readonly symbols: Uint16Array;
}

function buildHuffman(lengths: ArrayLike<number>): Huffman {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i += 1) {
    const length = lengths[i] as number;
    counts[length] = (counts[length] as number) + 1;
  }
  counts[0] = 0;
  // Reject over-subscribed code sets (an incomplete set is legal for one-code tables).
  let left = 1;
  for (let length = 1; length < 16; length += 1) {
    left = (left << 1) - (counts[length] as number);
    if (left < 0) throw new ZlibError("Z_DATA_ERROR", "over-subscribed Huffman code");
  }
  const offsets = new Uint16Array(16);
  for (let length = 1; length < 15; length += 1) {
    offsets[length + 1] = (offsets[length] as number) + (counts[length] as number);
  }
  const symbols = new Uint16Array(lengths.length);
  for (let symbol = 0; symbol < lengths.length; symbol += 1) {
    const length = lengths[symbol] as number;
    if (length !== 0) {
      symbols[offsets[length] as number] = symbol;
      offsets[length] = (offsets[length] as number) + 1;
    }
  }
  return { counts, symbols };
}

class BitReader {
  private position: number;
  private buffer = 0;
  private available = 0;

  constructor(
    private readonly data: Uint8Array,
    start: number,
  ) {
    this.position = start;
  }

  bits(count: number): number {
    while (this.available < count) {
      if (this.position >= this.data.length) {
        throw new ZlibError("Z_BUF_ERROR", "unexpected end of file");
      }
      this.buffer |= (this.data[this.position] as number) << this.available;
      this.position += 1;
      this.available += 8;
    }
    const value = this.buffer & ((1 << count) - 1);
    this.buffer >>>= count;
    this.available -= count;
    return value;
  }

  symbol(huffman: Huffman): number {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let length = 1; length < 16; length += 1) {
      code |= this.bits(1);
      const count = huffman.counts[length] as number;
      if (code - count < first) return huffman.symbols[index + (code - first)] as number;
      index += count;
      first = (first + count) << 1;
      code <<= 1;
    }
    throw new ZlibError("Z_DATA_ERROR", "invalid Huffman code");
  }

  /** Drop the rest of the current byte and return the byte offset that follows. */
  alignToByte(): number {
    this.buffer = 0;
    this.available = 0;
    return this.position;
  }

  seek(position: number): void {
    this.position = position;
  }
}

const CODE_LENGTH_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

const FIXED_LITERALS = (() => {
  const lengths = new Uint8Array(288);
  lengths.fill(8, 0, 144);
  lengths.fill(9, 144, 256);
  lengths.fill(7, 256, 280);
  lengths.fill(8, 280, 288);
  return buildHuffman(lengths);
})();
const FIXED_DISTANCES = buildHuffman(new Uint8Array(30).fill(5));

class Output {
  private buffer: Uint8Array;
  length = 0;

  constructor(
    initial: number,
    private readonly limit: number,
  ) {
    this.buffer = new Uint8Array(Math.max(64, Math.min(initial, limit)));
  }

  private reserve(extra: number): void {
    const needed = this.length + extra;
    if (needed > this.limit) {
      throw new ZlibError(
        "ERR_BUFFER_TOO_LARGE",
        `Cannot create a Buffer larger than ${this.limit} bytes`,
      );
    }
    if (needed <= this.buffer.length) return;
    const grown = new Uint8Array(Math.min(this.limit, Math.max(needed, this.buffer.length * 2)));
    grown.set(this.buffer.subarray(0, this.length));
    this.buffer = grown;
  }

  push(byte: number): void {
    this.reserve(1);
    this.buffer[this.length] = byte;
    this.length += 1;
  }

  append(bytes: Uint8Array): void {
    this.reserve(bytes.length);
    this.buffer.set(bytes, this.length);
    this.length += bytes.length;
  }

  copy(distance: number, length: number): void {
    if (distance > this.length) {
      throw new ZlibError("Z_DATA_ERROR", "invalid distance too far back");
    }
    this.reserve(length);
    for (let i = 0; i < length; i += 1) {
      this.buffer[this.length] = this.buffer[this.length - distance] as number;
      this.length += 1;
    }
  }

  bytes(): Uint8Array {
    return this.buffer.slice(0, this.length);
  }
}

function inflateBlock(reader: BitReader, out: Output, literals: Huffman, distances: Huffman): void {
  for (;;) {
    const symbol = reader.symbol(literals);
    if (symbol < 256) {
      out.push(symbol);
    } else if (symbol === 256) {
      return;
    } else {
      const lengthIndex = symbol - 257;
      if (lengthIndex >= LENGTH_BASE.length) {
        throw new ZlibError("Z_DATA_ERROR", "invalid literal/length code");
      }
      const length =
        (LENGTH_BASE[lengthIndex] as number) + reader.bits(LENGTH_EXTRA[lengthIndex] as number);
      const distanceIndex = reader.symbol(distances);
      if (distanceIndex >= DISTANCE_BASE.length) {
        throw new ZlibError("Z_DATA_ERROR", "invalid distance code");
      }
      const distance =
        (DISTANCE_BASE[distanceIndex] as number) +
        reader.bits(DISTANCE_EXTRA[distanceIndex] as number);
      out.copy(distance, length);
    }
  }
}

function readDynamicTables(reader: BitReader): { literals: Huffman; distances: Huffman } {
  const literalCount = reader.bits(5) + 257;
  const distanceCount = reader.bits(5) + 1;
  const codeLengthCount = reader.bits(4) + 4;
  if (literalCount > 286 || distanceCount > 30) {
    throw new ZlibError("Z_DATA_ERROR", "too many length or distance symbols");
  }
  const codeLengths = new Uint8Array(19);
  for (let i = 0; i < codeLengthCount; i += 1) {
    codeLengths[CODE_LENGTH_ORDER[i] as number] = reader.bits(3);
  }
  const codeLengthTable = buildHuffman(codeLengths);
  const lengths = new Uint8Array(literalCount + distanceCount);
  let index = 0;
  while (index < lengths.length) {
    const symbol = reader.symbol(codeLengthTable);
    if (symbol < 16) {
      lengths[index] = symbol;
      index += 1;
      continue;
    }
    let previous = 0;
    let repeat: number;
    if (symbol === 16) {
      if (index === 0) throw new ZlibError("Z_DATA_ERROR", "invalid bit length repeat");
      previous = lengths[index - 1] as number;
      repeat = 3 + reader.bits(2);
    } else if (symbol === 17) {
      repeat = 3 + reader.bits(3);
    } else {
      repeat = 11 + reader.bits(7);
    }
    if (index + repeat > lengths.length) {
      throw new ZlibError("Z_DATA_ERROR", "invalid bit length repeat");
    }
    lengths.fill(previous, index, index + repeat);
    index += repeat;
  }
  if (lengths[256] === 0) {
    throw new ZlibError("Z_DATA_ERROR", "invalid code -- missing end-of-block");
  }
  return {
    distances: buildHuffman(lengths.subarray(literalCount)),
    literals: buildHuffman(lengths.subarray(0, literalCount)),
  };
}

/** Byte offset of the DEFLATE stream inside a gzip member (RFC 1952 header parsing). */
function gzipBodyOffset(data: Uint8Array): number {
  if (data.length < 18 || data[0] !== 0x1f || data[1] !== 0x8b) {
    throw new ZlibError("Z_DATA_ERROR", "incorrect header check");
  }
  if (data[2] !== 8) throw new ZlibError("Z_DATA_ERROR", "unknown compression method");
  const flags = data[3] as number;
  if ((flags & 0xe0) !== 0) throw new ZlibError("Z_DATA_ERROR", "unknown header flags set");
  let offset = 10;
  const need = (count: number): void => {
    if (offset + count > data.length) throw new ZlibError("Z_BUF_ERROR", "unexpected end of file");
  };
  if ((flags & 0x04) !== 0) {
    need(2);
    const extra = (data[offset] as number) | ((data[offset + 1] as number) << 8);
    offset += 2;
    need(extra);
    offset += extra;
  }
  for (const flag of [0x08, 0x10]) {
    if ((flags & flag) !== 0) {
      for (;;) {
        need(1);
        offset += 1;
        if (data[offset - 1] === 0) break;
      }
    }
  }
  if ((flags & 0x02) !== 0) {
    need(2);
    offset += 2;
  }
  return offset;
}

export interface GunzipOptions {
  /** Refuse to produce more than this many bytes (checked while decoding). */
  readonly maxOutputLength?: number;
}

export function gunzipSync(input: Uint8Array, options: GunzipOptions = {}): Uint8Array {
  const data = input instanceof Uint8Array ? input : new Uint8Array(input);
  const limit = options.maxOutputLength ?? 0x7fff_ffff;
  const reader = new BitReader(data, gzipBodyOffset(data));
  const out = new Output(data.length * 4, limit);
  let trailer: number;
  for (;;) {
    const final = reader.bits(1);
    const type = reader.bits(2);
    if (type === 0) {
      const start = reader.alignToByte();
      if (start + 4 > data.length) throw new ZlibError("Z_BUF_ERROR", "unexpected end of file");
      const length = (data[start] as number) | ((data[start + 1] as number) << 8);
      const check = (data[start + 2] as number) | ((data[start + 3] as number) << 8);
      if ((length ^ 0xffff) !== check) {
        throw new ZlibError("Z_DATA_ERROR", "invalid stored block lengths");
      }
      if (start + 4 + length > data.length) {
        throw new ZlibError("Z_BUF_ERROR", "unexpected end of file");
      }
      out.append(data.subarray(start + 4, start + 4 + length));
      reader.seek(start + 4 + length);
    } else if (type === 1) {
      inflateBlock(reader, out, FIXED_LITERALS, FIXED_DISTANCES);
    } else if (type === 2) {
      const tables = readDynamicTables(reader);
      inflateBlock(reader, out, tables.literals, tables.distances);
    } else {
      throw new ZlibError("Z_DATA_ERROR", "invalid block type");
    }
    if (final === 1) {
      trailer = reader.alignToByte();
      break;
    }
  }
  if (trailer + 8 > data.length) throw new ZlibError("Z_BUF_ERROR", "unexpected end of file");
  const result = out.bytes();
  const view = new DataView(data.buffer, data.byteOffset + trailer, 8);
  if (view.getUint32(0, true) !== crc32(result)) {
    throw new ZlibError("Z_DATA_ERROR", "incorrect data check");
  }
  if (view.getUint32(4, true) !== result.length >>> 0) {
    throw new ZlibError("Z_DATA_ERROR", "incorrect length check");
  }
  return result;
}
