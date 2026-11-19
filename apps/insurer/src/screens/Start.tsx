// AUTHORED-BY Claude Opus 5.5
import { Link } from "wouter";
import { Illustration, Shell } from "./Shell.tsx";

export function Start() {
  return (
    <Shell stage={0}>
      <Illustration />
      <p className="eyebrow">Homeowner's insurance</p>
      <h1>Cover your new home without filling in a form.</h1>
      <p className="lede">
        Wrenfield asks your pod for two things: the property record and your copy of the appraisal.
        You see every fact and where it came from before you bind.
      </p>
      <Link href="/property" className="cta">
        Use my pod to skip the form
      </Link>
    </Shell>
  );
}
