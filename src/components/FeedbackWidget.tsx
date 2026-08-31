"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import { useFloatingDock } from "@/components/FloatingDock";

type FeedbackCategory =
  | "General"
  | "Lab Analyzer"
  | "Symptom Checker"
  | "Diagnosis Explainer"
  | "Imaging Explainer"
  | "Medication Companion"
  | "Doctor's Visit Companion"
  | "Bug Report"
  | "Feature Request";

const CATEGORIES: FeedbackCategory[] = [
  "General",
  "Lab Analyzer",
  "Symptom Checker",
  "Diagnosis Explainer",
  "Imaging Explainer",
  "Medication Companion",
  "Doctor's Visit Companion",
  "Bug Report",
  "Feature Request",
];

const MAX_MESSAGE = 1000;

function categoryFromPath(pathname: string): FeedbackCategory {
  if (pathname.startsWith("/app")) return "Lab Analyzer";
  if (pathname.startsWith("/symptom")) return "Symptom Checker";
  if (pathname.startsWith("/diagnosed")) return "Diagnosis Explainer";
  if (pathname.startsWith("/imaging")) return "Imaging Explainer";
  if (pathname.startsWith("/medications")) return "Medication Companion";
  if (pathname.startsWith("/visit")) return "Doctor's Visit Companion";
  return "General";
}

export default function FeedbackWidget() {
  // Open state lives in the dock so the launcher and this panel can sit in
  // different components. Shaped as [isOpen, setIsOpen] so every call site below
  // is unchanged.
  const { panel, setPanel, triggerRef } = useFloatingDock();
  const isOpen = panel === "feedback";
  const setIsOpen = useCallback(
    (v: boolean) => setPanel(v ? "feedback" : null),
    [setPanel],
  );
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>("General");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Auto-select category from pathname when the panel opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setCategory(categoryFromPath(window.location.pathname));
    }
  }, [isOpen]);

  // Close on Escape, basic focus management
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const reset = () => {
    setRating(0);
    setHoverRating(0);
    setMessage("");
    setEmail("");
    setError(null);
  };

  const close = () => {
    setIsOpen(false);
    // Give the close animation a beat before resetting state
    setTimeout(() => {
      setIsSubmitted(false);
      reset();
    }, 200);
    // Return focus to the trigger
    triggerRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) return;
    if (message.length > MAX_MESSAGE) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          page: typeof window !== "undefined" ? window.location.pathname : "",
          timestamp: new Date().toISOString(),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      });

      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Failed to submit feedback");
      }

      setIsSubmitted(true);
      setTimeout(close, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = rating >= 1 && rating <= 5 && !isSubmitting;
  const displayRating = hoverRating || rating;
  const charCount = message.length;

  return (
    <>
      {/* Trigger lives in FloatingDock; this component owns the panel only. */}

      {/* Modal / Bottom sheet */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close feedback"
            onClick={close}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
          />

          {/* Panel */}
          <div
            ref={dialogRef}
            className={[
              "relative w-full sm:max-w-md",
              "bg-surface text-ink",
              "border border-surface-border",
              "rounded-t-2xl sm:rounded-2xl",
              "shadow-float",
              "p-6 sm:p-7",
              "animate-slide-up",
              "max-h-[92vh] overflow-y-auto",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="feedback-title" className="text-lg font-bold tracking-tight">
                  How are we doing?
                </h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  Your feedback helps us build better tools.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-2 -mt-2 rounded-full p-2 text-ink-tertiary hover:bg-surface-raised hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isSubmitted ? (
              <div className="mt-8 mb-2 flex flex-col items-center text-center animate-fade-in">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue">
                  <Star className="h-6 w-6 fill-current" />
                </div>
                <p className="mt-4 text-base font-semibold">Thank you!</p>
                <p className="mt-1 text-sm text-ink-secondary">
                  Your feedback helps us build better tools.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                {/* Star rating */}
                <div>
                  <label className="block text-sm font-medium text-ink">Rating</label>
                  <div
                    className="mt-2 flex items-center gap-1"
                    role="radiogroup"
                    aria-label="Rate your experience from 1 to 5 stars"
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = n <= displayRating;
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={rating === n}
                          aria-label={`${n} star${n === 1 ? "" : "s"}`}
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHoverRating(n)}
                          onFocus={() => setHoverRating(n)}
                          onBlur={() => setHoverRating(0)}
                          className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                        >
                          <Star
                            className={[
                              "h-8 w-8 transition-colors",
                              active
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-transparent text-ink-tertiary",
                            ].join(" ")}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="feedback-category"
                    className="block text-sm font-medium text-ink"
                  >
                    Category
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    className="mt-1.5 block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="feedback-message"
                    className="flex items-center justify-between text-sm font-medium text-ink"
                  >
                    <span>Message</span>
                    <span
                      className={[
                        "text-xs font-normal",
                        charCount > MAX_MESSAGE
                          ? "text-red-500"
                          : "text-ink-tertiary",
                      ].join(" ")}
                    >
                      {charCount}/{MAX_MESSAGE}
                    </span>
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                    placeholder="Tell us what's working, what's confusing, or what you wish we had..."
                    rows={4}
                    maxLength={MAX_MESSAGE}
                    className="mt-1.5 block w-full resize-none rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="feedback-email"
                    className="block text-sm font-medium text-ink"
                  >
                    Email <span className="text-ink-tertiary font-normal">(optional)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com (optional — only if you want a reply)"
                    className="mt-1.5 block w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-ink placeholder:text-ink-tertiary focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={[
                    "w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    "bg-gradient-brand text-white shadow-glow-blue",
                    "hover:brightness-105",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  ].join(" ")}
                >
                  {isSubmitting ? "Sending..." : "Send feedback"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
