import type { RangeZone, RangeMarker } from "@/lib/blog";
import { tone } from "./tone";

interface Props {
  title: string;
  unit?: string;
  min: number;
  max: number;
  zones: RangeZone[];
  marker?: RangeMarker;
  caption?: string;
}

/**
 * ReferenceRangeBar — an inline-SVG bar that shows where a value sits across
 * low / normal / high zones. Pure vector (scales crisply, no raster weight),
 * theme-aware, and screen-reader friendly via role="img" + an aria summary.
 */
export default function ReferenceRangeBar({ title, unit, min, max, zones, marker, caption }: Props) {
  const W = 1000;
  const span = max - min || 1;
  const x = (v: number) => ((Math.max(min, Math.min(max, v)) - min) / span) * W;

  // Internal boundaries to label (de-duplicated, excluding the very ends).
  const bounds = Array.from(
    new Set(zones.flatMap((z) => [z.from, z.to]).filter((v) => v > min && v < max))
  ).sort((a, b) => a - b);

  const ariaZones = zones.map((z) => `${z.label} ${z.from}–${z.to}`).join(", ");
  const ariaMarker = marker ? `. ${marker.label ?? "Value"}: ${marker.value} ${unit ?? ""}`.trim() : "";

  return (
    <figure className="my-8">
      <figcaption className="flex items-baseline justify-between mb-2.5">
        <span className="text-sm font-bold text-ink">{title}</span>
        {unit && <span className="text-xs text-ink-tertiary font-mono">{unit}</span>}
      </figcaption>

      <svg
        viewBox="0 0 1000 116"
        className="w-full h-auto"
        role="img"
        aria-label={`${title}${unit ? ` (${unit})` : ""}. Zones: ${ariaZones}${ariaMarker}`}
      >
        <title>{`${title} reference ranges`}</title>

        {/* Track background */}
        <rect x="0" y="44" width={W} height="34" rx="17" className="fill-surface-raised" />

        {/* Zones (clipped to the rounded track) */}
        <clipPath id={`clip-${slug(title)}`}>
          <rect x="0" y="44" width={W} height="34" rx="17" />
        </clipPath>
        <g clipPath={`url(#clip-${slug(title)})`}>
          {zones.map((z, i) => (
            <g key={i}>
              <rect x={x(z.from)} y="44" width={x(z.to) - x(z.from)} height="34" className={tone[z.tone].soft} />
              <rect x={x(z.from)} y="72" width={x(z.to) - x(z.from)} height="6" className={tone[z.tone].fill} />
            </g>
          ))}
        </g>

        {/* Boundary ticks + numbers */}
        {bounds.map((b, i) => (
          <g key={i}>
            <line x1={x(b)} y1="40" x2={x(b)} y2="82" className="stroke-surface-border" strokeWidth="2" />
            <text x={x(b)} y="100" textAnchor="middle" className="fill-ink-tertiary" fontSize="20">
              {fmt(b)}
            </text>
          </g>
        ))}
        {/* Min / max end labels */}
        <text x="2" y="100" textAnchor="start" className="fill-ink-tertiary" fontSize="20">{fmt(min)}</text>
        <text x={W - 2} y="100" textAnchor="end" className="fill-ink-tertiary" fontSize="20">{fmt(max)}</text>

        {/* Marker (optional) */}
        {marker && (
          <g>
            <line x1={x(marker.value)} y1="34" x2={x(marker.value)} y2="78" className="stroke-ink" strokeWidth="3" />
            <path
              d={`M ${x(marker.value) - 9} 30 L ${x(marker.value) + 9} 30 L ${x(marker.value)} 42 Z`}
              className="fill-ink"
            />
            <text
              x={clampLabelX(x(marker.value), W)}
              y="22"
              textAnchor="middle"
              className="fill-ink"
              fontSize="22"
              fontWeight="700"
            >
              {marker.label ? `${marker.label}: ${fmt(marker.value)}` : fmt(marker.value)}
            </text>
          </g>
        )}
      </svg>

      {/* Legend — real DOM text so zone names stay responsive + selectable */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {zones.map((z, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className={`w-2.5 h-2.5 rounded-sm ${tone[z.tone].dot}`} aria-hidden />
            {z.label}
            <span className="text-ink-tertiary">
              ({fmt(z.from)}–{fmt(z.to)})
            </span>
          </span>
        ))}
      </div>

      {caption && <figcaption className="mt-2 text-xs text-ink-tertiary leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US");
  return String(n);
}

// Keep the marker label from overflowing the SVG edges.
function clampLabelX(px: number, W: number): number {
  return Math.max(120, Math.min(W - 120, px));
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
