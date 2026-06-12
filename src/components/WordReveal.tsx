import React from "react";

/**
 * Splits a string into words that rise out of overflow-hidden mask slots
 * with a staggered delay — the editorial "masked line reveal".
 * Pure CSS animation (see `.word-reveal` in globals.css) — no JS, SSR-safe,
 * text stays in the DOM for SEO. Respects prefers-reduced-motion.
 */
export default function WordReveal({
  text,
  className = "",
  wordClassName = "",
  startIndex = 0,
  base = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  startIndex?: number;
  base?: number;
}) {
  const words = text.split(" ");
  return (
    <span
      className={`word-reveal ${className}`}
      style={{ ["--base" as string]: `${base}s` }}
    >
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="wm">
            <span
              className={`w ${wordClassName}`}
              style={{ ["--i" as string]: startIndex + i }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </span>
  );
}
