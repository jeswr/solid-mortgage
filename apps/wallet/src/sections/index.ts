// AUTHORED-BY Claude Opus 5.5
/**
 * Section registry. A demo other than the mortgage adds screens to an existing app only under
 * src/sections/<demo>/ and registers them here (build-plan.md §2).
 */
import type { ComponentType } from "react";
import {
  KybHome,
  KybLedger,
  KybProve,
  KybRequests,
  KybSharing,
} from "./business-kyb/BusinessKyb.tsx";
import {
  MovingAddress,
  MovingHome,
  MovingLedger,
  MovingReaders,
  MovingSharing,
  MovingWho,
} from "./moving-house/MovingHouse.tsx";

export interface AppSection {
  /** The demo that owns this section, e.g. "moving-house". */
  demo: string;
  /** Path inside the app, without the app's base, e.g. "moving/notify". */
  path: string;
  title: string;
  Component: ComponentType;
}

export const sections: readonly AppSection[] = [
  { Component: MovingHome, demo: "moving-house", path: "moving", title: "Your address" },
  {
    Component: MovingAddress,
    demo: "moving-house",
    path: "moving/address",
    title: "Change address",
  },
  { Component: MovingWho, demo: "moving-house", path: "moving/who", title: "Who should know" },
  {
    Component: MovingReaders,
    demo: "moving-house",
    path: "moving/readers",
    title: "Who has read it",
  },
  {
    Component: MovingSharing,
    demo: "moving-house",
    path: "moving/sharing",
    title: "Standing grants",
  },
  { Component: MovingLedger, demo: "moving-house", path: "moving/ledger", title: "Journey ledger" },
  { Component: KybHome, demo: "business-kyb", path: "kyb", title: "Northwind" },
  { Component: KybRequests, demo: "business-kyb", path: "kyb/requests", title: "Requests" },
  { Component: KybProve, demo: "business-kyb", path: "prove/kyb", title: "Prove ownership" },
  { Component: KybSharing, demo: "business-kyb", path: "kyb/sharing", title: "Grants" },
  { Component: KybLedger, demo: "business-kyb", path: "kyb/ledger", title: "Journey ledger" },
];
