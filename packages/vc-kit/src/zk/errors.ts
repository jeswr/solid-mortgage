// AUTHORED-BY Claude Opus 5.5
/** Thrown for every Tier A/B configuration or verification-input failure, and by the CRS loader. */
export class ZkError extends Error {
  override readonly name: string = "ZkError";
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
