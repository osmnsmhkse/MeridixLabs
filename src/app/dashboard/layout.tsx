import type { ReactNode } from "react";

/**
 * Dashboard wrapper — drapes the signed-in area in the same Liquid-Glass
 * ambient as the tools & marketing. The `.glass-site` scope (see globals.css)
 * dissolves the pages' full-width `bg-surface` roots into the ambient canvas
 * and frosts their rounded cards. One place covers every current and future
 * dashboard route.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="glass-site min-h-[calc(100vh-4rem)]">{children}</div>;
}
