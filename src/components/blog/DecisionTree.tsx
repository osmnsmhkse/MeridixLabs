import type { Tone } from "@/lib/blog";
import { tone } from "./tone";

interface Props {
  title?: string;
  branches: { if: string; then: string; tone: Tone }[];
  caption?: string;
}

const VERDICT: Record<Tone, string> = {
  normal: "Watch",
  low: "Note",
  info: "Discuss",
  caution: "Evaluate",
  danger: "Act promptly",
};

/**
 * DecisionTree — a "when to worry vs watch" triage flow. Each branch pairs a
 * scenario with the suggested action, colour-coded by urgency. Rendered as a
 * semantic list so it stays accessible and indexable (not text-in-an-image).
 */
export default function DecisionTree({ title, branches, caption }: Props) {
  return (
    <figure className="my-8">
      {title && <figcaption className="text-sm font-bold text-ink mb-3">{title}</figcaption>}

      <ul className="space-y-2.5">
        {branches.map((b, i) => {
          const t = tone[b.tone];
          return (
            <li
              key={i}
              className={`relative rounded-2xl border ${t.border} ${t.bg} p-4 sm:flex sm:items-center sm:gap-4`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-0.5">If</p>
                <p className="text-sm text-ink leading-relaxed">{b.if}</p>
              </div>

              <svg viewBox="0 0 24 24" className="hidden sm:block w-5 h-5 text-ink-tertiary flex-shrink-0" fill="none" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="mt-2.5 sm:mt-0 sm:w-[46%] sm:flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${t.text} mb-0.5`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} aria-hidden />
                  {VERDICT[b.tone]}
                </span>
                <p className="text-sm text-ink-secondary leading-relaxed">{b.then}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {caption && <figcaption className="mt-3 text-xs text-ink-tertiary leading-relaxed">{caption}</figcaption>}
    </figure>
  );
}
