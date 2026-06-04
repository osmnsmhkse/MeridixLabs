import type { Reference } from "@/lib/blog";

interface Props {
  items: Reference[];
}

/**
 * References — authoritative, verifiable sources for the article's claims.
 * Outbound links to guideline bodies (AASLD, ADA, USPSTF, KDIGO, NICE, etc.)
 * strengthen E-E-A-T. Never populate with fabricated citations.
 */
export default function References({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section aria-labelledby="references-heading" className="mt-12 pt-8 border-t border-surface-border">
      <h2 id="references-heading" className="text-xs font-bold uppercase tracking-widest text-ink-tertiary mb-4">
        References &amp; sources
      </h2>
      <ol className="space-y-2.5">
        {items.map((ref, i) => (
          <li key={i} className="flex gap-3 text-sm text-ink-secondary leading-relaxed">
            <span className="text-ink-tertiary font-mono text-xs tabular-nums mt-0.5">{i + 1}.</span>
            <span>
              {ref.source && <span className="font-semibold text-ink">{ref.source}. </span>}
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-blue hover:underline underline-offset-2"
              >
                {ref.label}
              </a>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
