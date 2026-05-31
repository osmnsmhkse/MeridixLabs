"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bubble,
  ThinkingBubble,
  MeridixMark,
  type Msg,
} from "@/components/ChatComponents";
import { useTranslations } from "next-intl";

interface Props {
  inputSummary: string;
  analysisSnapshot: string;
  tier: "simple" | "medium" | "expert";
  language: string;
}

const SUGGESTED_QUESTIONS_KEYS = [
  "chatQ1",
  "chatQ2",
  "chatQ3",
  "chatQ4",
] as const;

export default function PediatricChatPanel({
  inputSummary,
  analysisSnapshot,
  tier,
  language,
}: Props) {
  const t = useTranslations("Pediatric");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      const r = await fetch("/api/pediatric-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: next,
          inputSummary,
          analysisSnapshot,
          tier,
          language,
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
  }

  const hasInput = input.trim().length > 0;
  const conversationStarted = messages.length > 0;

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-border/70 bg-gradient-to-r from-rose-500/5 via-rose-400/3 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center flex-shrink-0">
            <MeridixMark className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink leading-none">
              {t("chatTitle")}
            </p>
            <p className="text-[11px] text-ink-tertiary leading-tight mt-1">
              {t("chatSubtitle")}
            </p>
          </div>
        </div>
        {conversationStarted && (
          <button
            onClick={newChat}
            className="text-xs font-semibold text-ink-secondary hover:text-rose-600 px-3 py-1.5 rounded-lg border border-surface-border hover:border-rose-300 transition-colors"
          >
            {t("chatClear")}
          </button>
        )}
      </div>

      {/* Conversation area */}
      <div ref={scrollerRef} className="max-h-[70vh] min-h-[420px] overflow-y-auto px-5 py-5">
        {!conversationStarted ? (
          <div>
            <p className="text-sm text-ink-secondary leading-relaxed mb-4">
              {t("chatIntro")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => send(t(key))}
                  className="group text-left rounded-xl border border-surface-border bg-white dark:bg-slate-900 hover:border-rose-400/40 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-all px-3.5 py-2.5"
                >
                  <p className="text-[13px] text-ink-secondary group-hover:text-ink leading-snug">
                    {t(key)}
                  </p>
                </button>
              ))}
            </div>
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

      {/* Composer */}
      <div className="border-t border-surface-border/70 bg-gradient-to-b from-transparent to-surface-raised/30 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className={`relative rounded-2xl border bg-white dark:bg-slate-950 transition-all shadow-sm ${
            hasInput || pending
              ? "border-rose-400/50 shadow-rose-500/5"
              : "border-surface-border"
          } focus-within:border-rose-500/70 focus-within:ring-1 focus-within:ring-rose-500/30`}
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
            placeholder={t("chatPlaceholder")}
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
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
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
          {t("chatDisclaimer")}
        </p>
      </div>
    </div>
  );
}
