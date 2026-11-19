// AUTHORED-BY Claude Opus 5.5
/** "Fill in by hand": what the conventional route asks for, for comparison. Not processed here. */
import { applyDocumentMeta } from "@mortgage/demo-kit/trust";
import { useEffect } from "react";
import { Link } from "wouter";
import { org } from "../org.ts";

const PAPERWORK = [
  "Two recent payslips and two years of W-2 forms",
  "Two months of statements for every bank account",
  "A government photo ID",
  "The signed purchase agreement",
  "Your Social Security number, employer contact and address history",
];

export function ManualPage() {
  useEffect(() => applyDocumentMeta(org, "Fill in by hand"), []);
  return (
    <>
      <section className="intro">
        <p className="eyebrow">The usual way</p>
        <h1>Filling in by hand</h1>
        <p className="lede">
          Without a pod, you type the application yourself and upload copies. Juniper then keeps
          those copies and phones or emails the issuers to check them.
        </p>
      </section>
      <section className="panel" aria-labelledby="paperwork-heading">
        <h2 id="paperwork-heading">What you would gather</h2>
        <ul className="todo">
          {PAPERWORK.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="fine">This demo shows the hand-filled route but does not process it.</p>
        <Link href="/" className="button button-primary">
          Apply with your pod instead
        </Link>
      </section>
    </>
  );
}
