"use client";

// MedicationChatPanel
// ───────────────────────────────────────────────────────────────────
// Chat panel rendered alongside the Medication Companion analysis.
// Streams from /api/medication-chat, grounded in the parsed medication
// list, interactions, red flags, and the active depth tier.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bubble,
  ThinkingBubble,
  MeridixMark,
  type Msg,
} from "@/components/ChatComponents";
import { useTranslations } from "next-intl";

type Tier = "simple" | "medium" | "expert";

interface DepthBlock { simple: string; medium: string; expert: string }

interface ParsedMedication { name: string; dose?: string; frequency?: string; raw_input?: string }

interface SectionAMed {
  name: string;
  purpose: string;
  how_it_works: DepthBlock;
  dosing_context: DepthBlock;
  key_side_effects: string[];
  avoid: string[];
}

interface SectionBInteraction {
  between: [string, string];
  kind: "drug-drug" | "drug-food" | "drug-supplement";
  description: DepthBlock;
  severity: "minor" | "moderate" | "major";
}

interface SectionCRedFlag {
  medication: string;
  symptoms: string[];
  action: string;
}

export interface MedicationAnalysis {
  parsed_medications?: ParsedMedication[];
  uncertain_items?: string[];
  section_a_medications?: SectionAMed[];
  section_b_interactions?: SectionBInteraction[];
  section_b_clear?: boolean;
  section_c_red_flags?: SectionCRedFlag[];
  section_d_questions?: string[];
  section_e_lab_context?: DepthBlock | null;
}

interface Props {
  result: MedicationAnalysis;
  tier: Tier;
  language: string;
}

function hashAnalysis(r: MedicationAnalysis): string {
  const seed =
    (r.parsed_medications?.map((m) => m.name).join("|") ?? "") +
    "::" +
    (r.section_a_medications?.[0]?.purpose ?? "");
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function localKey(r: MedicationAnalysis): string {
  return `meridix_medication_chat_${hashAnalysis(r)}`;
}

function readLocal(r: MedicationAnalysis): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(localKey(r));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Msg[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(r: MedicationAnalysis, messages: Msg[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(localKey(r), JSON.stringify(messages));
  } catch {
    /* quota or disabled — ignore */
  }
}

type T = ReturnType<typeof useTranslations<"MedicationChat">>;

function buildSuggestions(r: MedicationAnalysis, t: T): { label: string; question: string }[] {
  const out: { label: string; question: string }[] = [];
  const meds = r.section_a_medications ?? [];
  const ix = r.section_b_interactions ?? [];
  const rf = r.section_c_red_flags ?? [];

  if (rf.length > 0) {
    out.push({
      label: t("suggestRedFlagLabel"),
      question: t("suggestRedFlagQ", { med: rf[0].medication }),
    });
  }
  if (ix.length > 0) {
    out.push({
      label: t("suggestInteractionLabel"),
      question: t("suggestInteractionQ", { a: ix[0].between[0], b: ix[0].between[1] }),
    });
  }
  if (meds.length > 0) {
    out.push({
      label: t("suggestSideEffectsLabel"),
      question: t("suggestSideEffectsQ", { med: meds[0].name }),
    });
  }
  out.push({
    label: t("suggestRoutineLabel"),
    question: t("suggestRoutineQ"),
  });
  return out.slice(0, 4);
}

export default function MedicationChatPanel({ result, tier, language }: Props) {
  const t = useTranslations("MedicationChat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(readLocal(result));
    setHistoryLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText, pending]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const suggestions = useMemo(() => buildSuggestions(result, t), [result, t]);

  async function send(textOverride?: string) {
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
      const r = await fetch("/api/medication-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: next,
          analysisContext: { result, tier, language },
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
      setStreamingText(buffer);

      const finalMessages: Msg[] = [
        ...next,
        { role: "assistant", content: buffer.trim() || "(no response)" },
      ];
      setMessages(finalMessages);
      setStreamingText("");
      writeLocal(result, finalMessages);
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
  }

  function cancelPending() {
    abortRef.current?.abort();
  }

  function newChat() {
    if (pending) cancelPending();
    setMessages([]);
    setStreamingText("");
    setError(null);
    try {
      localStorage.removeItem(localKey(result));
    } catch {
      /* noop */
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

      {/* ── Conversation area ── */}
      <div ref={scrollerRef} className="max-h-[70vh] min-h-[440px] overflow-y-auto px-5 py-5">
        {!conversationStarted ? (
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
                  onClick={() => send(s.question)}
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
              {t("enterToSend")}
            </span>
            <span className="sm:hidden" />
            {pending ? (
              <button
                type="button"
                onClick={cancelPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink/90 hover:bg-ink text-white text-xs font-bold transition-colors"
                title={t("stop")}
              >
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="currentColor">
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                </svg>
                {t("stop")}
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
                {t("send")}
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
