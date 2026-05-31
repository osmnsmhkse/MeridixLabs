"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Momentum smooth-scrolling (Lenis) for that "flowing" agency feel.
 * - Wheel only; native touch scrolling stays untouched on mobile.
 * - Nested scrollable regions (chat panels, dropdowns, inputs, modals, results
 *   lists) keep native scroll via the `prevent` predicate, so nothing breaks.
 * - Anchor links scroll smoothly with a fixed-nav offset.
 * - Fully disabled when the user prefers reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Let native scroll handle anything that scrolls on its own.
      prevent: (node) =>
        !!(node as Element)?.closest?.(
          "[data-lenis-prevent], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, [role='dialog'], [role='listbox'], [role='menu'], textarea, select, pre"
        ),
    });

    let rafId = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    // Smooth in-page anchor navigation (#how-it-works, #features, …)
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const hash = a.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -84 });
      history.pushState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return null;
}
