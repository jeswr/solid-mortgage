// AUTHORED-BY Claude Opus 5.5
import { checkAtSource } from "@mortgage/content/mortgage/issuers";
import { CREDENTIALS, type CredentialName } from "@mortgage/content/mortgage/journey";
import { Link } from "wouter";
import { Screen } from "../App.tsx";
import { Icon } from "../components/Icon.tsx";
import { Empty, Field, Loading, OrgBadge, Problem } from "../components/ui.tsx";
import { nameOfWebid } from "../explain.ts";
import { type CredentialCard, isoDay, readCredentials } from "../pod-data.ts";
import { usePodData, useWallet } from "../runtime.tsx";

function useDayLabel() {
  const { world } = useWallet();
  const calendar = world().calendar;
  return (date: Date) => calendar.label(calendar.dayOf(isoDay(date)));
}

/** Documents: the signed credentials in the pod, as cards. */
export function Documents() {
  const credentials = usePodData(readCredentials);
  const dayLabel = useDayLabel();
  return (
    <Screen title="Documents">
      <p className="lede">
        Signed by the organisation that knows the fact. Anyone you share one with can check it with
        the issuer, without calling them.
      </p>
      {credentials.error !== undefined ? <Problem error={credentials.error} /> : null}
      {credentials.data === undefined && credentials.error === undefined ? (
        <Loading what="your documents" />
      ) : null}
      {credentials.data?.length === 0 ? (
        <Empty>No signed documents yet. Organisations add them when you approve a request.</Empty>
      ) : null}
      <ul className="stack">
        {credentials.data?.map((card) => (
          <li key={card.name}>
            <Link href={`/documents/${card.name}`} className="credential">
              <OrgBadge webid={card.issuer} />
              <span className="credential-text">
                <span className="credential-title">{card.label}</span>
                <span className="muted">
                  {nameOfWebid(card.issuer)} · from {dayLabel(card.validFrom)}
                </span>
              </span>
              <Icon name="chevron-right" />
            </Link>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

const isCredentialName = (name: string): name is CredentialName => Object.hasOwn(CREDENTIALS, name);

/** One credential: issuer, the signature check at source, dates and status. */
export function DocumentDetail({ name }: { name: string }) {
  const back = { href: "/documents", label: "Documents" };
  const credentials = usePodData(readCredentials, [name]);
  const card = credentials.data?.find((candidate) => candidate.name === name);
  if (!isCredentialName(name)) {
    return (
      <Screen title="Unknown document" page="Not found" back={back}>
        <Empty>Cairn does not know a document called {name}.</Empty>
      </Screen>
    );
  }
  return (
    <Screen title={card?.label ?? "Document"} back={back}>
      {credentials.error !== undefined ? <Problem error={credentials.error} /> : null}
      {credentials.data === undefined && credentials.error === undefined ? (
        <Loading what="the document" />
      ) : null}
      {credentials.data !== undefined && card === undefined ? (
        <Empty>This document is not in your pod.</Empty>
      ) : null}
      {card !== undefined ? <CredentialFacts card={card} /> : null}
    </Screen>
  );
}

function CredentialFacts({ card }: { card: CredentialCard }) {
  const dayLabel = useDayLabel();
  const entry = CREDENTIALS[card.name];
  const check = usePodData(
    (world) => checkAtSource(world, "alex", card.url, card.kind, [entry.issuer]),
    [card.url],
  );
  const result = check.data?.result;
  return (
    <>
      <section className="card">
        <div className="card-head">
          <OrgBadge webid={card.issuer} />
          <div>
            <h2>{nameOfWebid(card.issuer)}</h2>
            <p className="muted">Issuer</p>
          </div>
        </div>
        {card.summary === "" ? null : <p className="claim">{card.summary}</p>}
        <dl className="fields">
          <Field label="Valid from">{dayLabel(card.validFrom)}</Field>
          <Field label="Valid until">
            {card.validUntil === undefined ? "No end date" : dayLabel(card.validUntil)}
          </Field>
          <Field label="Where it lives">
            <code>/{card.path}</code>
          </Field>
        </dl>
      </section>
      <section className="card" aria-labelledby="check-heading" aria-live="polite">
        <h2 id="check-heading">
          <Icon name="seal" /> Checked with the issuer
        </h2>
        {check.error !== undefined ? <Problem error={check.error} /> : null}
        {check.data === undefined && check.error === undefined ? (
          <p className="loading" role="status">
            Checking the signature against the issuer's published key and status list…
          </p>
        ) : null}
        {result !== undefined ? (
          <ul className="checks">
            <li className={result.verified ? "ok" : "bad"}>
              <Icon name={result.verified ? "check" : "cross"} />
              {result.verified
                ? "Signature, issuer key, validity and status all check out."
                : "This document does not check out."}
            </li>
            {result.errors.map((error) => (
              <li key={`${error.code}-${error.message}`} className="bad">
                <Icon name="cross" /> {error.message}
              </li>
            ))}
            {card.statusList === undefined ? null : (
              <li className="muted">Status list: {new URL(card.statusList).pathname}</li>
            )}
          </ul>
        ) : null}
      </section>
    </>
  );
}
