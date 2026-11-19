// AUTHORED-BY Claude Opus 5.5
import { ContactDetails, PaymentMandate } from "@mortgage/data-model";
import { createDemoCalendar } from "@mortgage/demo-kit/calendar";
import { ready, session } from "@mortgage/pod-runtime";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { useEffect, useState } from "react";
import { usePodLog } from "../log.ts";
import { podUrl } from "../pods.ts";
import { usePodResource } from "../read.ts";
import {
  CONTACT_PATH,
  canRead,
  connection,
  longDate,
  MANDATE_PATH,
  mandateNamesUs,
  nextDebit,
  usd,
} from "../view.ts";
import { Outcome } from "./Outcome.tsx";
import { NotConnected, Shell } from "./Shell.tsx";

const asContact = (url: string, dataset: DatasetCore) =>
  new ContactDetails(url, dataset, DataFactory);
const asMandate = (url: string, dataset: DatasetCore) =>
  new PaymentMandate(url, dataset, DataFactory);

/** Today in the demo calendar, from the runtime. */
function useDemoToday(): string | undefined {
  const [today, setToday] = useState<string>();
  useEffect(() => {
    let live = true;
    ready().then(
      (info) => live && setToday(createDemoCalendar(info.dayOne).date(info.day)),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return today;
}

function PaymentCard({ mandate, today }: { mandate: PaymentMandate; today?: string }) {
  const ours = mandateNamesUs(mandate, session().webid);
  return (
    <section className="panel payment" aria-labelledby="payment-heading">
      <h2 id="payment-heading">Next payment</h2>
      <p className="big">{mandate.amountUsd === undefined ? "—" : usd(mandate.amountUsd)}</p>
      <p>
        {today === undefined
          ? `Collected on day ${mandate.debitDayOfMonth} of each month`
          : `Due ${longDate(nextDebit(today, mandate.debitDayOfMonth))}`}
      </p>
      <dl className="pairs">
        <div>
          <dt>Autopay from</dt>
          <dd>
            {mandate.bankName} •••• {mandate.accountLast4}
          </dd>
        </div>
        <div>
          <dt>Instruction set up</dt>
          <dd>{longDate(mandate.issued)}</dd>
        </div>
        <div>
          <dt>Pays</dt>
          <dd>{ours ? "Marigold Loan Servicing" : "Another servicer"}</dd>
        </div>
      </dl>
      <p className="source">Read from your pod · banking/payment-mandate</p>
    </section>
  );
}

function ContactCard({ contact }: { contact: ContactDetails }) {
  const address = contact.address;
  return (
    <section className="panel" aria-labelledby="contact-heading">
      <h2 id="contact-heading">Where we reach you</h2>
      <dl className="pairs">
        <div>
          <dt>Mailing address</dt>
          <dd>
            {address.streetAddress}, {address.addressLocality}, {address.addressRegion}{" "}
            {address.postalCode}
          </dd>
        </div>
        {contact.telephone === undefined ? null : (
          <div>
            <dt>Phone</dt>
            <dd>{contact.telephone}</dd>
          </div>
        )}
        {[...contact.emails].map((email) => (
          <div key={email}>
            <dt>Email</dt>
            <dd>{email}</dd>
          </div>
        ))}
      </dl>
      <p className="source">Read from your pod · profile/contact. Change it there, not here.</p>
    </section>
  );
}

export function Account() {
  const log = usePodLog();
  const allowed = canRead(connection(log));
  const today = useDemoToday();
  const mandate = usePodResource(podUrl("alex", MANDATE_PATH), allowed, asMandate);
  const contact = usePodResource(podUrl("alex", CONTACT_PATH), allowed, asContact);
  return (
    <Shell page="Account">
      <section className="hero">
        <h1>Your account</h1>
        <p>Everything below is read from your pod under the access you gave.</p>
      </section>
      {allowed ? (
        <div className="grid">
          <Outcome read={mandate} what="your autopay instruction">
            {(value) => <PaymentCard mandate={value} {...(today ? { today } : {})} />}
          </Outcome>
          <Outcome read={contact} what="your contact details">
            {(value) => <ContactCard contact={value} />}
          </Outcome>
        </div>
      ) : (
        <NotConnected />
      )}
    </Shell>
  );
}
