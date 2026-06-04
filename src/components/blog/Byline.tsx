import type { Author, Reviewer } from "@/lib/blog";
import { formatDate } from "@/lib/blog";

interface Props {
  author?: Author;
  reviewer?: Reviewer;
  lastReviewed?: string;
}

// A field is a scaffold placeholder if it's empty or marked TODO. We never
// render a fabricated clinician name — placeholders show a "pending" state.
const isPending = (v?: string) => !v || /todo|pending|\[.*\]/i.test(v);

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/**
 * Byline — E-E-A-T trust block: who wrote it, who medically reviewed it, and
 * when it was last reviewed. Reviewer placeholders render an honest "Medical
 * review pending" chip rather than an invented name.
 */
export default function Byline({ author, reviewer, lastReviewed }: Props) {
  const hasAuthor = author && !isPending(author.name);
  const hasReviewer = reviewer && !isPending(reviewer.name);

  if (!hasAuthor && !hasReviewer && !lastReviewed) return null;

  return (
    <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-surface-border bg-surface-raised/60 px-5 py-4">
      {hasAuthor && (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-indigo text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials(author!.name)}
          </span>
          <span className="leading-tight">
            <span className="block text-[11px] text-ink-tertiary uppercase tracking-wider">Written by</span>
            <span className="block text-sm font-semibold text-ink">{author!.name}</span>
            {author!.role && <span className="block text-xs text-ink-tertiary">{author!.role}</span>}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500 flex-shrink-0" aria-hidden>
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="leading-tight">
          {hasReviewer ? (
            <>
              <span className="block text-[11px] text-ink-tertiary uppercase tracking-wider">Medically reviewed by</span>
              <span className="block text-sm font-semibold text-ink">
                {reviewer!.name}
                {reviewer!.credential && <span className="text-ink-secondary font-medium">, {reviewer!.credential}</span>}
              </span>
            </>
          ) : (
            <>
              <span className="block text-[11px] text-ink-tertiary uppercase tracking-wider">Medical review</span>
              <span className="block text-sm font-semibold text-ink-secondary">Review pending</span>
            </>
          )}
        </span>
      </div>

      {lastReviewed && (
        <div className="flex items-center gap-2 text-xs text-ink-tertiary">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          {hasReviewer ? "Last reviewed" : "Last updated"} {formatDate(lastReviewed)}
        </div>
      )}
    </div>
  );
}
