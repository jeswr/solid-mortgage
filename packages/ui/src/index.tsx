export const uiPackage = "@mortgage/ui";

export {
  AgentConversation,
  type AgentConversationProps,
  type AgentMessage,
  type AgentReply,
  type AgentSpeaker,
  type AgentStep,
  type AgentStepState,
  AgentSteps,
  ConsentRequest,
  type ConsentRequestProps,
  type ConsentSource,
} from "./agent-chat";
export {
  AppShell,
  type AppShellProps,
  BrandHeader,
  type BrandHeaderProps,
  BrandMark,
  DEMO_BORROWER_ACCOUNT,
  framingLine,
  headerNavLinkClass,
  type ShellAccount,
} from "./app-shell";
export {
  type AssistantAction,
  type AssistantAsk,
  type AssistantDecision,
  type AssistantTurn,
  askAssistant,
  useAssistantEngine,
} from "./assistant-brain";
export { ConceptDemoBanner, type ConceptDemoBannerProps } from "./concept-demo-banner";
export { ConsentInterstitial, type ConsentInterstitialProps } from "./consent-interstitial";
export {
  CredentialCard,
  type CredentialCardProps,
  type CredentialKind,
  type CredentialStatus,
} from "./credential-card";
export { DemoLockedField, type DemoLockedFieldProps } from "./demo-locked-field";
export * from "./disclaimers";
export { HonestyPanel, type HonestyPanelProps } from "./honesty-panel";
export { IllustrativeFigure, type IllustrativeFigureProps } from "./illustrative-figure";
export {
  type ReceiptAction,
  ReceiptCard,
  type ReceiptCardProps,
  receiptDataLabel,
} from "./receipt-card";
export { StatCard, type StatCardProps } from "./stat-card";
export * from "./themes";
