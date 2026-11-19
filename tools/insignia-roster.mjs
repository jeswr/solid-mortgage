// AUTHORED-BY Claude Opus 5.5
/**
 * The never-render roster for `check:insignia` (design.md §b.2 rule 3, decision 0002 addendum).
 *
 * Two parts, one list:
 *
 * 1. Regulatory insignia and product marks (the original R2/R3 bright lines).
 * 2. Every real organisation named in docs/ that a fictional demo organisation could be taken
 *    for: lenders, banks, investors, bureaus, verification and open-banking vendors, title,
 *    valuation, insurance, servicing, e-closing and identity companies. Collected from docs/ on
 *    2026-11-19; add a name here whenever docs/ gains one.
 *
 * Deliberately not on the roster, because the demo cites them rather than imitating them:
 * standards and industry bodies (W3C, EDM Council / EDMA, OMG, MISMO, ALTA, MBA, GLEIF),
 * government bodies whose rules the tour quotes (CFPB, FHFA, HUD, IRS, the Federal Reserve,
 * Treasury, SEC, FinCEN; their seals are still banned below), the platforms the site runs on or
 * that collide with code tokens (Vercel, Microsoft, Google, Amazon, Apple, Meta, Snowflake), and
 * names with no distinctive written form (Persona, Alloy, Blend, Prove, Q2).
 *
 * `pattern` is a regular-expression source. It is matched case-SENSITIVELY when it contains an
 * uppercase letter (so `\bADP\b` does not match "adp" inside a word), else case-insensitively —
 * the rule `@jeswr/solid-showcase-kit/testing` applies.
 */

