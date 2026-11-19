// AUTHORED-BY Claude Opus 5.5
import { LoanTransferNotice } from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { Link } from "wouter";
import { usePodLog } from "../log.ts";
import { podUrl } from "../pods.ts";
import { usePodResource } from "../read.ts";
import { connection, longDate, TRANSFER_NOTICE_PATH } from "../view.ts";
import { Outcome } from "./Outcome.tsx";
import { Shell } from "./Shell.tsx";

const asNotice = (url: string, dataset: DatasetCore) =>
  new LoanTransferNotice(url, dataset, DataFactory);

function NoticeCard({ notice }: { notice: LoanTransferNotice }) {
  return (
    <article className="panel notice" aria-labelledby="notice-heading">
      <p className="kicker">Delivered to your pod · {longDate(notice.issued)}</p>
      <h2 id="notice-heading">{notice.name}</h2>
      {notice.description === undefined ? null : <p>{notice.description}</p>}
      <dl className="pairs">
        <div>
          <dt>Effective</dt>
          <dd>{longDate(notice.transferEffectiveDate)}</dd>
        </div>
        <div>
          <dt>From</dt>
          <dd>{notice.transferorName}</dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>{notice.transfereeName}</dd>
        </div>
        {notice.paymentProtectionEnds === undefined ? null : (
          <div>
            <dt>Late-fee protection until</dt>
            <dd>{longDate(notice.paymentProtectionEnds)}</dd>
          </div>
        )}
        {notice.telephone === undefined ? null : (
          <div>
            <dt>Call us</dt>
            <dd>{notice.telephone}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function Welcome() {
  const log = usePodLog();
  const state = connection(log);
  const notice = usePodResource(
    podUrl("alex", TRANSFER_NOTICE_PATH),
    state === "connected",
    asNotice,
  );
  return (
    <Shell>
      <section className="hero">
        <h1>Welcome to Marigold, Alex</h1>
        <p>
          Your mortgage is now serviced by Marigold. Your loan terms do not change. Only where you
          send payments does.
        </p>
      </section>
      {state === "connected" ? (
        <Outcome read={notice} what="your transfer notice">
          {(value) => <NoticeCard notice={value} />}
        </Outcome>
      ) : (
        <section className="panel">
          <h2>Your welcome notice</h2>
          <p>
            We deliver the notice of servicing transfer straight into your pod, where you keep
            Juniper's letter too. Connect your pod and it arrives in seconds.
          </p>
          <Link href="/connect" className="button">
            Connect your pod
          </Link>
        </section>
      )}
    </Shell>
  );
}
