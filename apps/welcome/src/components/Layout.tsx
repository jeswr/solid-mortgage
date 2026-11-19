// AUTHORED-BY Claude Opus 5.5
/** The chrome every welcome route shares: skip link, trust banner, site header and footer. */
import { TrustBanner } from "@mortgage/demo-kit/trust";
import type { ReactNode } from "react";
import { Link } from "wouter";
import { FOOTER_LINE } from "../copy.ts";
import { CONVENER, LINKS } from "../site.ts";

/** A same-page section on the home route, reachable from any route. */
export const homeSection = (id: string) => `${import.meta.env.BASE_URL}#${id}`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TrustBanner />
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="brand" aria-label="Solid demos for EDMA members, home">
            <BrandMark />
            <span className="brand__text">
              <span className="brand__name">Solid demos</span>
              <span className="brand__for">for EDMA members</span>
            </span>
          </Link>
          <nav className="site-nav" aria-label="Site">
            <ul>
              <li>
                <a href={homeSection("demos")}>Demos</a>
              </li>
              <li>
                <a href={homeSection("apps")}>Apps</a>
              </li>
              <li>
                <Link href="/honesty">Real or simulated</Link>
              </li>
              <li>
                <a href={homeSection("join")} className="site-nav__cta">
                  Join in
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p className="site-footer__brand">
            <BrandMark />
            <span>Solid demos for EDMA members, convened by the {CONVENER}.</span>
          </p>
          <p>
            <strong>Concept demonstration.</strong> All organisations and people are fictional. Any
            resemblance to a real organisation or person is unintended. Nothing here is a real offer
            of credit, insurance or any other product.
          </p>
          <p className="site-footer__legal">{FOOTER_LINE}</p>
          <ul className="site-footer__links">
            <li>
              <Link href="/honesty">What is real and what is simulated</Link>
            </li>
            <li>
              <Link href="/ledger">Journey ledger</Link>
            </li>
            <li>
              <a href={LINKS.source}>Source code</a>
            </li>
          </ul>
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
