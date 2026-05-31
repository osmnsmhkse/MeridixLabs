"use client";

// LandingChatWidget
// ─────────────────────────────────────────────────────────────────────────────
// Floating round chat button shown globally on every page.
// Tap → opens a drawer with a general Meridix assistant (no result context).
// Streams replies from /api/chat using toolName "Meridix General".

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ClipboardList,
  FlaskConical,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import {
  Bubble,
  MeridixMark,
  ThinkingBubble,
  type Msg,
} from "@/components/ChatComponents";

// ── Referral parsing ─────────────────────────────────────────────────────────
// The system prompt asks the model to append a <referral>{json}</referral>
// block at the end of every reply. We strip it from the visible text and use
// the structured payload to render an inline CTA card under the message.

type ReferralSlug =
  | "lab-analyzer"
  | "symptom-checker"
  | "diagnosis-explainer"
  | "trend-tracker";

interface Referral {
  tool: ReferralSlug;
  reason: string;
}

interface ToolMeta {
  label: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TOOL_META: Record<ReferralSlug, ToolMeta> = {
  "lab-analyzer": { label: "Lab Analyzer", href: "/app", Icon: FlaskConical },
  "symptom-checker": { label: "Symptom Checker", href: "/symptom", Icon: Stethoscope },
  "diagnosis-explainer": { label: "Diagnosis Explainer", href: "/diagnosed", Icon: ClipboardList },
  "trend-tracker": { label: "Trend Tracker", href: "/trends", Icon: TrendingUp },
};

function parseReferral(raw: string): { text: string; referral: Referral | null } {
  const full = raw.match(/<referral>([\s\S]*?)<\/referral>/i);
  if (full && typeof full.index === "number") {
    let referral: Referral | null = null;
    try {
      const obj = JSON.parse(full[1].trim());
      if (
        obj &&
        typeof obj === "object" &&
        typeof obj.tool === "string" &&
        obj.tool in TOOL_META
      ) {
        referral = {
          tool: obj.tool as ReferralSlug,
          reason: typeof obj.reason === "string" ? obj.reason : "",
        };
      }
    } catch {
      /* malformed JSON — drop the referral but still strip the tags */
    }
    const cleaned = (raw.slice(0, full.index) + raw.slice(full.index + full[0].length)).trim();
    return { text: cleaned, referral };
  }
  // During streaming, hide the partial opening tag from the visible text.
  const partial = raw.indexOf("<referral");
  if (partial !== -1) {
    return { text: raw.slice(0, partial).trim(), referral: null };
  }
  return { text: raw, referral: null };
}

function ReferralCard({ referral }: { referral: Referral }) {
  const tool = TOOL_META[referral.tool];
  const Icon = tool.Icon;
  return (
    <Link
      href={tool.href}
      className="ml-11 block rounded-2xl border border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-brand-indigo/5 hover:from-brand-blue/10 hover:to-brand-indigo/10 transition-colors p-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink leading-tight">
            This sounds like a job for the {tool.label}
          </p>
          {referral.reason && (
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
              {referral.reason}
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue transition-all group-hover:gap-2">
            Try it now
            <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function LandingChatWidget() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // Stop attention pulse after 3s
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText, pending]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [input]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || pending) return;

      const next: Msg[] = [...messages, { role: "user", content: text }];
      setMessages(next);
      setInput("");
      setError(null);
      setPending(true);
      setStreamingText("");

      abortRef.current = new AbortController();

      try {
        const r = await fetch("/api/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            messages: next,
            toolName: "Meridix General",
            toolContext: null,
          }),
        });

