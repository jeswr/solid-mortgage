// AUTHORED-BY Claude Opus 5.5
/** Sextant's document room: one paper-like page per section of the file. */
import { DAY, FIGURE_TAG, LOAN, TITLE_FILE } from "@mortgage/content/mortgage/facts";
import { appUrl } from "@mortgage/demo-kit/urls";
import { type ReactNode, useState } from "react";
import { Link } from "wouter";
import { CatchUp, OutcomeNote, Refusal } from "./components.tsx";
import {
  type CommitmentView,
  FILE_NUMBER,
  type FileState,
  probeSettlement,
  readParties,
  readRecorded,
  urls,
} from "./data.ts";
import { journey, useAction, useCatchUp, usePodState, worldOn } from "./runtime.ts";
import { canCommit, canSign, type FileFlags, longDate, usd } from "./view.ts";

export const FILE_PATH = `/files/${FILE_NUMBER}`;

export function flagsOf(file: FileState): FileFlags {
  return {
    closed: file.closed,
    committed: file.commitment !== undefined,
    ordered: file.order !== undefined,
    recorded: file.recorded,
  };
}

function Paper({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <article className="paper">
      {kicker === undefined ? null : <p className="kicker">{kicker}</p>}
      <h1>{title}</h1>
      {children}
    </article>
  );
}

function NotOrdered({ step, needed }: { step: string; needed: boolean }) {
  return (
    <CatchUp
      needed={needed}
      step={step}
      label="Juniper Home Loans has not opened this file yet. It orders title and settlement at step 12."
    />
  );
}

