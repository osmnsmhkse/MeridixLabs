"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════════════
   The Scan — Meridix's living sculpture
   ────────────────────────────────────────────────────────────────────────
   A stack of hairline cross-sections (an abstract MRI/CT stack) forming a
   soft organic silhouette. A slow wave travels through the slices, and a
   single blue "reading plane" sweeps the stack — the AI reading you,
   layer by layer — with a tethered instrument readout ticking through
   biomarkers. Built from the editorial vocabulary only: hairlines, paper,
   one blue. No glows, no gradients. Transform/opacity, reduced-motion-safe.
   ════════════════════════════════════════════════════════════════════════ */

const N = 44;          // slices in the stack
const SWEEP_MS = 11000; // one full down-and-back of the reading plane

// Biomarkers the readout ticks through while scanning
const PANEL = ["LDL-C", "HDL-C", "TRIGLYCERIDES", "GLUCOSE", "ALT", "TSH", "CRP", "HBA1C"];

// Organic amphora-like width profile — never a plain cylinder
function profile(t: number): number {
  const body = 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * t)), 1.1);
  const asym = 1 + 0.07 * Math.sin(2.0 * Math.PI * t + 0.8);
  return Math.min(1, Math.max(0.16, body * asym));
}

const SLICES = Array.from({ length: N }, (_, i) => {
  const t = i / (N - 1);
  return { t, w: profile(t) * 100 };
});

export default function ScanSculpture({ className = "" }: { className?: string }) {
  const stackRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState(Math.floor(N / 2));

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stack = stackRef.current;
    const plane = planeRef.current;
    const chip = chipRef.current;
    if (!stack || !plane || !chip) return;

    const place = (tNorm: number) => {
      const h = stack.clientHeight;
      const y = tNorm * h;
      const w = profile(tNorm) * 100;
      plane.style.transform = `translate(-50%, ${y}px) translateY(-50%)`;
      plane.style.width = `${w}%`;
      chip.style.transform = `translateY(${y}px) translateY(-50%)`;
    };

    if (reduce) {
      place(0.42);
      return;
    }

    let raf = 0;
    let lastLayer = -1;
    const t0 = performance.now();
    const tick = (now: number) => {
      const cycle = ((now - t0) % SWEEP_MS) / SWEEP_MS;
      // smooth down-and-back sweep
      const tNorm = 0.5 - 0.5 * Math.cos(2 * Math.PI * cycle);
      place(tNorm);
      const li = Math.min(N - 1, Math.floor(tNorm * N));
      if (li !== lastLayer) {
        lastLayer = li;
        setLayer(li);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="relative h-full">
        {/* The stack — masked so it melts into the page at its edges,
            and turning slowly in 3D like a hologram being read */}
        <div ref={stackRef} className="absolute inset-0 scan-mask scan-turn">
          {SLICES.map((s, i) => (
            <div
              key={i}
              className="absolute left-1/2"
              style={{ top: `${s.t * 100}%`, width: `${s.w}%`, transform: "translateX(-50%)" }}
            >
              <div
                className="scan-slice rounded-[50%] border border-ink/[0.16] dark:border-white/[0.13] bg-white/[0.22] dark:bg-white/[0.02]"
                style={{ ["--sd" as string]: `${i * -0.34}s`, paddingTop: "9.5%" }}
              />
            </div>
          ))}

          {/* The reading plane — the AI's current layer */}
          <div
            ref={planeRef}
            className="absolute left-1/2 top-0 w-[70%]"
            style={{ transform: "translate(-50%, 0)" }}
          >
            <div
              className="relative rounded-[50%] border-2 border-brand-blue/70 bg-brand-blue/[0.14]"
              style={{ paddingTop: "11%" }}
            >
              {/* leading scan edge */}
              <span className="absolute inset-x-[8%] top-0 h-px bg-brand-blue/90" />
            </div>
          </div>
        </div>

        {/* Instrument readout — tethered to the plane */}
        <div
          ref={chipRef}
          className="absolute right-0 top-0 translate-y-[-50%]"
          style={{ transform: "translateY(0)" }}
        >
          <div className="flex items-center gap-1.5 rounded-md bg-ink text-surface px-2.5 py-1.5">
            <span className="w-1 h-1 rounded-full bg-brand-blue" />
            <span className="font-mono-data text-[9.5px] tracking-[0.08em] uppercase whitespace-nowrap">
              Scanning · {PANEL[layer % PANEL.length]}
            </span>
            <span className="font-mono-data text-[9.5px] tabular-nums opacity-50 whitespace-nowrap">
              {String(layer + 1).padStart(2, "0")}/{N}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
