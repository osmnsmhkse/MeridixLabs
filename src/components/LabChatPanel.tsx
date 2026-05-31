"use client";

// LabChatPanel
// ───────────────────────────────────────────────────────────────────
// Chat panel rendered below the Lab Analyzer interpretation. Streams
// responses from /api/lab-chat, which is grounded in this specific
// analysis + the user's selected depth tier (simple/medium/expert).
//
// Persistence:
//   • Signed-in user with a saved analysis ID  → /api/lab-chat-history
//     loads previous messages; new messages are saved server-side by
//     the chat route after streaming completes.
//   • Everyone else  → localStorage keyed by a stable hash of the
//     analysis. Restored on mount, written after every assistant turn.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bubble,
  ThinkingBubble,
  MeridixMark,
  type Msg,
} from "@/components/ChatComponents";
import { suggestFollowUpQuestions } from "@/lib/labQuestions";
import { track } from "@/lib/track";
import { useTranslations, useLocale } from "next-intl";

type Tier = "simple" | "medium" | "expert";

interface AnalysisFlag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface AnalysisResult {
  simple: string;
  medium: string;
  expert: string;
  etiology?: string;
  mechanism?: string;
  diseases?: string;
  specialist?: string;
  action: string;
  flags: AnalysisFlag[];
  labs?: AnalysisFlag[];
  medication_context?: string;
  health_insights?: string;
  supplements?: string;
  overall_status?: "normal" | "amber" | "red";
  summary_headline?: string;
  urgency?: "routine" | "soon" | "weeks";
}

interface Props {
  result: AnalysisResult;
  tier: Tier;
  fileName: string;
  isSample: boolean;
  savedAnalysisId: string | null;
  isSignedIn: boolean;
}

// ── Stable hash of an analysis (anonymous localStorage key) ──────────
function hashAnalysis(r: AnalysisResult): string {
  const seed =
    (r.summary_headline ?? "") +
    (r.flags?.map((f) => `${f.marker}:${f.value}`).slice(0, 3).join("|") ?? "") +
    (r.simple ?? "").slice(0, 40);
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function localKeyFor(r: AnalysisResult): string {
  return `meridix_lab_chat_${hashAnalysis(r)}`;
}

function readLocalHistory(r: AnalysisResult): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKeyFor(r));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Msg[]) : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(r: AnalysisResult, messages: Msg[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(localKeyFor(r), JSON.stringify(messages));
  } catch {
    /* quota or disabled — ignore */
  }
}

