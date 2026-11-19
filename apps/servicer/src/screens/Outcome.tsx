// AUTHORED-BY Claude Opus 5.5
import type { ReactNode } from "react";
import type { Read } from "../read.ts";
import { Refusal } from "./Shell.tsx";

/** What a pod read came back with: the value, a refusal, nothing yet, or an error. */
export function Outcome<T>({
  read,
  what,
  children,
}: {
  read: Read<T>;
  /** Plain words for the resource, e.g. "your escrow statement". */
  what: string;
  children: (value: T) => ReactNode;
}) {
  switch (read.phase) {
    case "idle":
    case "loading":
      return <p className="muted">Reading {what} from your pod…</p>;
    case "ok":
      return <>{children(read.value)}</>;
    case "refused":
      return (
        <Refusal status={read.status}>
          Marigold is not allowed to read {what}. The grant does not cover it or has ended.
        </Refusal>
      );
    case "missing":
      return <p className="muted">There is no {what} in your pod yet.</p>;
    case "failed":
      return <p className="error">{read.message}</p>;
  }
}
