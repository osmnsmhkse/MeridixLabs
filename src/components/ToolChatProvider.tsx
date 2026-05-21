"use client";

// ToolChatProvider
// ───────────────────────────────────────────────────────────────────────────
// Mounted once in the root layout. Holds the active tool-context string
// (the serialized results from the current tool page) so the sticky chat
// sidebar can read it.
//
// Tool pages push results in via `useToolChatContext().setToolContext(...)`
// inside a useEffect that watches their own result state.
//
// Path detection happens here too — the sidebar only renders on routes in
// TOOL_CHAT_REGISTRY, and the main content area receives a right-shift
// class only on those routes.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { findToolForPath, type ToolChatEntry } from "@/lib/toolChatConfig";
import ToolChatSidebar from "@/components/ToolChatSidebar";

interface ToolChatContextValue {
  toolEntry: ToolChatEntry | null;
  toolContext: string | null;
  setToolContext: (ctx: string | null) => void;
}

const ToolChatContext = createContext<ToolChatContextValue | null>(null);

export function useToolChatContext(): ToolChatContextValue {
  const ctx = useContext(ToolChatContext);
  if (!ctx) {
    // Outside a provider — silently no-op so non-tool pages don't crash.
    return {
      toolEntry: null,
      toolContext: null,
      setToolContext: () => {},
    };
  }
  return ctx;
}

// Convenience hook for tool pages: push a result string in, clear on unmount.
export function useToolContext(value: string | null): void {
  const { setToolContext } = useToolChatContext();
  useEffect(() => {
    setToolContext(value);
    return () => setToolContext(null);
  }, [value, setToolContext]);
}

export function ToolChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const toolEntry = useMemo(() => findToolForPath(pathname), [pathname]);
  const [toolContext, setToolContextState] = useState<string | null>(null);

  // Clear the context whenever the route (and therefore the tool) changes,
  // so we never leak results from one tool into another.
  useEffect(() => {
    setToolContextState(null);
  }, [toolEntry?.path]);

  const setToolContext = useCallback((ctx: string | null) => {
    setToolContextState(ctx);
  }, []);

  const value = useMemo<ToolChatContextValue>(
    () => ({ toolEntry, toolContext, setToolContext }),
    [toolEntry, toolContext, setToolContext],
  );

  const isToolRoute = Boolean(toolEntry);

  return (
    <ToolChatContext.Provider value={value}>
      <div className={isToolRoute ? "lg:pr-[360px] transition-[padding] duration-200" : ""}>
        {children}
      </div>
      {isToolRoute && toolEntry && (
        <ToolChatSidebar
          toolEntry={toolEntry}
          toolContext={toolContext}
        />
      )}
    </ToolChatContext.Provider>
  );
}
