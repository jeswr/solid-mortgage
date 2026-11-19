// AUTHORED-BY Claude Opus 5.5
import { AppraisalCredential, MORT, SubjectProperty } from "@mortgage/data-model";
import type { DatasetCore } from "@rdfjs/types";
import { DataFactory } from "n3";
import { Link } from "wouter";
import { usePodLog } from "../log.ts";
import { podUrl } from "../pods.ts";
import { type Read, typedSubject, usePodResource } from "../read.ts";
import {
  APPRAISAL_PATH,
  appraisalFacts,
  bindState,
  describePath,
  type Fact,
  grantScope,
  PROPERTY_PATH,
  propertyFacts,
} from "../view.ts";
import { Refusal, Shell } from "./Shell.tsx";

const asProperty = (url: string, dataset: DatasetCore) =>
  new SubjectProperty(url, dataset, DataFactory);
const asAppraisal = (url: string, dataset: DatasetCore) =>
  new AppraisalCredential(
    typedSubject(dataset, MORT.AppraisalCredential) ?? url,
    dataset,
    DataFactory,
  );

function FactList({ facts }: { facts: Fact[] }) {
  return (
    <dl className="facts">
      {facts.map((fact) => (
        <div key={fact.label} className="fact">
          <dt>{fact.label}</dt>
          <dd>
            <span className="value">{fact.value}</span>
            <span className="source">{fact.source}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ReadOutcome<T>({ read, render }: { read: Read<T>; render: (value: T) => Fact[] }) {
  switch (read.phase) {
    case "idle":
    case "loading":
      return <p className="muted">Reading from your pod…</p>;
    case "ok":
      return <FactList facts={render(read.value)} />;
    case "refused":
      return (
        <Refusal status={read.status}>
          Wrenfield is not allowed to read this. The grant has ended or was never given.
        </Refusal>
      );
    case "missing":
      return <p className="muted">Not in your pod yet.</p>;
    case "failed":
      return <p className="error">{read.message}</p>;
  }
}

export function Property() {
  const log = usePodLog();
  const shared = bindState(log) === "bound";
  const property = usePodResource(podUrl("alex", PROPERTY_PATH), shared, asProperty);
  const appraisal = usePodResource(podUrl("alex", APPRAISAL_PATH), shared, asAppraisal);
  const { reads } = grantScope();
  return (
    <Shell stage={1} page="Your home">
      <p className="eyebrow">Question 1 of 2</p>
      <h1>Is this your home?</h1>
      {shared ? (
        <>
          <p className="lede">Read from your pod just now. Nothing here was typed.</p>
          <ReadOutcome read={property} render={propertyFacts} />
          <ReadOutcome read={appraisal} render={appraisalFacts} />
        </>
      ) : (
        <>
          <p className="lede">
            When you bind, your pod lets Wrenfield read these and nothing else. Income, savings and
            credit stay where they are.
          </p>
          <ul className="asks">
            {reads.map((path) => (
              <li key={path}>
                <span>{describePath(path)}</span>
                <span className="chip">Shared when you bind</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <Link href="/quote" className="cta">
        Yes, show my quote
      </Link>
    </Shell>
  );
}
