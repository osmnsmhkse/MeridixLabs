interface Heading {
  id: string;
  text: string;
}
interface Props {
  headings: Heading[];
}

/**
 * TableOfContents — an "On this page" jump card built from the article's H2s.
 * Plain anchor links keep it fully server-rendered, indexable, and JS-free.
 * Collapsible on small screens via native <details>.
 */
export default function TableOfContents({ headings }: Props) {
  if (headings.length < 3) return null;

  return (
    <details
      open
      className="group my-8 rounded-2xl border border-surface-border bg-surface-raised/60 p-5 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ink-tertiary">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
          On this page
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-tertiary transition-transform group-open:rotate-180" aria-hidden>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </summary>

      <nav aria-label="Table of contents" className="mt-4">
        <ol className="space-y-1.5">
          {headings.map((h, i) => (
            <li key={h.id} className="flex items-baseline gap-2.5">
              <span className="text-[11px] font-mono text-ink-tertiary tabular-nums mt-px">
                {String(i + 1).padStart(2, "0")}
              </span>
              <a
                href={`#${h.id}`}
                className="text-sm text-ink-secondary hover:text-brand-blue transition-colors leading-snug"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}
