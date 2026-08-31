"use client";

/* ════════════════════════════════════════════════════════════════════════
   Meridix — floating widget dock
   ────────────────────────────────────────────────────────────────────────
   The Feedback pill and the Meridix assistant FAB used to position
   themselves independently (`fixed bottom-24 right-6` and
   `fixed bottom-6 right-6`), each unaware of the other. Their 16px of
   separation was a coincidence of two hardcoded offsets, and neither
   accounted for iOS safe-area insets — so on a real iPhone the assistant
   FAB sat under Safari's bottom bar and the home indicator.

   Now both triggers live in one anchored stack whose geometry comes from a
   single set of tokens in globals.css: slot 2 is *computed* from slot 1's
   size plus the gap, so the two can no longer overlap no matter what
   changes. Both slots are inset from the safe area.

   Below md the two competing triggers collapse into a single launcher FAB
   that opens a two-item sheet. That reclaims the bottom-right corner —
   which on a 390px screen was carrying a 122px pill and a 56px FAB over
   the content — and, on tool routes that already ship their own chat
   panel, drops the page from three chat entry points to two.

   Panel open/close state lives here so a launcher and a panel can be in
   different components; FeedbackWidget and LandingChatWidget read it and
   render the panels themselves.
   ════════════════════════════════════════════════════════════════════════ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { MessageSquare, X } from "lucide-react";
import { MeridixMark } from "@/components/ChatComponents";

export type DockPanel = "chat" | "feedback" | null;

interface DockContextValue {
  panel: DockPanel;
  setPanel: (p: DockPanel) => void;
  /** The currently-mounted trigger, so a closing panel can restore focus. */
  triggerRef: MutableRefObject<HTMLButtonElement | null>;
}

const DockContext = createContext<DockContextValue | null>(null);

export function useFloatingDock(): DockContextValue {
  const ctx = useContext(DockContext);
  const fallback = useRef<HTMLButtonElement | null>(null);
  if (!ctx) return { panel: null, setPanel: () => {}, triggerRef: fallback };
  return ctx;
}

export function FloatingDockProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = useState<DockPanel>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <DockContext.Provider value={{ panel, setPanel, triggerRef }}>
      {children}
    </DockContext.Provider>
  );
}

// Shared across both triggers so the md+ pair keeps the exact look it had.
const TRIGGER_BASE = [
  "bg-gradient-brand text-white",
  "shadow-glow-blue hover:shadow-card-hover",
  "transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2",
  "focus-visible:ring-offset-surface",
].join(" ");

export function FloatingDock() {
  const { panel, setPanel, triggerRef } = useFloatingDock();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  // Stop the attention pulse after 3s (matches the previous per-widget timers)
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 3000);
    return () => clearTimeout(t);
  }, []);

  // A panel opening from the launcher supersedes the launcher sheet
  useEffect(() => {
    if (panel) setLauncherOpen(false);
  }, [panel]);

  useEffect(() => {
    if (!launcherOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLauncherOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launcherOpen]);

  const openPanel = useCallback(
    (p: Exclude<DockPanel, null>) => {
      triggerRef.current = launcherRef.current;
      setPanel(p);
      setLauncherOpen(false);
    },
    [setPanel, triggerRef],
  );

  // A panel covers the screen on mobile — hide the dock behind it.
  const dockHidden = panel !== null;

  return (
    <>
      {/* ── Below md: one launcher ──────────────────────────────────────── */}
      {!dockHidden && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setLauncherOpen((v) => !v)}
          aria-label={launcherOpen ? "Close menu" : "Open Meridix menu"}
          aria-haspopup="menu"
          aria-expanded={launcherOpen}
          className={[
            "dock-slot dock-slot-1 z-50 md:hidden",
            "w-14 h-14 rounded-full flex items-center justify-center active:scale-95",
            TRIGGER_BASE,
            pulse && !launcherOpen ? "animate-pulse-glow" : "",
          ].join(" ")}
        >
          {launcherOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <MeridixMark className="w-6 h-6" />}
        </button>
      )}

      {launcherOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setLauncherOpen(false)}
            className="fixed inset-0 z-40 md:hidden cursor-default"
          />
          <div
            role="menu"
            className="dock-slot dock-slot-2 z-50 md:hidden w-56 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-float animate-slide-up"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => openPanel("chat")}
              className="flex w-full min-h-[44px] items-center gap-3 px-4 py-3 text-start text-sm font-semibold text-ink hover:bg-surface-raised"
            >
              <MeridixMark className="w-5 h-5 shrink-0 text-brand-blue" />
              Ask Meridix
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openPanel("feedback")}
              className="flex w-full min-h-[44px] items-center gap-3 border-t border-surface-border px-4 py-3 text-start text-sm font-semibold text-ink hover:bg-surface-raised"
            >
              <MessageSquare className="w-5 h-5 shrink-0 text-brand-blue" aria-hidden="true" />
              Send feedback
            </button>
          </div>
        </>
      )}

      {/* ── md and up: the two triggers, unchanged ──────────────────────── */}
      <button
        type="button"
        onClick={(e) => {
          triggerRef.current = e.currentTarget;
          setPanel("feedback");
        }}
        aria-label="Open feedback form"
        aria-haspopup="dialog"
        aria-expanded={panel === "feedback"}
        className={[
          "dock-slot dock-slot-2 z-50 hidden md:inline-flex",
          "items-center gap-2 rounded-full",
          "px-4 py-3 text-sm font-semibold",
          TRIGGER_BASE,
          pulse ? "animate-pulse-glow" : "",
        ].join(" ")}
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        <span>Feedback</span>
      </button>

      {panel !== "chat" && (
        <button
          type="button"
          onClick={(e) => {
            triggerRef.current = e.currentTarget;
            setPanel("chat");
          }}
          aria-label="Open Meridix Assistant"
          aria-haspopup="dialog"
          className={[
            "dock-slot dock-slot-1 z-50 hidden md:flex",
            "w-14 h-14 rounded-full items-center justify-center active:scale-95",
            TRIGGER_BASE,
            pulse ? "animate-pulse-glow" : "",
          ].join(" ")}
        >
          <MeridixMark className="w-6 h-6" />
        </button>
      )}
    </>
  );
}
