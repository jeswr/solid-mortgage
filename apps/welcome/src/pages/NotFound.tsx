// AUTHORED-BY Claude Opus 5.5
import { useEffect } from "react";
import { Link } from "wouter";
import { applyMeta } from "../site.ts";

export function NotFound() {
  useEffect(() => applyMeta("Page not found"), []);
  return (
    <div className="page">
      <div className="page__inner page__inner--narrow">
        <h1>Page not found</h1>
        <p className="page__lead">There is nothing at this address.</p>
        <p>
          <Link href="/">Go to all demos</Link>
        </p>
      </div>
    </div>
  );
}