export function Overview({ file }: { file: FileState }) {
  return (
    <Paper title={`File ${FILE_NUMBER}`} kicker="File overview">
      <NotOrdered needed={file.order === undefined} step="title-commitment" />
      {file.order === undefined ? null : (
        <>
          <p>
            Title search, commitment and settlement for the purchase financed by{" "}
            {file.order.customer}, loan {file.order.loanNumber}. Opened{" "}
            {longDate(file.order.ordered)}.
          </p>
          <h2>Correspondence</h2>
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">From</th>
                <th scope="col">Subject</th>
              </tr>
            </thead>
            <tbody>
              {file.messages.map((message) => (
                <tr key={message.url}>
                  <td>{longDate(message.published)}</td>
                  <td>{message.from}</td>
                  <td>{message.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <Link href={`${FILE_PATH}/commitment`}>Go to the commitment</Link>
          </p>
        </>
      )}
    </Paper>
  );
}

export function TitleSearch({ file }: { file: FileState }) {
  return (
    <Paper title="Title search" kicker={`File ${FILE_NUMBER}`}>
      <NotOrdered needed={file.order === undefined} step="title-commitment" />
      {file.order === undefined ? null : (
        <>
          <p>
            Sextant searched the Marlow County land records for the parcel. The county index is
            public; this search used no data from the buyer's pod.
          </p>
          <h2>Chain of title</h2>
          <p>
            Vested owner of record:{" "}
            <strong>
              {file.commitment?.vestedOwner ?? "the seller named in the purchase agreement"}
            </strong>
            .
          </p>
          <h2>Liens and matters found</h2>
          <ul className="findings">
            {TITLE_FILE.requirements.slice(0, 1).map((item) => (
              <li key={item}>
                <span className="tag lien">Lien</span> {item.replace(/^Pay off and release /, "")}
              </li>
            ))}
            {TITLE_FILE.exceptions.map((item) => (
              <li key={item}>
                <span className="tag">Matter</span> {item}
              </li>
            ))}
          </ul>
          <p className="muted">Sextant's search of the public index (simulated).</p>
        </>
      )}
    </Paper>
  );
}

function Schedules({
  commitment,
}: {
  commitment: Pick<
    CommitmentView,
    | "vestedOwner"
    | "proposedInsured"
    | "ownerPolicyUsd"
    | "loanPolicyUsd"
    | "requirements"
    | "exceptions"
    | "address"
  >;
}) {
  return (
    <>
      <section aria-labelledby="schedule-a">
        <h2 id="schedule-a">Schedule A</h2>
        <dl className="schedule">
          <dt>Land</dt>
          <dd>{commitment.address}</dd>
          <dt>Vested in</dt>
          <dd>{commitment.vestedOwner}</dd>
          <dt>Proposed insured</dt>
          <dd>{commitment.proposedInsured.join("; ")}</dd>
          <dt>Owner's policy</dt>
          <dd>
            {usd(commitment.ownerPolicyUsd)} <span className="muted">({FIGURE_TAG})</span>
          </dd>
          <dt>Loan policy</dt>
          <dd>{usd(commitment.loanPolicyUsd)}</dd>
        </dl>
      </section>
      <section aria-labelledby="schedule-b1">
        <h2 id="schedule-b1">Schedule B, Part I: Requirements</h2>
        <ol>
          {commitment.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="schedule-b2">
        <h2 id="schedule-b2">Schedule B, Part II: Exceptions</h2>
        <ol>
          {commitment.exceptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** Before issue: the draft, filled from the two resources G6 lets Sextant read. */
function Draft() {
  const parties = usePodState(readParties, ["alex"]);
  if (parties.outcome.state !== "ok") {
    return (
      <OutcomeNote
        outcome={parties.outcome}
        why="Sextant's grant G6 does not cover this read now."
      />
    );
  }
  const value = parties.outcome.value;
  return (
    <>
      <p className="draft-mark">Draft. Not issued.</p>
      <p className="muted">
        Buyer's name and the contract were read from Alex's pod under grant G6: nothing else.
      </p>
      <Schedules
        commitment={{
          address: value.address,
          exceptions: [...TITLE_FILE.exceptions],
          loanPolicyUsd: LOAN.principalUsd,
          ownerPolicyUsd: value.priceUsd,
          proposedInsured: [value.buyer, "Juniper Home Loans, its successors and/or assigns"],
          requirements: [...TITLE_FILE.requirements],
          vestedOwner: value.seller,
        }}
      />
    </>
  );
}

export function Commitment({ file }: { file: FileState }) {
  const action = useAction();
  const catchingUp = useCatchUp().running;
  const flags = flagsOf(file);
  return (
    <Paper title="Commitment for title insurance" kicker={`Commitment ${FILE_NUMBER}`}>
      <NotOrdered needed={file.order === undefined} step="title-commitment" />
      {file.commitment !== undefined ? (
        <>
          <p className="issued-mark">
            Issued {longDate(file.commitment.issued)}, signed by Sextant Title &amp; Escrow. Search
            effective {longDate(file.commitment.searchedThrough)}.
          </p>
          <Schedules commitment={file.commitment} />
          <p className="muted">
            The signed commitment went into Alex's pod and, as a proposed insured, to Juniper.
          </p>
        </>
      ) : file.order !== undefined ? (
        <Draft />
      ) : null}
      <div className="actions">
        <button
          type="button"
          className="seal-button"
          data-tour="title-issue-commitment"
          disabled={!canCommit(flags) || catchingUp || action.outcome.state === "running"}
          onClick={() =>
            action.run(async () =>
              (await journey()).issueTitleCommitment(await worldOn(DAY.titleCommitment)),
            )
          }
        >
          {action.outcome.state === "running" ? "Signing and issuing…" : "Issue commitment"}
        </button>
        <OutcomeNote outcome={action.outcome} />
      </div>
    </Paper>
  );
}

const CLOSING_DOCUMENTS = [
  { name: "Promissory note", signer: "Borrower" },
  { name: "Mortgage (security instrument)", signer: "Borrower" },
  { name: "Warranty deed", signer: "Seller" },
  { name: "Settlement statement", signer: "Borrower and seller" },
] as const;

export function ClosingRoom({ file }: { file: FileState }) {
  const action = useAction();
  const catchingUp = useCatchUp().running;
  const flags = flagsOf(file);
  const borrower = file.commitment?.proposedInsured[0] ?? "the borrower";
  return (
    <Paper title="Closing room" kicker={`Settlement ${FILE_NUMBER}`}>
      <p className="simulated" role="note">
        Simulated signing: not a notarial act. No signature, identity check or notarisation in this
        demo has legal effect.
      </p>
      <CatchUp
        needed={file.commitment === undefined}
        step="closing-sign"
        label="The closing is held after the commitment, clear to close and the Closing Disclosure (steps 14 to 17)."
      />
      <h2>Identity</h2>
      <p>
        {borrower}: identity checked at the table against a government photo ID{" "}
        <span className="muted">(simulated)</span>.
      </p>
      <h2>Documents</h2>
      <table className="ledger">
        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Signs</th>
            <th scope="col">Signature</th>
          </tr>
        </thead>
        <tbody>
          {CLOSING_DOCUMENTS.map((document) => (
            <tr key={document.name}>
              <td>{document.name}</td>
              <td>{document.signer}</td>
              <td>
                <span className={`sig-field ${file.closed ? "signed" : ""}`}>
                  {file.closed ? "Signed (simulated)" : "Awaiting signature"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        The borrower's copies and the settlement statement are delivered to Alex's pod. The original
        note is held for the lender; the deed and the mortgage go to the county. A loan to buy a
        home has no three-day right to cancel.
      </p>
      <div className="actions">
        <button
          type="button"
          className="seal-button"
          data-tour="title-sign"
          disabled={!canSign(flags) || catchingUp || action.outcome.state === "running"}
          onClick={() =>
            action.run(async () => (await journey()).signAtClosing(await worldOn(DAY.closing)))
          }
        >
          {action.outcome.state === "running" ? "Signing…" : file.closed ? "Signed" : "Sign"}
        </button>
        <OutcomeNote outcome={action.outcome} />
      </div>
      {file.closed ? <ReadBack /> : null}
    </Paper>
  );
}

/** G6 lets Sextant write the closing documents into Alex's pod, not read them back. */
function ReadBack() {
  const probe = useAction();
  const [status, setStatus] = useState<number>();
  return (
    <section aria-labelledby="read-back">
      <h2 id="read-back">Alex's copies</h2>
      <p>
        Sextant delivered the settlement statement and the signed copies into Alex's pod. Its grant
        lets it put documents there, not open them again.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={probe.outcome.state === "running"}
        onClick={() =>
          probe.run(async () => {
            setStatus(await probeSettlement());
          })
        }
      >
        Try to open Alex's settlement statement
      </button>
      {status === undefined ? null : status === 401 || status === 403 ? (
        <Refusal
          status={status}
          method="GET"
          url={urls.settlement()}
          why="G6 grants Write on mortgage/closing/, not Read."
        />
      ) : (
        <p role="status">The pod answered {status}.</p>
      )}
    </section>
  );
}

/** The settlement lines, as Sextant writes them into the settlement statement. */
const LEDGER = [
  { amountUsd: LOAN.purchasePriceUsd, name: "Contract sales price" },
  { amountUsd: LOAN.closingCostsUsd, name: "Closing costs" },
  { amountUsd: -LOAN.principalUsd, name: "Loan amount (wired by the lender)" },
  { amountUsd: -LOAN.earnestMoneyDepositUsd, name: "Earnest money deposit (held in escrow)" },
] as const;

export function Ledger({ file }: { file: FileState }) {
  return (
    <Paper title="Disbursement ledger" kicker={`Escrow ${FILE_NUMBER}`}>
      <p>
        Sextant's escrow ledger for the file. Money moves between bank accounts: no pod is involved.
      </p>
      <table className="ledger">
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col" className="num">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {LEDGER.map((line) => (
            <tr key={line.name}>
              <td>{line.name}</td>
              <td className="num">{usd(line.amountUsd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Cash to close from the borrower</th>
            <td className="num">{usd(LOAN.cashToCloseUsd)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted">
        {FIGURE_TAG}. Status: {file.closed ? "disbursed at closing" : "not yet funded"}.
      </p>
    </Paper>
  );
}

export function Recording({ file }: { file: FileState }) {
  const recorded = usePodState(
    () => readRecorded(file.messages),
    ["county", "title"],
    [file.messages],
  );
  return (
    <Paper title="Recording" kicker={`File ${FILE_NUMBER}`}>
      <p>
        After the closing Sextant submits the deed and the mortgage to the Marlow County Recorder by
        eRecording. The county returns an instrument number for each.
      </p>
      {file.recorded ? null : (
        <p>
          <a href={appUrl("county", "intake")}>Open the county's eRecording intake</a>
        </p>
      )}
      <OutcomeNote outcome={recorded.outcome} />
      {recorded.outcome.state === "ok" && recorded.outcome.value.length > 0 ? (
        <table className="ledger">
          <thead>
            <tr>
              <th scope="col">Instrument</th>
              <th scope="col">Number</th>
              <th scope="col">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {recorded.outcome.value.map((instrument) => (
              <tr key={instrument.reference}>
                <td>{instrument.name}</td>
                <td>
                  <a href={appUrl("county", `records/${instrument.reference}`)}>
                    {instrument.reference}
                  </a>
                </td>
                <td>{longDate(instrument.recordedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Nothing recorded for this file yet.</p>
      )}
      {file.recorded ? (
        <p className="muted">
          A recording receipt linking to the public record went into Alex's pod.
        </p>
      ) : null}
    </Paper>
  );
}

export function Policy({ file }: { file: FileState }) {
  return (
    <Paper title="Policies" kicker={`File ${FILE_NUMBER}`}>
      {file.commitment === undefined ? (
        <p>No commitment has been issued, so no policy can follow yet.</p>
      ) : (
        <>
          <p>
            Once recording is confirmed, Sextant issues the policies the commitment promised,
            subject to the Schedule B exceptions.
          </p>
          <dl className="schedule">
            <dt>Owner's policy</dt>
            <dd>
              {usd(file.commitment.ownerPolicyUsd)}, insuring {file.commitment.proposedInsured[0]}
            </dd>
            <dt>Loan policy</dt>
            <dd>
              {usd(file.commitment.loanPolicyUsd)}, insuring {file.commitment.proposedInsured[1]}
            </dd>
          </dl>
          <p className="muted">
            The owner's policy is written into Alex's pod with the loan's post-closing delivery
            (step 20). Writing it ends grant G6. Sextant may write that drawer but never read it, so
            it does not read the policy back.
          </p>
        </>
      )}
    </Paper>
  );
}
