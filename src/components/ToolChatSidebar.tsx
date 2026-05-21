"use client";

// ToolChatSidebar
// ───────────────────────────────────────────────────────────────────────────
// Persistent, sticky AI chat panel rendered on every tool route.
//
// Desktop: fixed 360px sidebar pinned to the right edge, below the top nav.
//          Main content gets `lg:pr-[360px]` from ToolChatProvider so the
//          page shifts left rather than being overlapped.
//
// Mobile:  floating round button bottom-right; tapping opens a slide-up
//          drawer covering most of the screen.
//
// State:   stateless per tab — messages live in React state only and are
//          dropped on refresh / navigation. The active tool's results
//          (toolContext) are passed in by the parent provider; the sidebar
//          forwards them to /api/chat so Claude can ground its answers.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bubble,
  ThinkingBubble,
  MeridixMark,
  type Msg,
} from "@/components/ChatComponents";
import type { ToolChatEntry } from "@/lib/toolChatConfig";

interface Props {
  toolEntry: ToolChatEntry;
  toolContext: string | null;
}

const SIDEBAR_WIDTH = "360px";

export default function ToolChatSidebar({ toolEntry, toolContext }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Mobile drawer + desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasResults = Boolean(toolContext && toolContext.trim().length > 0);

  // Reset conversation when the active tool changes (different page).
  useEffect(() => {
    setMessages([]);
    setStreamingText("");
    setError(null);
    setPending(false);
    abortRef.current?.abort();
    abortRef.current = null;
  }, [toolEntry.path]);

  // Auto-scroll to latest
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

  const welcome = hasResults ? toolEntry.postResultsWelcome : toolEntry.preResultsWelcome;
  const conversationStarted = messages.length > 0;

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
            toolName: toolEntry.toolName,
            toolContext: toolContext ?? null,
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

        setMessages([...next, { role: "assistant", content: buffer.trim() || "(no response)" }]);
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
    [input, pending, messages, toolEntry.toolName, toolContext],
  );

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const newChat = useCallback(() => {
    if (pending) cancelPending();
    setMessages([]);
    setStreamingText("");
    setError(null);
  }, [pending, cancelPending]);

  const hasInput = input.trim().length > 0;

  // ── Inner panel (shared by desktop sidebar + mobile drawer) ──────────
  const panel = useMemo(
    () => (
      <div className="flex h-full flex-col bg-surface border-l border-surface-border">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-surface-border/70 bg-gradient-to-r from-brand-blue/5 via-brand-indigo/3 to-transparent">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0">
              <MeridixMark className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink leading-none truncate">Meridix Assistant</p>
              <p className="text-[11px] text-ink-tertiary leading-tight mt-1 truncate">
                {toolEntry.toolName}{hasResults ? " · results loaded" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {conversationStarted && (
              <button
                onClick={newChat}
                className="text-[11px] font-semibold text-ink-secondary hover:text-brand-blue px-2 py-1 rounded-md hover:bg-brand-blue/5 transition-colors"
                title="Clear chat"
              >
                Clear
              </button>
            )}
            {/* Desktop collapse */}
            <button
              onClick={() => setDesktopCollapsed(true)}
              className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
              title="Hide sidebar"
              aria-label="Hide chat sidebar"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M10 4l4 4-4 4M14 8H4" />
              </svg>
            </button>
            {/* Mobile close */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
              title="Close"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {!conversationStarted ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-brand-blue/5 dark:bg-brand-blue/10 border border-brand-blue/15 px-4 py-3">
                <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider mb-1">Meridix AI</p>
                <p className="text-sm text-ink leading-relaxed">{welcome}</p>
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
              placeholder={toolEntry.placeholder}
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
            Educational only — not medical advice.
          </p>
        </div>
      </div>
    ),
    [
      conversationStarted,
      messages,
      pending,
      streamingText,
      error,
      input,
      hasInput,
      welcome,
      toolEntry.toolName,
      toolEntry.placeholder,
      hasResults,
      newChat,
      send,
      cancelPending,
    ],
  );

  return (
    <>
      {/* ── Desktop: fixed sticky sidebar ── */}
      {!desktopCollapsed && (
        <aside
          className="hidden lg:flex fixed right-0 top-16 bottom-0 z-30 shadow-xl"
          style={{ width: SIDEBAR_WIDTH }}
          aria-label="Meridix Assistant"
        >
          {panel}
        </aside>
      )}

      {/* ── Desktop: re-open tab when collapsed ── */}
      {desktopCollapsed && (
        <button
          onClick={() => setDesktopCollapsed(false)}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 items-center gap-2 px-3 py-3 rounded-l-2xl bg-brand-blue text-white shadow-lg hover:bg-brand-blue-hover transition-colors"
          aria-label="Show Meridix Assistant"
        >
          <MeridixMark className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide [writing-mode:vertical-rl] rotate-180">
            Meridix AI
          </span>
        </button>
      )}

      {/* ── Mobile: floating launcher ── */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-indigo text-white shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center"
          aria-label="Open Meridix Assistant"
        >
          <MeridixMark className="w-6 h-6" />
          {hasResults && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-surface" />
          )}
        </button>
      )}

      {/* ── Mobile: slide-up drawer ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <button
            className="flex-1 bg-ink/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close chat backdrop"
          />
          <div className="h-[88vh] bg-surface rounded-t-2xl overflow-hidden border-t border-surface-border shadow-2xl">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}
