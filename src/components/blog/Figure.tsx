interface Props {
  title?: string;
  variant: "flow";
  nodes: { label: string; sub?: string }[];
  caption?: string;
}

/**
 * Figure — a reusable left-to-right process / physiology flow (e.g. RBC
 * breakdown → bilirubin → liver → bile, or TRH → TSH → T4/T3). Boxes are real
 * DOM text; chevrons are inline SVG. Stacks vertically on mobile. Theme-aware.
 */
export default function Figure({ title, variant, nodes, caption }: Props) {
  if (variant !== "flow") return null;

  return (
    <figure className="my-8" role="group" aria-label={title ?? "Process diagram"}>
      {title && <figcaption className="text-sm font-bold text-ink mb-3">{title}</figcaption>}

      <ol className="flex flex-col sm:flex-row sm:items-stretch gap-2 list-none m-0 p-0">
        {nodes.map((n, i) => (
          <li key={i} className="flex flex-col sm:flex-row sm:items-stretch sm:flex-1 gap-2 min-w-0">
            <div className="flex-1 rounded-xl border border-surface-border bg-surface-raised px-3 py-3 text-center flex flex-col items-center justify-center min-w-0">
              <span className="text-[13px] font-semibold text-ink leading-snug">{n.label}</span>
              {n.sub && <span className="mt-0.5 text-[11px] text-ink-tertiary leading-snug">{n.sub}</span>}
            </div>

            {i < nodes.length - 1 && (
              <div className="flex items-center justify-center text-brand-blue flex-shrink-0" aria-hidden>
                {/* Down chevron on mobile, right chevron on desktop */}
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:hidden" fill="none">
                  <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <svg viewBox="0 0 24 24" className="hidden sm:block w-5 h-5" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </li>
        ))}
      </ol>

      {caption && <figcaption className="mt-3 text-xs text-ink-tertiary leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}
