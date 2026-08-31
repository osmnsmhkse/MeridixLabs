"use client";

/* ════════════════════════════════════════════════════════════════════════
   Meridix — Simple / Medium / Expert depth toggle
   ────────────────────────────────────────────────────────────────────────
   Nine hand-rolled copies of this control existed across seven routes, with
   five different button treatments and heights of 32px, 36px and 44px. Only
   the 44px ones met the touch-target minimum, and nothing kept them in sync.

   One component now owns the structure, the semantics (a radiogroup — these
   buttons choose one reading level, they are not links or tabs) and the
   mobile presentation. Each caller passes the classes its desktop already
   uses, so >=sm keeps its existing look byte for byte while below sm every
   route collapses to the same full-width, >=44pt segmented control. The
   mobile rules live in globals.css (`.depth-toggle`), where a later,
   media-scoped block reliably beats the callers' Tailwind utilities —
   interleaving them in one class string would leave precedence to chance.

   Icons and hints are deliberately dropped below sm: they consume the
   horizontal room that long labels need. "Expert" is 6 characters in
   English but "Экспертный" is 10 and "Yapay Zekaya Sor"-length strings turn
   up in these slots across the nine locales.
   ════════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from "react";

export type DepthOption<T extends string> = {
  key: T;
  label: string;
  /** Audience hint. Shown only at sm and up — it never fits below. */
  hint?: string;
  /** Decorative; hidden below sm. */
  icon?: ReactNode;
  /** Overrides `chrome.active` for this option (only /app's Expert tier differs). */
  activeClass?: string;
};

export type DepthChrome = {
  /** Extra classes on the button row at sm and up. */
  row?: string;
  /** Base button classes at sm and up. */
  button: string;
  /** Selected-state classes at sm and up. */
  active: string;
  /** Unselected-state classes at sm and up. */
  inactive: string;
};

export function DepthToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  chrome,
  hintStyle = "inline",
}: {
  options: DepthOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  chrome: DepthChrome;
  /** "inline" puts the hint beside the label, "block" on its own line. */
  hintStyle?: "inline" | "block";
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`depth-toggle flex ${chrome.row ?? ""}`}>
      {options.map((opt) => {
        const isActive = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.key)}
            className={`depth-toggle__opt ${chrome.button} ${
              isActive ? (opt.activeClass ?? chrome.active) : chrome.inactive
            }`}
          >
            {opt.icon}
            <span className="depth-toggle__label">{opt.label}</span>
            {opt.hint && isActive && hintStyle === "inline" && (
              <span className="hidden sm:inline-block text-xs font-normal opacity-50 ms-0.5">
                — {opt.hint}
              </span>
            )}
            {opt.hint && hintStyle === "block" && (
              <span className="hidden sm:block text-[10px] font-normal opacity-70 mt-0.5">
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
