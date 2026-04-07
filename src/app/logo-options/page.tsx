export default function LogoOptionsPage() {
  const BLUE = "#4A85EF";

  const logos = [
    {
      id: "A",
      name: "ECG Heartbeat",
      desc: "A medical ECG flatline with two sharp peaks — reads as M, instantly signals 'medical'.",
      svg: (size: number) => (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill={BLUE} />
          <polyline
            points="4,22 9,22 12,11 16,31 20,14 24,31 28,11 31,22 36,22"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </svg>
      ),
    },
    {
      id: "B",
      name: "Geometric M",
      desc: "A bold, clean M letterform. Timeless, highly legible at any size, no gimmicks.",
      svg: (size: number) => (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill={BLUE} />
          <path
            d="M7 31 L7 11 L20 23 L33 11 L33 31"
            stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </svg>
      ),
    },
    {
      id: "C",
      name: "Double Arch",
      desc: "Two smooth arches side by side — organic, approachable, subtly reads as M without being obvious.",
      svg: (size: number) => (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill={BLUE} />
          <path
            d="M7 31 L7 20 Q7 9 16 9 Q20 9 20 20 Q20 9 24 9 Q33 9 33 20 L33 31"
            stroke="white" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </svg>
      ),
    },
    {
      id: "D",
      name: "M + Medical Cross",
      desc: "Bold M with a small + cross integrated in the upper right — clear medical identity.",
      svg: (size: number) => (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill={BLUE} />
          <path
            d="M7 31 L7 14 L20 24 L33 14 L33 31"
            stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
          <path d="M30 6 L30 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M27 9 L33 9"  stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "E",
      name: "M + Node Dots",
      desc: "Geometric M with two filled circles at the peaks — feels scientific, like a molecule or data node.",
      svg: (size: number) => (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="10" fill={BLUE} />
          <path
            d="M7 31 L7 13 L20 23 L33 13 L33 31"
            stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
          <circle cx="7"  cy="13" r="3" fill="white" />
          <circle cx="33" cy="13" r="3" fill="white" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-raised pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold text-ink mb-3">Logo Options</h1>
          <p className="text-ink-secondary">Pick one — tell me your favourite and I'll apply it everywhere.</p>
        </div>

        <div className="space-y-6">
          {logos.map((logo) => (
            <div key={logo.id} className="bg-white rounded-2xl border border-surface-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">

              {/* Sizes: small (nav), medium (card), large (hero) */}
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex flex-col items-center gap-1">
                  {logo.svg(24)}
                  <span className="text-[10px] text-ink-tertiary">24px</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {logo.svg(40)}
                  <span className="text-[10px] text-ink-tertiary">40px</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  {logo.svg(64)}
                  <span className="text-[10px] text-ink-tertiary">64px</span>
                </div>
              </div>

              {/* Brand mockup */}
              <div className="flex items-center gap-2 flex-shrink-0 px-4 py-2 bg-surface-raised rounded-xl border border-surface-border">
                {logo.svg(32)}
                <span className="font-bold text-base text-ink">
                  Meridix<span style={{ color: BLUE }}>Labs</span>
                </span>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white bg-brand-blue px-2 py-0.5 rounded-full">
                    {logo.id}
                  </span>
                  <span className="font-bold text-ink">{logo.name}</span>
                </div>
                <p className="text-sm text-ink-secondary leading-relaxed">{logo.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-5 bg-brand-blue-light border border-brand-blue-mid rounded-2xl text-center">
          <p className="text-sm text-ink-secondary">
            Tell me which option (A–E) you prefer and I'll update the nav, footer, and favicon instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
