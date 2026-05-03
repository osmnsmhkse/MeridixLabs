"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// ── Web Speech API typings (browser globals not in standard lib) ──────────────
interface SpeechAlternative { transcript: string }
interface SpeechResult { isFinal: boolean; 0: SpeechAlternative; readonly length: number }
interface SpeechResults { resultIndex: number; results: ArrayLike<SpeechResult> & Iterable<SpeechResult> }
interface SR {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechResults) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type SRConstructor = new () => SR;
declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

// ── Message + content block types ─────────────────────────────────────────────
interface TextBlock { type: "text"; text: string }
interface ImageBlock { type: "image"; source: { type: "base64"; media_type: string; data: string } }
type ContentBlock = TextBlock | ImageBlock;
interface Msg { role: "user" | "assistant"; content: string | ContentBlock[] }

interface AttachmentDraft {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  base64: string;       // raw base64 (no data: prefix)
  preview: string;      // data URL for thumbnail
}

const STARTERS = [
  { label: "Biggest change in my labs", q: "What's the biggest change in my labs since my last report?" },
  { label: "Trending in the wrong direction", q: "Are any of my markers trending in the wrong direction?" },
  { label: "Watch most closely", q: "Which lab values should I watch most closely right now?" },
  { label: "Plain-English LDL trend", q: "What does my LDL trend mean in plain English?" },
  { label: "Medication interactions", q: "Could any of my medications be affecting my results?" },
  { label: "Specialist suggestions", q: "Based on my data, which specialist should I consider seeing?" },
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
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [recording, setRecording] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SR | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Auto-scroll on new messages / typing
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [input]);

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || pending) return;

    // Build user message: if attachments exist, send as content blocks; else plain string
    let userMsg: Msg;
    if (attachments.length > 0) {
      const blocks: ContentBlock[] = [];
      // Text first; then images
      if (text) blocks.push({ type: "text", text });
      for (const att of attachments) {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: att.mediaType, data: att.base64 },
        });
      }
      userMsg = { role: "user", content: blocks };
    } else {
      userMsg = { role: "user", content: text };
    }

    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setAttachments([]);
    setPending(true);
    setError(null);

    abortRef.current = new AbortController();
    try {
      const r = await fetch("/api/health-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortRef.current.signal,
        body: JSON.stringify({ messages: next }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error || "Failed");
      setMessages((m) => [...m, { role: "assistant", content: j.reply ?? "" }]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // Cancelled — leave the user msg in place, just clear pending
      } else {
        setError(e instanceof Error ? e.message : "Network error");
        setMessages((m) => m.slice(0, -1)); // rollback so they can retry
      }
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
    setAttachments([]);
    setInput("");
    setError(null);
  }

  // ── Attachments ────────────────────────────────────────────────────────────
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const drafts: AttachmentDraft[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        setError(`Only image files are supported right now (got ${f.type || "unknown"}).`);
        continue;
      }
      if (f.size > 8 * 1024 * 1024) {
        setError(`${f.name} is over 8MB. Please use a smaller image.`);
        continue;
      }
      const dataUrl = await readFileAsDataURL(f);
      const base64 = dataUrl.split(",")[1] ?? "";
      drafts.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        mediaType: f.type,
        base64,
        preview: dataUrl,
      });
    }
    if (drafts.length) {
      setAttachments((a) => [...a, ...drafts]);
      setError(null);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((a) => a.filter((x) => x.id !== id));
  }

  // ── Voice dictation ────────────────────────────────────────────────────────
  function toggleMic() {
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setRecError("Voice dictation isn't supported in this browser. Try Chrome, Edge, or Safari.");
      setTimeout(() => setRecError(null), 4000);
      return;
    }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    let appended = "";
    r.onresult = (e) => {
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i] as SpeechResult;
        if (res.isFinal) finalChunk += res[0].transcript;
      }
      if (finalChunk) {
        appended += finalChunk;
        setInput((prev) => (prev ? prev.replace(/\s*$/, "") + " " : "") + finalChunk.trim());
      }
    };
    r.onend = () => { setRecording(false); recognitionRef.current = null; void appended; };
    r.onerror = (e) => {
      setRecording(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        setRecError(`Microphone error: ${e.error}`);
        setTimeout(() => setRecError(null), 4000);
      }
    };
    try {
      r.start();
      recognitionRef.current = r;
      setRecording(true);
    } catch {
      setRecError("Could not start microphone.");
      setTimeout(() => setRecError(null), 4000);
    }
  }

  // Cleanup mic on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  // Time-based greeting (must be before any early return — Rules of Hooks)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const period = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return user?.firstName ? `${period}, ${user.firstName}.` : `${period}.`;
  }, [user?.firstName]);

  if (!isLoaded) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-ink-tertiary">Loading…</div>;
  }

  const hasInput = input.trim().length > 0 || attachments.length > 0;
  const conversationStarted = messages.length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface flex flex-col">
      {/* ─── Top bar ─── */}
      <div className="flex-shrink-0 border-b border-surface-border/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0">
              <MeridixMark className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate leading-none">Meridix AI</p>
              <p className="text-[11px] text-ink-tertiary leading-tight mt-0.5">Grounded in your labs &amp; profile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conversationStarted && (
              <button
                onClick={newChat}
                className="text-xs font-semibold text-ink-secondary hover:text-brand-blue px-3 py-1.5 rounded-lg border border-surface-border hover:border-brand-blue transition-colors"
                title="Start a new conversation"
              >
                New chat
              </button>
            )}
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-ink-secondary hover:text-ink whitespace-nowrap px-2 py-1.5"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Conversation scroller ─── */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!conversationStarted ? (
            <EmptyState greeting={greeting} onPick={(q) => { setInput(q); setTimeout(() => textareaRef.current?.focus(), 0); }} />
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <Bubble key={i} message={m} />
              ))}
              {pending && <ThinkingBubble />}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Composer ─── */}
      <div className="flex-shrink-0 border-t border-surface-border/60 bg-gradient-to-b from-transparent to-white dark:to-slate-900 pt-2">
        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="group relative inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-surface-border bg-white dark:bg-slate-900 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.preview} alt={a.name} className="w-8 h-8 rounded object-cover" />
                  <div className="text-[11px] leading-tight">
                    <p className="font-semibold text-ink truncate max-w-[120px]">{a.name}</p>
                    <p className="text-ink-tertiary">{(a.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(a.id)}
                    className="ml-1 w-5 h-5 rounded-full bg-surface-raised hover:bg-red-100 hover:text-red-600 text-ink-tertiary flex items-center justify-center transition-colors"
                    aria-label={`Remove ${a.name}`}
                  >
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3 h-3">
                      <path d="M2 2l8 8M10 2l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {recError && (
            <div className="mb-2 text-[11px] text-red-600 px-1">{recError}</div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
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
              placeholder={recording ? "Listening… speak now" : "Ask about your labs, trends, medications…"}
              rows={1}
              className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-ink placeholder-ink-tertiary outline-none max-h-[200px]"
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 px-2 pb-2">
              <div className="flex items-center gap-1">
                {/* Attach */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-lg text-ink-tertiary hover:text-brand-blue hover:bg-brand-blue/5 transition-colors flex items-center justify-center"
                  title="Attach an image"
                  aria-label="Attach an image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                    <path d="M21.44 11.05L12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                />

                {/* Mic */}
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    recording
                      ? "bg-red-500 text-white rec-pulse"
                      : "text-ink-tertiary hover:text-brand-blue hover:bg-brand-blue/5"
                  }`}
                  title={recording ? "Stop recording" : "Voice input"}
                  aria-label={recording ? "Stop recording" : "Voice input"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-ink-tertiary mr-1">
                  Enter to send · Shift+Enter for newline
                </span>
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
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M8 14V2M3 7l5-5 5 5" />
                    </svg>
                    Send
                  </button>
                )}
              </div>
            </div>
          </form>

          <p className="mt-2 text-[10px] text-ink-tertiary text-center">
            AI-generated. Not medical advice. Always confirm important decisions with your physician.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ greeting, onPick }: { greeting: string; onPick: (q: string) => void }) {
  return (
    <div className="py-6 sm:py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue/15 via-brand-indigo/10 to-transparent mb-4">
          <MeridixMark className="w-7 h-7 text-brand-blue" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{greeting}</h1>
        <p className="mt-2 text-sm text-ink-secondary max-w-md mx-auto">
          Ask anything about your labs, trends, or medications. I&apos;m grounded in your actual reports and profile.
        </p>
      </div>

      {/* Suggestion grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {STARTERS.map((s) => (
          <button
            key={s.q}
            onClick={() => onPick(s.q)}
            className="group text-left rounded-xl border border-surface-border bg-white dark:bg-slate-900 hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all px-4 py-3"
          >
            <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className="text-sm text-ink-secondary group-hover:text-ink">{s.q}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  // Extract text + image blocks
  let text = "";
  const images: ImageBlock[] = [];
  if (typeof message.content === "string") {
    text = message.content;
  } else {
    for (const b of message.content) {
      if (b.type === "text") text += (text ? "\n" : "") + b.text;
      else if (b.type === "image") images.push(b);
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] flex flex-col items-end gap-2">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={`data:${img.source.media_type};base64,${img.source.data}`}
                  alt="attachment"
                  className="rounded-xl max-h-48 max-w-full border border-surface-border shadow-sm"
                />
              ))}
            </div>
          )}
          {text && (
            <div className="rounded-2xl rounded-br-md bg-brand-blue text-white px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue/15 via-brand-indigo/10 to-transparent flex items-center justify-center flex-shrink-0 border border-brand-blue/15">
        <MeridixMark className="w-4 h-4 text-brand-blue" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider mb-1">Meridix AI</p>
        <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}

// ── Thinking bubble (Meridix logo animation) ──────────────────────────────────
function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue/15 via-brand-indigo/10 to-transparent flex items-center justify-center flex-shrink-0 border border-brand-blue/15">
        <MeridixLoader className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">Meridix AI</p>
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-brand-blue/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      </div>
    </div>
  );
}

// ── Meridix mark (rod-of-asclepius) — static, used for branding ───────────────
function MeridixMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" className={className} aria-hidden>
      <line x1="24" y1="9" x2="24" y2="50" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 24,15 C 40,22 40,38 24,44" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M 24,22 C 8,29 8,44 24,50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="24" cy="11" r="3.4" fill="currentColor" />
    </svg>
  );
}

// ── Animated Meridix loader (for thinking state) ──────────────────────────────
function MeridixLoader({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" className={className} aria-hidden>
      <line
        x1="24" y1="9" x2="24" y2="50"
        stroke="#4a85ef" strokeWidth="2.4" strokeLinecap="round"
        className="meridix-rod"
      />
      <path
        d="M 24,15 C 40,22 40,38 24,44"
        stroke="#4a85ef" strokeWidth="2" strokeLinecap="round" fill="none"
        className="meridix-draw-1"
      />
      <path
        d="M 24,22 C 8,29 8,44 24,50"
        stroke="#4a85ef" strokeWidth="2" strokeLinecap="round" fill="none"
        className="meridix-draw-2"
      />
      <circle cx="24" cy="11" r="3.4" fill="#4a85ef" className="meridix-dot" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(fr.error ?? new Error("read failed"));
    fr.readAsDataURL(file);
  });
}
