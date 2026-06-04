import type { FaqItem } from "@/lib/blog";

interface Props {
  items: FaqItem[];
}

/**
 * ArticleFAQ — patient questions rendered as native <details> accordions
 * (accessible, server-rendered, JS-free). The same `faq` data also feeds the
 * FAQPage JSON-LD in BlogJsonLd, so the answer text stays in sync.
 */
export default function ArticleFAQ({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section aria-labelledby="faq-heading" className="mt-14 pt-10 border-t border-surface-border">
      <h2 id="faq-heading" className="text-2xl font-extrabold text-ink tracking-tight mb-5">
        Frequently asked questions
      </h2>

      <div className="space-y-3">
        {items.map((item, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-surface-border bg-surface-raised/50 px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] font-semibold text-ink">
              {item.q}
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-ink-tertiary flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden>
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </summary>
            <p className="mt-3 text-sm text-ink-secondary leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