        if (!r.ok || !r.body) {
          const detail = await r.text().catch(() => "");
          throw new Error(detail || `Request failed (${r.status})`);
        }

        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          setStreamingText(buffer);
        }
        buffer += decoder.decode();

        setMessages([
          ...next,
          { role: "assistant", content: buffer.trim() || "(no response)" },
        ]);
        setStreamingText("");
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setMessages((m) => m.slice(0, -1));
        } else {
          setError(e instanceof Error ? e.message : "Network error");
          setMessages((m) => m.slice(0, -1));
        }
        setStreamingText("");
      } finally {
        setPending(false);
        abortRef.current = null;
      }
    },
    [input, pending, messages],
  );

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const conversationStarted = messages.length > 0;
  const hasInput = input.trim().length > 0;

  const suggestions = useMemo(
    () => [
      "What does Meridix do?",
      "Which tool should I use?",
      "How is my data handled?",
    ],
    [],
  );

  return (
    <>
      {/* Floating round trigger */}
      {!open && (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Meridix Assistant"
          aria-haspopup="dialog"
          className={[
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            "bg-gradient-brand text-white",
            "shadow-glow-blue hover:shadow-card-hover",
            "flex items-center justify-center",
            "transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            pulse ? "animate-pulse-glow" : "",
          ].join(" ")}
        >
          <MeridixMark className="w-6 h-6" />
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="landing-chat-title"
          className="fixed inset-0 z-[60] flex items-end justify-end sm:items-end sm:justify-end"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close chat"
            onClick={close}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
          />

          {/* Panel */}
          <div
            className={[
              "relative w-full sm:w-[400px]",
              "h-[94vh] sm:h-[calc(100vh-3rem)] sm:max-h-[900px]",
              "sm:mb-6 sm:mr-6",
              "bg-surface text-ink",
              "border border-surface-border",
              "rounded-t-2xl sm:rounded-2xl",
              "shadow-float",
              "flex flex-col overflow-hidden",
              "animate-slide-up",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-surface-border/70 bg-gradient-to-r from-brand-blue/5 via-brand-indigo/3 to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0">
                  <MeridixMark className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p id="landing-chat-title" className="text-sm font-bold text-ink leading-none truncate">
                    Meridix Assistant
                  </p>
                  <p className="text-[11px] text-ink-tertiary leading-tight mt-1 truncate">
                    Ask anything about Meridix
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
              {!conversationStarted ? (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/15 px-4 py-3">
                    <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider mb-1">Meridix AI</p>
                    <p className="text-sm text-ink leading-relaxed">
                      Hi! I&apos;m the Meridix assistant. Ask me about what Meridix does, which tool fits your question, or any general health literacy topic.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void send(s)}
                        className="text-left text-sm px-3 py-2 rounded-lg border border-surface-border bg-surface-raised hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((m, i) => {
                    if (m.role !== "assistant" || typeof m.content !== "string") {
                      return <Bubble key={i} message={m} />;
                    }
                    const { text, referral } = parseReferral(m.content);
                    return (
                      <div key={i} className="space-y-3">
                        <Bubble message={{ role: "assistant", content: text }} />
                        {referral && <ReferralCard referral={referral} />}
                      </div>
                    );
                  })}
                  {pending && streamingText && (() => {
                    const { text, referral } = parseReferral(streamingText);
                    return (
                      <div className="space-y-3">
                        <Bubble message={{ role: "assistant", content: text }} />
                        {referral && <ReferralCard referral={referral} />}
                      </div>
                    );
                  })()}
                  {pending && !streamingText && <ThinkingBubble />}
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-surface-border/70 bg-gradient-to-b from-transparent to-surface-raised/30 px-3 py-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className={`relative rounded-2xl border bg-white dark:bg-slate-950 transition-all shadow-sm ${
                  hasInput || pending ? "border-brand-blue/50" : "border-surface-border"
                } focus-within:border-brand-blue/70 focus-within:ring-1 focus-within:ring-brand-blue/30`}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Ask about Meridix or a health topic…"
                  rows={1}
                  disabled={pending}
                  className="block w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-sm text-ink placeholder-ink-tertiary outline-none max-h-[140px]"
                />
                <div className="flex items-center justify-end gap-2 px-2 pb-2">
                  {pending ? (
                    <button
                      type="button"
                      onClick={cancelPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink/90 hover:bg-ink text-white text-xs font-bold transition-colors"
                    >
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
                        <rect x="2" y="2" width="8" height="8" rx="1" />
                      </svg>
                      Stop
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!hasInput}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        hasInput
                          ? "bg-brand-blue hover:bg-brand-blue-hover text-white shadow-sm"
                          : "bg-surface-raised text-ink-tertiary cursor-not-allowed"
                      }`}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M8 14V2M3 7l5-5 5 5" />
                      </svg>
                      Send
                    </button>
                  )}
                </div>
              </form>
              <p className="mt-2 text-[10px] text-ink-tertiary text-center">
                Educational only — not medical advice.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
