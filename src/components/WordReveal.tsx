import React from "react";

/**
 * Splits a string into words that flow in (rise + blur) with a staggered delay.
 * Pure CSS animation (see `.word-reveal .w` in globals.css) — no JS, SSR-safe,
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
          <span
            className={`w ${wordClassName}`}
            style={{ ["--i" as string]: startIndex + i }}
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </span>
  );
}
