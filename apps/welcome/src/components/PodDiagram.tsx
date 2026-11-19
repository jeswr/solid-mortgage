// AUTHORED-BY Claude Opus 5.5
/**
 * The hero picture: one pod at the centre, organisations around it reading under grants, one
 * grant withdrawn. Node colours are the organisations' own registry colours.
 */
import { ORGS } from "@mortgage/content/orgs";
import type { OrgSlug } from "@mortgage/demo-kit/registry";

const NODES: ReadonlyArray<{ slug: OrgSlug; x: number; y: number; revoked?: boolean }> = [
  { slug: "payroll", x: 70, y: 70 },
  { slug: "bank", x: 250, y: 46 },
  { slug: "lender", x: 430, y: 70, revoked: true },
  { slug: "appraisal", x: 470, y: 210 },
  { slug: "insurer", x: 410, y: 330 },
  { slug: "title", x: 110, y: 330 },
  { slug: "servicer", x: 40, y: 200 },
];

const CX = 255;
const CY = 195;

export function PodDiagram() {
  return (
    <svg
      className="pod-diagram"
      viewBox="0 0 520 390"
      role="img"
      aria-labelledby="pod-diagram-title"
    >
      <title id="pod-diagram-title">
        One pod at the centre. Seven organisations read from it under grants; one grant has been
        withdrawn.
      </title>
      <defs>
        <radialGradient id="pod-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8FD3C7" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#8FD3C7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r="120" fill="url(#pod-glow)" />
      {NODES.map((node) => (
        <line
          key={`edge-${node.slug}`}
          x1={CX}
          y1={CY}
          x2={node.x}
          y2={node.y}
          stroke={node.revoked ? "#F2B880" : "#8FA3B5"}
          strokeWidth="2"
          strokeDasharray={node.revoked ? "3 7" : undefined}
          strokeLinecap="round"
        />
      ))}
      {NODES.map((node) => {
        const org = ORGS[node.slug];
        return (
          <g key={node.slug}>
            <circle
              cx={node.x}
              cy={node.y}
              r="22"
              fill={org.themeColor}
              stroke="#F6F4EF"
              strokeWidth="3"
            />
            <text x={node.x} y={node.y + 42} textAnchor="middle" className="pod-diagram__label">
              {org.short}
            </text>
            {node.revoked ? (
              <path
                d={`M${node.x - 8} ${node.y - 8} l16 16 M${node.x + 8} ${node.y - 8} l-16 16`}
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ) : null}
          </g>
        );
      })}
      <circle cx={CX} cy={CY} r="58" fill="#F6F4EF" />
      <circle cx={CX} cy={CY} r="58" fill="none" stroke="#8FD3C7" strokeWidth="3" />
      <g stroke="#13212E" strokeWidth="2" fill="none" strokeLinecap="round">
        <rect x={CX - 22} y={CY - 26} width="44" height="14" rx="3" />
        <rect x={CX - 22} y={CY - 8} width="44" height="14" rx="3" />
        <rect x={CX - 22} y={CY + 10} width="44" height="14" rx="3" />
      </g>
      <text x={CX} y={CY + 84} textAnchor="middle" className="pod-diagram__pod">
        Alex's pod
      </text>
    </svg>
  );
}
