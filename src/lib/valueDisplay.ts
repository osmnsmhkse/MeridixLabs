/* ════════════════════════════════════════════════════════════════════════
   Meridix — result value typing
   ────────────────────────────────────────────────────────────────────────
   Report values arrive as free-form strings. Some are compact numerics
   ("31", "1.28", "<4", "120/80") that belong in the large tabular display
   treatment; others are clinical prose ("Global hypokinesis", "Hypoperfusion
   (fixed, delta extent <5%)") that must read as a sentence.

   Rendering prose at the numeric display size is the visibly broken failure
   — a 36-character finding became five lines of 24px extrabold type with
   leading-none. Rendering a number at body size is merely plain. So when the
   classifier is unsure it answers "not tabular", biasing toward the mild
   failure.

   Presentation only: nothing here influences interpretation, flagging or
   reference-range logic.
   ════════════════════════════════════════════════════════════════════════ */

/* A compact numeric reading, allowing:
   - an optional comparator or approximator  (<4, ≥60, ~7)
   - an optional sign                        (-2.5)
   - thousands separators                    (1,234 / 1 234)
   - a decimal part in either convention     (1.28 / 1,28)
   - one paired reading                      (120/80)
   Deliberately rejects anything carrying letters, so an inline unit
   ("5.5 mmol/L") falls through to the prose treatment. */
const TABULAR_RE =
  /^[<>≤≥~≈]?\s*[+-]?\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d+)?(?:\s*\/\s*[+-]?\d+(?:[.,]\d+)?)?$/;

/** Longest string still treated as a compact reading. */
const MAX_TABULAR_LEN = 12;

/**
 * True when `value` should keep the large tabular-numeral display treatment.
 * False for clinical prose, which should render at body size with normal
 * line-height and full wrapping.
 */
export function isTabularValue(value: string | number | null | undefined): boolean {
  if (value == null) return false;
  if (typeof value === "number") return Number.isFinite(value);
  const v = value.trim();
  if (!v || v.length > MAX_TABULAR_LEN) return false;
  return TABULAR_RE.test(v);
}
