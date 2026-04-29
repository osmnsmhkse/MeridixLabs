"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface Msg { role: "user" | "assistant"; content: string; }

const STARTERS = [
  "What's the biggest change in my labs since my last report?",
  "Are any of my markers trending in the wrong direction?",
  "Which lab values should I watch most closely?",
  "What does my LDL trend mean in plain English?",
  "Could any of my medications be affecting my results?",
];

export default function ChatPage() {
  if (!AUTH_ENABLED) return <Disabled />;
  return <ChatInner />;
}

function Disabled() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">Accounts aren&apos;t enabled</h1>
        <Link href="/" className="mt-3 inline-block text-sm text-brand-blue hover:underline">Go home</Link>
      </div>
    </div>
  );
}

function ChatInner() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function send(content: string) {
    if (!content.trim() || pending) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/health-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error || "Failed");
      setMessages((m) => [...m, { role: "assistant", content: j.reply ?? "" }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setMessages((m) => m.slice(0, -1)); // rollback the user msg so they can retry
    } finally {
      setPending(false);
    }
  }

  if (!isLoaded) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-ink-tertiary">Loading…</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface flex flex-col">
      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">Health AI chat</h1>
            <p className="mt-1 text-sm text-ink-secondary">Ask anything about your labs. Grounded in your actual reports + profile.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-ink-secondary hover:text-ink whitespace-nowrap">← Dashboard</Link>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5">
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Try asking…</p>
              <div className="flex flex-col gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm text-ink hover:bg-surface-raised rounded-lg px-3 py-2 border border-surface-border transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} />
              ))}
              {pending && <Message role="assistant" content="…" pending />}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-surface-border bg-white dark:bg-slate-900">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about your labs, trends, medications…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-surface-border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-ink focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition max-h-32"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all"
            >
              Send
            </button>
          </form>
          <p className="mt-2 text-[11px] text-ink-tertiary text-center">
            AI-generated. Not medical advice. Always confirm important decisions with your physician.
          </p>
        </div>
      </div>
    </div>
  );
}

function Message({ role, content, pending }: { role: "user" | "assistant"; content: string; pending?: boolean }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? "bg-brand-blue text-white"
          : "bg-white dark:bg-slate-900 border border-surface-border text-ink"
      } ${pending ? "animate-pulse" : ""}`}>
        {content}
      </div>
    </div>
  );
}
