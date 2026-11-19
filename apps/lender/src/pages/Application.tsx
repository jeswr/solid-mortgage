// AUTHORED-BY Claude Opus 5.5
/**
 * Application review (tour step 8): the 1003 sections filled from Alex's pod, each field with
 * where it came from, the six-item checklist, and Submit. The Social Security number is typed
 * here and never stored; Juniper compares its last four digits with the identity credential.
 */
import { DAY } from "@mortgage/content/mortgage/facts";
import {
  completeApplicationAccess,
  SIX_ITEMS,
  submitApplication,
} from "@mortgage/content/mortgage/journey";
import { loanEstimateDeadline } from "@mortgage/demo-kit/calendar";
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Link } from "wouter";
import {
  Failure,
  Loading,
  MissingList,
  Refusal,
  type Source,
  SourceBadge,
} from "../components.tsx";
import { org } from "../org.ts";
import { type ApplicationData, loadApplication, refusalOf } from "../pod.ts";
import { act, calendar, worldOn } from "../runtime.ts";
import { usePod } from "../usePod.ts";
import {
  checkSsn,
  demoDate,
  demoSsn,
  issuerName,
  longDate,
  sixItemChecklist,
  usd,
} from "../view.ts";

function Field({ label, value, source }: { label: string; value: ReactNode; source: Source }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>
        <span className="field-value">{value}</span>
        <SourceBadge source={source} />
      </dd>
    </div>
  );
}

function credentialSource(
  data: ApplicationData,
  name: keyof ApplicationData["checks"],
  from: string,
): Source {
  const check = data.checks[name];
  return { from, issuer: issuerName(check.issuer), kind: "pod", verified: check.verified };
}

type Submitting = { kind: "idle" } | { kind: "busy" } | { kind: "failed"; error: unknown };

