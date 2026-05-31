"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Global, dependency-free motion layer:
 *  - thin gradient scroll-progress bar
 *  - subtle parallax for `[data-parallax="<speed>"]` elements (backgrounds)
 *  - count-up for `[data-countup]` numbers when they scroll into view
 * All effects respect prefers-reduced-motion and are pure transform/opacity.
 */
export default function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scroll progress bar ──────────────────────────────
    let bar = document.getElementById("scroll-progress") as HTMLDivElement | null;
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "scroll-progress";
      bar.className = "scroll-progress";
      document.body.appendChild(bar);
    }

    let ticking = false;
    const parallaxEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]")
    );

    const onScrollFrame = () => {
      ticking = false;
      const st = window.scrollY || document.documentElement.scrollTop;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = `${docH > 0 ? Math.min(100, (st / docH) * 100) : 0}%`;

      if (!reduce) {
        const vh = window.innerHeight;
        for (const el of parallaxEls) {
          const speed = parseFloat(el.dataset.parallax || "0.12");
          const rect = el.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const delta = center - vh / 2;
          el.style.transform = `translate3d(0, ${(-delta * speed).toFixed(1)}px, 0)`;
        }
      }
    };

    const requestFrame = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScrollFrame);
      }
    };

    window.addEventListener("scroll", requestFrame, { passive: true });
    window.addEventListener("resize", requestFrame, { passive: true });
    requestFrame();

    // ── Count-up numbers ─────────────────────────────────
    let countObserver: IntersectionObserver | null = null;
    const runCountUp = (el: HTMLElement) => {
      const raw = el.dataset.countupRaw ?? el.textContent ?? "";
      el.dataset.countupRaw = raw;
      const m = raw.match(/\d[\d,]*\.?\d*/);
      if (!m) return;
      const numStr = m[0];
      const target = parseFloat(numStr.replace(/,/g, ""));
      if (!isFinite(target)) return;
      const decimals = (numStr.split(".")[1] || "").length;
      const hasComma = numStr.includes(",");
      const prefix = raw.slice(0, m.index);
      const suffix = raw.slice((m.index ?? 0) + numStr.length);
      if (reduce) { el.textContent = raw; return; }
      const dur = 1300;
      const start = performance.now();
      const fmt = (v: number) => {
        let s = v.toFixed(decimals);
        if (hasComma) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: decimals });
        return prefix + s + suffix;
      };
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      };
      requestAnimationFrame(step);
    };

    const countEls = document.querySelectorAll<HTMLElement>("[data-countup]");
    if (countEls.length) {
      countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              runCountUp(e.target as HTMLElement);
              countObserver?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      countEls.forEach((el) => countObserver?.observe(el));
    }

    // ── Cursor-follow spotlight on bento cards ───────────
    const onPointerMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement)?.closest?.(".bento-spot") as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      target.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    if (!reduce && window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    return () => {
      window.removeEventListener("scroll", requestFrame);
      window.removeEventListener("resize", requestFrame);
      window.removeEventListener("pointermove", onPointerMove);
      countObserver?.disconnect();
    };
  }, [pathname]);

  return null;
}
