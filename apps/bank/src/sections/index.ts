// AUTHORED-BY Claude Opus 5.5
/**
 * Section registry. A demo other than the mortgage adds screens to an existing app only under
 * src/sections/<demo>/ and registers them here (build-plan.md §2).
 */
import type { ComponentType } from "react";
import { MovingAddressOnFile } from "./moving-house/MovingHouse.tsx";
import { YourIdentity } from "./reusable-kyc/YourIdentity.tsx";

export interface AppSection {
  /** The demo that owns this section, e.g. "moving-house". */
  demo: string;
  /** Path inside the app, without the app's base, e.g. "moving/notify". */
  path: string;
  title: string;
  Component: ComponentType;
}

export const sections: readonly AppSection[] = [
  {
    Component: MovingAddressOnFile,
    demo: "moving-house",
    path: "moving/address",
    title: "Address on file",
  },
  { Component: YourIdentity, demo: "reusable-kyc", path: "kyc", title: "Your identity" },
];
