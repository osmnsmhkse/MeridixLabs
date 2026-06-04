interface Props {
  items: string[];
}

/**
 * KeyTakeaways — a scannable summary box pinned near the top of an article.
 * Helps readers (and answer-engine snippets) grab the essentials fast.
 */
export default function KeyTakeaways({ items }: Props) {
  if (!items?.length) return null;

  return (
    <aside
      aria-label="Key takeaways"
      className="my-8 rounded-2xl border border-brand-blue/20 bg-brand-blue-light dark:bg-brand-blue/[0.07] p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-3.5">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue" aria-hidden>
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <h2 className="text-xs font-bold uppercase tracking-widest text-brand-blue m-0">Key takeaways</h2>
      </div>

      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink-secondary leading-relaxed">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mt-0.5 text-brand-blue flex-shrink-0" aria-hidden>
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