// ── Component ────────────────────────────────────────────────────────
export default function LabChatPanel({
  result,
  tier,
  fileName,
  isSample,
  savedAnalysisId,
  isSignedIn,
}: Props) {
  const t = useTranslations("LabChat");
  const locale = useLocale();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const persistsServerSide = isSignedIn && Boolean(savedAnalysisId);

  // ── Load existing history on mount / when savedAnalysisId arrives ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (persistsServerSide && savedAnalysisId) {
        try {
          const r = await fetch(
            `/api/lab-chat-history?analysisId=${encodeURIComponent(savedAnalysisId)}`,
            { credentials: "include" },
          );
          if (r.ok) {
            const j = await r.json();
            if (!cancelled && Array.isArray(j.messages)) {
              setMessages(j.messages as Msg[]);
            }
          }
        } catch {
          // Fall through to localStorage so the user still sees something
          if (!cancelled) setMessages(readLocalHistory(result));
        } finally {
          if (!cancelled) setHistoryLoaded(true);
        }
      } else {
        if (!cancelled) {
          setMessages(readLocalHistory(result));
          setHistoryLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAnalysisId, persistsServerSide]);

  // ── Auto-scroll on new messages / streaming chunks ──
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText, pending]);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  // ── Generate suggested questions from flags ──
  const suggestions = useMemo(
    () => suggestFollowUpQuestions(result.flags ?? [], tier, locale),
    [result.flags, tier, locale],
  );

  // ── Send a message and stream the reply ──
  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || pending) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError(null);
    setPending(true);
    setStreamingText("");

    track("chat_message", { panel: "lab", tier });

    abortRef.current = new AbortController();

    try {
      const r = await fetch("/api/lab-chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: next,
          analysisContext: { result, tier, fileName, isSample },
          analysisId: persistsServerSide ? savedAnalysisId : null,
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
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        setStreamingText(buffer);
      }
      buffer += decoder.decode();
      setStreamingText(buffer);

      const finalMessages: Msg[] = [
        ...next,
        { role: "assistant", content: buffer.trim() || "(no response)" },
      ];
      setMessages(finalMessages);
      setStreamingText("");

      // Anonymous / unsaved → mirror to localStorage so a refresh restores it
      if (!persistsServerSide) {
        writeLocalHistory(result, finalMessages);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // Cancelled — drop the placeholder user msg so they can retry
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
  }

  function cancelPending() {
    abortRef.current?.abort();
  }

  function newChat() {
    if (pending) cancelPending();
    setMessages([]);
    setStreamingText("");
    setError(null);
    if (!persistsServerSide) {
      try {
        localStorage.removeItem(localKeyFor(result));
      } catch {
        /* noop */
      }
    }
  }

  const hasInput = input.trim().length > 0;
  const conversationStarted = messages.length > 0;

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm print:hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-border/70 bg-gradient-to-r from-brand-blue/5 via-brand-indigo/3 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0">
            <MeridixMark className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink leading-none">{t("panelTitle")}</p>
            <p className="text-[11px] text-ink-tertiary leading-tight mt-1">
              {t("panelSubtitle")} · {t(`${tier}Explanation`)}
              {isSample ? ` · ${t("sampleData")}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversationStarted && (
            <button
              onClick={newChat}
              className="text-xs font-semibold text-ink-secondary hover:text-brand-blue px-3 py-1.5 rounded-lg border border-surface-border hover:border-brand-blue transition-colors"
              title={t("clearChat")}
            >
              {t("clearChat")}
            </button>
          )}
        </div>
      </div>

      {/* ── Sign-in CTA for anonymous users ── */}
      {!isSignedIn && conversationStarted && (
        <div className="px-5 py-2.5 border-b border-surface-border/60 bg-amber-50 dark:bg-amber-900/20 flex items-center justify-between gap-3">
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
            Conversation saved locally on this device.{" "}
            <Link href="/sign-up" className="font-semibold underline underline-offset-2">
              Create a free account
            </Link>{" "}
            to keep it across devices.
          </p>
        </div>
      )}

      {/* ── Conversation area ── */}
      <div ref={scrollerRef} className="max-h-[70vh] min-h-[440px] overflow-y-auto px-5 py-5">
        {!conversationStarted ? (
          <EmptyState
            suggestions={suggestions}
            onSend={(q) => send(q)}
            historyLoaded={historyLoaded}
          />
        ) : (
          <div className="space-y-5">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
            {pending && streamingText && (
              <Bubble message={{ role: "assistant", content: streamingText }} />
            )}
            {pending && !streamingText && <ThinkingBubble />}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Composer ── */}
      <div className="border-t border-surface-border/70 bg-gradient-to-b from-transparent to-surface-raised/30 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className={`relative rounded-2xl border bg-white dark:bg-slate-950 transition-all shadow-sm ${
            hasInput || pending ? "border-brand-blue/50 shadow-brand-blue/5" : "border-surface-border"
          } focus-within:border-brand-blue/70 focus-within:ring-1 focus-within:ring-brand-blue/30`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("inputPlaceholder")}
            rows={1}
            disabled={pending}
            className="block w-full resize-none bg-transparent px-4 pt-3 pb-1.5 text-sm text-ink placeholder-ink-tertiary outline-none max-h-[160px]"
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="hidden sm:inline text-[10px] text-ink-tertiary pl-2">
              Enter to send · Shift+Enter for newline
            </span>
            <span className="sm:hidden" />
            {pending ? (
              <button
                type="button"
                onClick={cancelPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink/90 hover:bg-ink text-white text-xs font-bold transition-colors"
                title="Stop generating"
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
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}

// ── Empty state (suggested questions) ─────────────────────────────────
function EmptyState({
  suggestions,
  onSend,
  historyLoaded,
}: {
  suggestions: { label: string; question: string }[];
  onSend: (q: string) => void;
  historyLoaded: boolean;
}) {
  const t = useTranslations("LabChat");
  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-ink-secondary leading-relaxed">
          {t("chatIntro")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((s) => (
          <button
            key={s.question}
            onClick={() => onSend(s.question)}
            className="group text-left rounded-xl border border-surface-border bg-white dark:bg-slate-900 hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all px-3.5 py-2.5"
          >
            <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider mb-0.5">
              {s.label}
            </p>
            <p className="text-[13px] text-ink-secondary group-hover:text-ink leading-snug">
              {s.question}
            </p>
          </button>
        ))}
      </div>
      {!historyLoaded && (
        <p className="mt-4 text-[11px] text-ink-tertiary">{t("historyLoading")}</p>
      )}
    </div>
  );
}
