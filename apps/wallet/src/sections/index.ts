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
  MedHealth,
  MedLedger,
  MedRequests,
  MedSharedWithMe,
  MedSharing,
} from "./medication-handover/Medication.tsx";
import {
  MotorClaimFile,
  MotorClaimRequests,
  MotorClaimSeen,
  MotorClaimSharing,
} from "./motor-claim/MotorClaim.tsx";
import {
  MovingAddress,
  MovingHome,
  MovingLedger,
  MovingReaders,
  MovingSharing,
  MovingWho,
} from "./moving-house/MovingHouse.tsx";
import { KycConsent, KycHome, KycLedger } from "./reusable-kyc/ReusableKyc.tsx";
import {
  LendingHome,
  LendingLedger,
  LendingProve,
  LendingSharing,
} from "./small-dollar-lending/Lending.tsx";

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
  { Component: LendingHome, demo: "small-dollar-lending", path: "lending", title: "Your pod" },
  {
    Component: LendingProve,
    demo: "small-dollar-lending",
    path: "lending/prove",
    title: "Prove to two lenders",
  },
  {
    Component: LendingSharing,
    demo: "small-dollar-lending",
    path: "lending/sharing",
    title: "Grants",
  },
  {
    Component: LendingLedger,
    demo: "small-dollar-lending",
    path: "lending/ledger",
    title: "Journey ledger",
  },
  { Component: KybHome, demo: "business-kyb", path: "kyb", title: "Northwind" },
  { Component: KybRequests, demo: "business-kyb", path: "kyb/requests", title: "Requests" },
  { Component: KybProve, demo: "business-kyb", path: "prove/kyb", title: "Prove ownership" },
  { Component: KybSharing, demo: "business-kyb", path: "kyb/sharing", title: "Grants" },
  { Component: KybLedger, demo: "business-kyb", path: "kyb/ledger", title: "Journey ledger" },
  { Component: MedHealth, demo: "medication-handover", path: "health", title: "Health" },
  {
    Component: MedRequests,
    demo: "medication-handover",
    path: "health/requests",
    title: "Health requests",
  },
  {
    Component: MedSharing,
    demo: "medication-handover",
    path: "health/sharing",
    title: "Who can see it",
  },
  {
    Component: MedSharedWithMe,
    demo: "medication-handover",
    path: "health/shared",
    title: "Shared with me",
  },
  {
    Component: MedLedger,
    demo: "medication-handover",
    path: "health/ledger",
    title: "Journey ledger",
  },
  { Component: MotorClaimFile, demo: "motor-claim", path: "claim", title: "Claim CLM-1" },
  { Component: MotorClaimRequests, demo: "motor-claim", path: "claim/requests", title: "Requests" },
  { Component: MotorClaimSeen, demo: "motor-claim", path: "claim/seen", title: "Who saw what" },
  {
    Component: MotorClaimSharing,
    demo: "motor-claim",
    path: "claim/sharing",
    title: "Grants and ledger",
  },
  { Component: KycHome, demo: "reusable-kyc", path: "kyc", title: "Verified identity" },
  { Component: KycConsent, demo: "reusable-kyc", path: "kyc/consent", title: "One-time request" },
  { Component: KycLedger, demo: "reusable-kyc", path: "kyc/ledger", title: "Journey ledger" },
];
