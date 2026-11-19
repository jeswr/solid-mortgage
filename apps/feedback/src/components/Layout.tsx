// AUTHORED-BY Claude Opus 5.5
/** The chrome every feedback route shares: skip link, trust banner, site header and footer. */
import { HONESTY_PATH, TrustBanner } from "@mortgage/demo-kit/trust";
import { appUrl } from "@mortgage/demo-kit/urls";
import type { ReactNode } from "react";
import { CONVENER } from "../site.ts";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TrustBanner />
      <header className="site-header">
        <div className="site-header__inner">
          <a
            href={appUrl("welcome")}
            className="brand"
            aria-label="Solid demos for EDMA members, home"
          >
            <BrandMark />
            <span className="brand__text">
              <span className="brand__name">Solid demos</span>
              <span className="brand__for">for EDMA members</span>
            </span>
          </a>
          <a className="site-header__back" href={appUrl("welcome")}>
            Back to the demos
          </a>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p>Solid demos for EDMA members, convened by the {CONVENER}.</p>
          <p>
            <strong>Concept demonstration.</strong> All organisations and people are fictional. Any
            resemblance to a real organisation or person is unintended. Nothing here is a real offer
            of credit, insurance or any other product.
          </p>
          <p>
            <a href={appUrl("welcome", HONESTY_PATH)}>What is real and what is simulated</a>
          </p>
        </div>
      </footer>
    </>
  );
}

function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#13212E" />
      <circle cx="16" cy="16" r="6" fill="#8FD3C7" />
      <g stroke="#F2B880" strokeWidth="2" strokeLinecap="round">
        <path d="M16 10V5M21.2 13 25.5 10.5M21.2 19l4.3 2.5M16 22v5M10.8 19l-4.3 2.5M10.8 13 6.5 10.5" />
      </g>
    </svg>
  );
}
