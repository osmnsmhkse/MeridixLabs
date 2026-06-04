import type { Tone } from "@/lib/blog";

/**
 * One palette for every data-driven blog visual. Colours are fixed Tailwind
 * hues (emerald / sky / amber / rose / brand-blue) that read correctly in both
 * light and dark themes; surrounding text uses the `ink`/`surface` CSS-variable
 * tokens so it flips automatically with the theme.
 */
export const tone = {
  normal: {
    fill: "fill-emerald-500",
    soft: "fill-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  low: {
    fill: "fill-sky-500",
    soft: "fill-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    dot: "bg-sky-500",
  },
  caution: {
    fill: "fill-amber-500",
    soft: "fill-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  danger: {
    fill: "fill-rose-500",
    soft: "fill-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    dot: "bg-rose-500",
  },
  info: {
    fill: "fill-brand-blue",
    soft: "fill-brand-blue/15",
    text: "text-brand-blue",
    bg: "bg-brand-blue/10",
    border: "border-brand-blue/30",
    dot: "bg-brand-blue",
  },
} as const satisfies Record<Tone, Record<string, string>>;
