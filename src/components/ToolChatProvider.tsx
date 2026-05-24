"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface ToolChatContextValue {
  toolContext: string | null;
  setToolContext: (ctx: string | null) => void;
}

const ToolChatContext = createContext<ToolChatContextValue | null>(null);

export function useToolChatContext(): ToolChatContextValue {
  const ctx = useContext(ToolChatContext);
  if (!ctx) {
    return { toolContext: null, setToolContext: () => {} };
  }
  return ctx;
}

// Used by tool pages to push their result string into context on each render.
export function useToolContext(value: string | null): void {
  const { setToolContext } = useToolChatContext();
  useEffect(() => {
    setToolContext(value);
    return () => setToolContext(null);
  }, [value, setToolContext]);
}

export function ToolChatProvider({ children }: { children: React.ReactNode }) {
  const [toolContext, setToolContextState] = useState<string | null>(null);

  const setToolContext = useCallback((ctx: string | null) => {
    setToolContextState(ctx);
  }, []);

  return (
    <ToolChatContext.Provider value={{ toolContext, setToolContext }}>
      {children}
    </ToolChatContext.Provider>
  );
}
