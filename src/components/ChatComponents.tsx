// Shared chat UI primitives used by both the dashboard chat (/dashboard/chat)
// and the lab analyzer chat panel (rendered inside /app results page).
//
// Keep these dumb — they render messages and branding. State, streaming, and
// API wiring live in the caller.

import React from "react";

// ── Message + content block types ─────────────────────────────────────────────
export interface TextBlock { type: "text"; text: string }
export interface ImageBlock {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
}
export type ContentBlock = TextBlock | ImageBlock;
export interface Msg {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// ── Message bubble ────────────────────────────────────────────────────────────
export function Bubble({ message }: { message: Msg }) {
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
export function ThinkingBubble() {
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
export function MeridixMark({ className = "w-5 h-5" }: { className?: string }) {
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
export function MeridixLoader({ className = "w-5 h-5" }: { className?: string }) {
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
