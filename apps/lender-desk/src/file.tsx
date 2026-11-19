// AUTHORED-BY Claude Opus 5.5
/**
 * The loan file as the desk reads it from pods: Juniper's own `loans/JHL-1001/` plus what its
 * partners shared with it. Reloads when the pods change (a write, grant or revoke from any
 * tab or agent), never on reads, so a screen's own reads cannot loop.
 */
import {
  ClosingRecord,
  CredentialPointer,
  CreditReport,
  DeliveredDocument,
  LoanApplication,
  RecordedInstrument,
  SCHEMA,
  ServiceOrder,
  UnderwritingDecision,
} from "@mortgage/data-model";
import { onEvent, podUrl } from "@mortgage/pod-runtime";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { isOk, type Loaded, list, load } from "./pod.ts";
import { EMPTY_FILE, type FileState, LOAN_NUMBER } from "./view.ts";

export const loanUrl = (path = "") => podUrl("lender", `loans/${LOAN_NUMBER}/${path}`);

export const SHARED = {
  /** The tri-merge report Quillon released to Juniper (in Quillon's pod). */
  creditReport: () => podUrl("bureau", `orders/${LOAN_NUMBER}/report`),
  /** Castellan's findings (in Castellan's pod). */
  findings: () => podUrl("aus", `casefiles/${LOAN_NUMBER}/findings`),
  /** Castellan's purchase confirmation. */
  purchase: () => podUrl("aus", `deliveries/${LOAN_NUMBER}`),
  /** The county's public record of the mortgage. */
  mortgageRecord: () => podUrl("county", "records/2026-0048114"),
  deedRecord: () => podUrl("county", "records/2026-0048113"),
};

export interface LoanFile {
  state: FileState;
  application?: Loaded<LoanApplication>;
  orders: Record<"credit-report" | "appraisal" | "title", Loaded<ServiceOrder> | undefined>;
  pointers: Loaded<CredentialPointer>[];
  pointerList?: Loaded<string[]>;
  decision?: Loaded<UnderwritingDecision>;
  closingRecord?: Loaded<ClosingRecord>;
  creditReport?: Loaded<CreditReport>;
  findings?: Loaded<DeliveredDocument>;
  purchase?: Loaded<DeliveredDocument>;
  mortgageRecord?: Loaded<RecordedInstrument>;
  loading: boolean;
  /** Bumped whenever the pods change, so tabs can reload their own reads. */
  version: number;
  reload(): void;
}

const EMPTY: LoanFile = {
  loading: true,
  orders: { appraisal: undefined, "credit-report": undefined, title: undefined },
  pointers: [],
  reload: () => undefined,
  state: EMPTY_FILE,
  version: 0,
};

const FileContext = createContext<LoanFile>(EMPTY);

const orderState = (order: Loaded<ServiceOrder>): FileState["creditOrder"] =>
  isOk(order)
    ? order.value.orderStatus === SCHEMA.OrderDelivered
      ? "delivered"
      : "processing"
    : "none";

async function readFile(): Promise<Omit<LoanFile, "loading" | "version" | "reload">> {
  const [application, credit, appraisal, title, decision, closingRecord, pointerList] =
    await Promise.all([
      load(loanUrl("application"), LoanApplication),
      load(loanUrl("orders/credit-report"), ServiceOrder),
      load(loanUrl("orders/appraisal"), ServiceOrder),
      load(loanUrl("orders/title"), ServiceOrder),
      load(loanUrl("decision"), UnderwritingDecision),
      load(loanUrl("closing-record"), ClosingRecord),
      list(loanUrl("pointers/")),
    ]);
  const pointers = isOk(pointerList)
    ? await Promise.all(pointerList.value.map((url) => load(url, CredentialPointer)))
    : [];
  const delivered = orderState(credit) === "delivered";
  const [creditReport, findings] = delivered
    ? await Promise.all([
        load(SHARED.creditReport(), CreditReport),
        load(SHARED.findings(), DeliveredDocument),
      ])
    : [undefined, undefined];
  // The public register is read only once the loan is cleared to close (nothing to find earlier).
  const mortgageRecord = isOk(decision)
    ? await load(SHARED.mortgageRecord(), RecordedInstrument)
    : undefined;
  const purchase = isOk(closingRecord)
    ? await load(SHARED.purchase(), DeliveredDocument)
    : undefined;
  return {
    application,
    closingRecord,
    creditReport,
    decision,
    findings,
    mortgageRecord,
    orders: { appraisal, "credit-report": credit, title },
    pointerList,
    pointers,
    purchase,
    state: {
      application: application.state,
      appraisalOrder: orderState(appraisal),
      closingRecord: closingRecord.state,
      creditOrder: orderState(credit),
      decision: decision.state,
      findings: findings?.state ?? "missing",
      mortgageRecorded: mortgageRecord?.state ?? "missing",
      titleOrder: orderState(title),
    },
  };
}

/** Kinds of pod event that change what a screen would read. */
const CHANGES = new Set(["write", "delete", "grant", "revoke"]);

/** Bumps a counter whenever the pods change (debounced), from any tab or agent. */
export function usePodVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onEvent((entry) => {
      if (entry.source !== "pod" || !CHANGES.has(entry.kind)) return;
      clearTimeout(timer);
      timer = setTimeout(() => setVersion((value) => value + 1), 250);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, []);
  return version;
}

export function LoanFileProvider({ children }: { children: ReactNode }) {
  const podVersion = usePodVersion();
  const [manual, setManual] = useState(0);
  const [file, setFile] = useState<LoanFile>(EMPTY);
  const reload = useCallback(() => setManual((value) => value + 1), []);
  const version = podVersion + manual;
  useEffect(() => {
    let live = true;
    setFile((current) => ({ ...current, loading: true }));
    readFile()
      .then((read) => {
        if (live) setFile({ ...read, loading: false, reload, version });
      })
      .catch((error: unknown) => {
        console.error("lender-desk: could not read the loan file", error);
        if (live) setFile((current) => ({ ...current, loading: false, reload, version }));
      });
    return () => {
      live = false;
    };
  }, [version, reload]);
  return <FileContext.Provider value={file}>{children}</FileContext.Provider>;
}

export const useLoanFile = (): LoanFile => useContext(FileContext);

/** Load something on mount and again whenever the loan file's version changes. */
export function useRead<T>(read: () => Promise<T>, deps: readonly unknown[] = []): T | undefined {
  const { version } = useLoanFile();
  const [value, setValue] = useState<T>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload on version and caller deps
  useEffect(() => {
    let live = true;
    read()
      .then((result) => {
        if (live) setValue(result);
      })
      .catch((error: unknown) => console.error("lender-desk: read failed", error));
    return () => {
      live = false;
    };
  }, [version, ...deps]);
  return value;
}