function ApplicationForm({ data, reload }: { data: ApplicationData; reload: () => Promise<void> }) {
  const ssnId = useId();
  const ssnHelp = useId();
  const [ssn, setSsn] = useState(() => demoSsn(data.taxIdLast4));
  const [submitting, setSubmitting] = useState<Submitting>({ kind: "idle" });
  const [authorisation, setAuthorisation] = useState<"pending" | "done" | "failed">("pending");
  const asked = useRef(false);

  // Back from the wallet with G4 in force: record Alex's credit-report authorisation once.
  useEffect(() => {
    if (data.submitted || asked.current) return;
    asked.current = true;
    act(DAY.application, completeApplicationAccess).then(
      () => setAuthorisation("done"),
      () => setAuthorisation("failed"),
    );
  }, [data.submitted]);

  const ssnCheck = checkSsn(ssn, data.taxIdLast4);
  const checklist = sixItemChecklist(SIX_ITEMS, {
    estimatedValueUsd: data.purchasePriceUsd,
    loanAmountUsd: data.loanAmountUsd,
    monthlyIncomeUsd: data.monthlyIncomeUsd,
    name: data.name,
    propertyAddress: data.propertyAddress,
    ssnOk: ssnCheck.ok,
  });
  const allSix = checklist.every((item) => item.done);
  const allVerified = Object.values(data.checks).every((check) => check.verified);

  async function submit() {
    setSubmitting({ kind: "busy" });
    try {
      await act(DAY.application, submitApplication);
      setSubmitting({ kind: "idle" });
      await reload();
    } catch (error) {
      setSubmitting({ error, kind: "failed" });
    }
  }

  const applied = calendar().date(DAY.application);
  const refused = submitting.kind === "failed" ? refusalOf(submitting.error) : undefined;

  return (
    <div className="application">
      <div className="application-main">
        <section className="panel" aria-labelledby="borrower-heading">
          <h2 id="borrower-heading">
            <span className="section-no">1</span> Borrower information
          </h2>
          <dl className="fields">
            <Field label="Name" value={data.name} source={{ from: "profile", kind: "pod" }} />
            <Field
              label="Date of birth"
              value={longDate(data.birthDate)}
              source={credentialSource(data, "identity", "identity")}
            />
            <div className="field">
              <dt>
                <label htmlFor={ssnId}>Social Security number</label>
              </dt>
              <dd>
                <input
                  id={ssnId}
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  value={ssn}
                  onChange={(event) => setSsn(event.target.value)}
                  aria-describedby={ssnHelp}
                  aria-invalid={!ssnCheck.ok}
                  disabled={data.submitted}
                />
                <SourceBadge source={{ kind: "typed" }} />
                <p id={ssnHelp} className={ssnCheck.ok ? "hint hint-ok" : "hint hint-bad"}>
                  {ssnCheck.message} The demo fills in a fictional number from the 900 range, which
                  is never issued.
                </p>
              </dd>
            </div>
            <Field
              label="Email"
              value={data.emails.join(", ")}
              source={{ from: "contact details", kind: "pod" }}
            />
            {data.telephone === undefined ? null : (
              <Field
                label="Phone"
                value={data.telephone}
                source={{ from: "contact details", kind: "pod" }}
              />
            )}
            <Field
              label="Current address"
              value={data.currentAddress}
              source={{ from: "contact details", kind: "pod" }}
            />
          </dl>
        </section>

        <section className="panel" aria-labelledby="income-heading">
          <h2 id="income-heading">
            <span className="section-no">2</span> Employment and income
          </h2>
          <dl className="fields">
            <Field
              label="Employer"
              value={data.employer}
              source={credentialSource(data, "employment-income", "employment and income")}
            />
            <Field
              label="Position"
              value={data.jobTitle}
              source={credentialSource(data, "employment-income", "employment and income")}
            />
            <Field
              label="Start date"
              value={longDate(data.startDate)}
              source={credentialSource(data, "employment-income", "employment and income")}
            />
            <Field
              label="Gross monthly income"
              value={usd(data.monthlyIncomeUsd)}
              source={credentialSource(data, "employment-income", "employment and income")}
            />
          </dl>
        </section>

        <section className="panel" aria-labelledby="assets-heading">
          <h2 id="assets-heading">
            <span className="section-no">3</span> Assets and liabilities
          </h2>
          <dl className="fields">
            {data.accounts.map((account) => (
              <Field
                key={account.last4}
                label={`${account.provider} account ending ${account.last4}`}
                value={usd(account.balanceUsd)}
                source={credentialSource(data, "assets", "account summary")}
              />
            ))}
            <Field
              label="Monthly debt payments"
              value={usd(data.monthlyDebtUsd)}
              source={credentialSource(data, "credit-summary", "credit summary")}
            />
          </dl>
          <p className="fine">
            Juniper orders its own credit report from the bureau after you apply. That report does
            not pass through your pod.
          </p>
        </section>

        <section className="panel" aria-labelledby="loan-heading">
          <h2 id="loan-heading">
            <span className="section-no">4</span> Loan and property
          </h2>
          <dl className="fields">
            <Field
              label="Property address"
              value={data.propertyAddress}
              source={{ from: "property details", kind: "pod" }}
            />
            <Field
              label="Estimated value (contract price)"
              value={usd(data.purchasePriceUsd)}
              source={{ from: "purchase agreement", kind: "pod" }}
            />
            <Field
              label="Loan amount sought"
              value={`${usd(data.loanAmountUsd)} (price less your ${usd(data.downPaymentUsd)} down payment)`}
              source={{ kind: "form" }}
            />
            <Field
              label="Loan"
              value="30-year fixed, purchase, primary residence"
              source={{ kind: "form" }}
            />
          </dl>
        </section>
      </div>

      <aside className="checklist panel" aria-labelledby="checklist-heading">
        <h2 id="checklist-heading">Six items make an application</h2>
        <ol className="six">
          {checklist.map((item) => (
            <li key={item.item} className={item.done ? "is-done" : undefined}>
              <span className="six-mark" aria-hidden="true">
                {item.done ? "✓" : ""}
              </span>
              <span>
                {item.item}
                <span className="sr-only">{item.done ? ": complete" : ": missing"}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="fine">
          {allVerified
            ? "Four credentials checked at source: signature, issuer key and status."
            : "A credential failed its check at source. Juniper cannot rely on it."}
        </p>
        {authorisation === "failed" && !data.submitted ? (
          <p className="hint hint-bad">Your credit-report authorisation could not be recorded.</p>
        ) : null}
        {data.submitted ? (
          <div className="done-box" role="status">
            <p>
              <strong>Application received on {demoDate(calendar(), applied)}.</strong>
            </p>
            <p>
              Your Loan Estimate is due by {demoDate(calendar(), loanEstimateDeadline(applied))},
              three business days later. A copy of the application is in your pod.
            </p>
            <Link href="/disclosures">Go to your disclosures</Link>
          </div>
        ) : (
          <button
            type="button"
            className="button button-primary button-wide"
            data-tour="lender-submit-application"
            onClick={submit}
            disabled={
              !allSix || !allVerified || authorisation === "pending" || submitting.kind === "busy"
            }
          >
            {submitting.kind === "busy" ? "Submitting…" : "Submit application"}
          </button>
        )}
        {refused?.kind === "refused" ? <Refusal {...refused} /> : null}
        {submitting.kind === "failed" && refused === undefined ? (
          <Failure
            error={
              submitting.error instanceof Error
                ? submitting.error
                : new Error(String(submitting.error))
            }
          />
        ) : null}
      </aside>
    </div>
  );
}

export function ApplicationPage() {
  useEffect(() => applyDocumentMeta(org, "Application"), []);
  const [state, reload] = usePod(() => loadApplication(worldOn(DAY.application)));
  return (
    <>
      <section className="intro">
        <p className="eyebrow">Uniform Residential Loan Application</p>
        <h1>Review your application</h1>
        <p className="lede">
          Filled in from your pod. Each answer shows where it came from and who vouches for it.
        </p>
      </section>
      {state.status === "loading" ? <Loading label="Reading your pod…" /> : null}
      {state.status === "error" ? <Failure error={state.error} /> : null}
      {state.status === "ready" && state.value.kind === "refused" ? (
        <Refusal {...state.value}>
          <p>
            Juniper has no access to your pod yet.{" "}
            <Link href="/">Start with “Apply with your pod”</Link> and approve the request in your
            wallet.
          </p>
        </Refusal>
      ) : null}
      {state.status === "ready" && state.value.kind === "missing" ? (
        <MissingList resources={state.value.resources} />
      ) : null}
      {state.status === "ready" && state.value.kind === "ready" ? (
        <ApplicationForm data={state.value.data} reload={reload} />
      ) : null}
    </>
  );
}
