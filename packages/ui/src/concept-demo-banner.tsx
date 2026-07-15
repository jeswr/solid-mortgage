export interface ConceptDemoBannerProps {
  organization: string;
}

/** Persistent source- and offer-negation required on every branded surface. */
export function ConceptDemoBanner({ organization }: ConceptDemoBannerProps) {
  return (
    <div
      data-concept-demo-banner=""
      style={{
        background: "#0f172a",
        bottom: 0,
        color: "#f8fafc",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "0.875rem",
        fontWeight: 600,
        left: 0,
        lineHeight: 1.5,
        padding: "0.75rem 1rem",
        position: "fixed",
        right: 0,
        textAlign: "center",
        zIndex: 50,
      }}
    >
      Concept demo - this is not {organization}. Not an offer of credit.
    </div>
  );
}