/** @type {Array<{ id: string; pattern: string; reason: string }>} */
export const INSIGNIA_ROSTER = [
  // --- Regulatory insignia and product marks -------------------------------------------------
  {
    id: "fdic-mark",
    pattern: "\\b[Ff][Dd][Ii][Cc]\\b|\\b[Ff]ederal\\s+[Dd]eposit\\s+[Ii]nsurance\\b",
    reason: "FDIC marks / deposit-insurance claims bind ANY person (12 U.S.C. § 1828(a)(4))",
  },
  {
    id: "equal-housing",
    pattern: "\\bequal\\s+housing\\s+(?:lender|opportunity)\\b",
    reason: "Equal Housing Lender/Opportunity insignia are credentials of covered entities",
  },
  {
    id: "agency-seal",
    pattern:
      "\\b(?:HUD|FHA|VA|Ginnie\\s*Mae)\\s+(?:[Ss]eal|[Ll]ogo|[Mm]ark|[Ii]nsignia|[Bb]adge)s?\\b",
    reason: "HUD/FHA/VA/agency seals may never be rendered",
  },
  {
    id: "nmls",
    pattern: "\\b[Nn][Mm][Ll][Ss]\\b",
    reason: "NMLS IDs / licensee credentials (real or invented) may never be rendered",
  },
  {
    id: "gse-product-mark",
    pattern: "\\bloan\\s+product\\s+advisor\\b",
    reason: "GSE product identifiers require written consent (R3): say 'AUS'",
  },
  {
    id: "gse-product-abbreviation",
    pattern: "\\bLPA\\b",
    reason: "Standalone GSE product abbreviation on an app surface (R3): say 'AUS'",
  },
  // --- Real organisations named in docs/ -----------------------------------------------------
  ...organisations({
    "bank-of-america": "\\bBank of America\\b|\\bBofA\\b",
    "freddie-mac": "\\bFreddie Mac\\b",
    "fannie-mae": "\\bFannie Mae\\b",
    "ginnie-mae": "\\bGinnie Mae\\b",
    mastercard: "\\bMastercard\\b|\\bMasterCard\\b",
    finicity: "\\bFinicity\\b",
    equifax: "\\bEquifax\\b",
    "the-work-number": "\\bThe Work Number\\b",
    experian: "\\bExperian\\b",
    transunion: "\\bTransUnion\\b",
    truist: "\\bTruist\\b",
    pnc: "\\bPNC\\b",
    "fifth-third": "\\bFifth Third\\b",
    citi: "\\bCiti(?:bank|group)?\\b",
    chase: "\\bJPMorgan\\b|\\bChase Bank\\b",
    "wolters-kluwer": "\\bWolters Kluwer\\b",
    eoriginal: "\\beOriginal\\b",
    cotality: "\\bCotality\\b",
    corelogic: "\\bCoreLogic\\b",
    "clear-capital": "\\bClear Capital\\b",
    ice: "\\bICE Mortgage\\b|\\bIntercontinental Exchange\\b|\\bICE Encompass\\b",
    "first-american": "\\bFirst American\\b",
    "fidelity-national": "\\bFidelity National\\b",
    "old-republic": "\\bOld Republic\\b",
    stewart: "\\bStewart (?:Title|Information)\\b",
    usaa: "\\bUSAA\\b",
    "state-farm": "\\bState Farm\\b",
    allstate: "\\bAllstate\\b",
    aig: "\\bAIG\\b",
    donegal: "\\bDonegal Insurance\\b",
    verizon: "\\bVerizon\\b",
    plaid: "\\bPlaid\\b",
    akoya: "\\bAkoya\\b",
    formfree: "\\bFormFree\\b",
    argyle: "\\bArgyle\\b",
    truework: "\\bTruework\\b",
    truv: "\\bTruv\\b",
    pinwheel: "\\bPinwheel\\b",
    "mx-technologies": "\\bMX Technologies\\b",
    adp: "\\bADP\\b",
    "proof-notarize": "\\bNotarize\\b|\\bProof\\.com\\b",
    docusign: "\\bDocu[Ss]ign\\b",
    snapdocs: "\\bSnapdocs\\b",
    "citizens-financial": "\\bCitizens Financial\\b",
    "m-and-t": "\\bM&T Bank\\b",
    huntington: "\\bHuntington (?:Bank|National|Bancshares)\\b",
    flagstar: "\\bFlagstar\\b",
    regions: "\\bRegions (?:Bank|Financial)\\b",
    zions: "\\bZions\\b",
    wintrust: "\\bWintrust\\b",
    "navy-federal": "\\bNavy Federal\\b",
    arvest: "\\bArvest\\b",
    velera: "\\bVelera\\b",
    sagen: "\\bSagen\\b",
    mgic: "\\bMGIC\\b",
    radian: "\\bRadian\\b",
    essent: "\\bEssent\\b",
    enact: "\\bEnact (?:Holdings|Mortgage)\\b",
    arch: "\\bArch (?:MI|Capital|Mortgage)\\b",
    interac: "\\bInterac\\b",
    "equitable-bank": "\\bEquitable Bank\\b",
    nationwide: "\\bNationwide Building Society\\b",
    natwest: "\\bNat[Ww]est\\b",
    lloyds: "\\bLloyds\\b",
    "rocket-mortgage": "\\bRocket Mortgage\\b",
    "mr-cooper": "\\bMr\\. Cooper\\b",
    lseg: "\\bLSEG\\b",
    kpmg: "\\bKPMG\\b",
    pwc: "\\bPwC\\b",
    ortecha: "\\bOrtecha\\b",
    element22: "\\bElement22\\b",
    altus: "\\bAltus Group\\b",
    mers: "\\bMERS(?:CORP)?\\b",
    "goldman-sachs": "\\bGoldman Sachs\\b",
    amex: "\\bAmerican Express\\b|\\bAmex\\b",
    visa: "\\bVisa\\b",
    inrupt: "\\bInrupt\\b",
    athumi: "\\bAthumi\\b",
    sbab: "\\bSBAB\\b",
    ing: "\\bING (?:Bank|Group)\\b",
    bnp: "\\bBNP Paribas\\b",
    socure: "\\bSocure\\b",
    jumio: "\\bJumio\\b",
    yoti: "\\bYoti\\b",
    mitek: "\\bMitek\\b",
    lexisnexis: "\\bLexisNexis\\b",
    sofi: "\\bSoFi\\b",
    upstart: "\\bUpstart\\b",
    kabbage: "\\bKabbage\\b",
  }),
];

/** Real-organisation entries: the demo's organisations are fictional and must not echo these. */
function organisations(patterns) {
  return Object.entries(patterns).map(([id, pattern]) => ({
    id: `org-${id}`,
    pattern,
    reason: "real organisation named in docs/: demo organisations are fictional (design.md §b.2)",
  }));
}
