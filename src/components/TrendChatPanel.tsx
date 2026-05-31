"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bubble,
  ThinkingBubble,
  MeridixMark,
  type Msg,
} from "@/components/ChatComponents";

interface TrendDataPoint {
  date: string;
  value: number;
  status: string;
  marker: string;
  unit: string;
  reference: string;
}

interface Props {
  trendSnapshot: string;
  allDataPoints: TrendDataPoint[];
  language: string;
}

const SUGGESTED_QUESTIONS = [
  "Which of my markers need the most attention?",
  "Are my trends generally improving or worsening?",
  "What lifestyle changes could improve my results?",
  "How do my different markers relate to each other?",
];

export default function TrendChatPanel({
  trendSnapshot,
  allDataPoints,
  language,
}: Props) {
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
      const r = await fetch("/api/trend-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          messages: next,
          trendSnapshot,
          allDataPoints,
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
    <div className="rounded-2xl border border-surface-border bg-surface-raised overflow-hidden shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-border/70 bg-gradient-to-r from-brand-blue/5 via-brand-indigo/3 to-transparent flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0">
            <MeridixMark className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink leading-none">
              Meridix Trend AI
            </p>
            <p className="text-[11px] text-ink-tertiary leading-tight mt-1">
              Ask about your trends & health patterns
            </p>
          </div>
        </div>
        {conversationStarted && (
          <button
            onClick={newChat}
            className="text-xs font-semibold text-ink-secondary hover:text-brand-blue px-3 py-1.5 rounded-lg border border-surface-border hover:border-brand-blue/30 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Conversation area */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
        {!conversationStarted ? (
          <div>
            <p className="text-sm text-ink-secondary leading-relaxed mb-4">
              I can help you understand your lab trends, identify patterns, and suggest areas to discuss with your doctor.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="group text-left rounded-xl border border-surface-border bg-surface-raised hover:border-brand-blue/40 hover:bg-brand-blue-light/30 transition-all px-3.5 py-2.5"
                >
                  <p className="text-[13px] text-ink-secondary group-hover:text-ink leading-snug">
                    {q}
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
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-surface-border/70 bg-gradient-to-b from-transparent to-surface-raised/30 px-4 py-3 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className={`relative rounded-2xl border bg-surface-raised transition-all shadow-sm ${
            hasInput || pending
              ? "border-brand-blue/50 shadow-brand-blue/5"
              : "border-surface-border"
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
            placeholder="Ask about your trends..."
            rows={1}
            disabled={pending}
            className="block w-full resize-none bg-transparent px-4 pt-3 pb-1.5 text-sm text-ink placeholder-ink-tertiary outline-none max-h-[160px]"
          />

          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <span className="hidden sm:inline text-[10px] text-ink-tertiary pl-2">
              Enter to send
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
          For educational purposes only. Always consult your healthcare provider.
        </p>
      </div>
    </div>
  );
}
