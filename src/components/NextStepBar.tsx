import Link from "next/link";

interface NextStep {
  href: string;
  label: string;
  description: string;
  color: string;        // text color class
  bg: string;          // icon bg class
  iconBg: string;      // filled icon background
  icon: React.ReactNode;
}

const ALL_STEPS: Record<string, NextStep> = {
  symptom: {
    href: "/symptom",
    label: "Symptom Checker",
    description: "Understand what a symptom most likely means",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
      </svg>
    ),
  },
  diagnosed: {
    href: "/diagnosed",
    label: "Diagnosis Explainer",
    description: "Just got a diagnosis? Learn what it means for your life",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
      </svg>
    ),
  },
  app: {
    href: "/app",
    label: "Lab Analyzer",
    description: "Upload a blood test and get a plain-English explanation",
    color: "text-brand-blue",
    bg: "bg-brand-blue-light dark:bg-brand-blue/10",
    iconBg: "bg-brand-blue/10 dark:bg-brand-blue/20",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
  },
  trends: {
    href: "/trends",
    label: "Trend Tracker",
    description: "See how your biomarkers change across multiple tests",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
      </svg>
    ),
  },
};

// Which tools to suggest for each current page
const SUGGESTIONS: Record<string, (keyof typeof ALL_STEPS)[]> = {
  app:       ["trends", "symptom", "diagnosed"],
  symptom:   ["app", "diagnosed", "trends"],
  diagnosed: ["app", "symptom", "trends"],
};

interface NextStepBarProps {
  currentPage: keyof typeof SUGGESTIONS;
}

export default function NextStepBar({ currentPage }: NextStepBarProps) {
  const keys = SUGGESTIONS[currentPage] ?? [];
  const steps = keys.map((k) => ALL_STEPS[k]).filter(Boolean);

  return (
    <div className="border-t border-surface-border mt-10 pt-8">
      <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-4">
        What to do next
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className={`group flex items-start gap-3 p-4 rounded-xl border border-surface-border hover:border-current ${step.color} hover:shadow-sm transition-all duration-200 bg-white dark:bg-slate-900`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${step.iconBg} ${step.color}`}>
              {step.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${step.color}`}>{step.label}</p>
              <p className="text-xs text-ink-tertiary mt-0.5 leading-relaxed">{step.description}</p>
            </div>
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${step.color}`}>
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
