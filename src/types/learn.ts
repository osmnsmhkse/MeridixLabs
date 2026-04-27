// Shared types for the practice/learn feature.
// Extracted from route handlers because Next.js's build-time typecheck
// does not reliably resolve types imported from API route files in
// client components — moving them here makes resolution unambiguous.

export interface LabValue {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "normal" | "high" | "low";
}

export interface PracticeCase {
  patient: {
    age: number;
    sex: "male" | "female";
    complaint: string;
    clinical_context?: string;
  };
  labs: LabValue[];
  hints: [string, string, string];
  learning_tags: string[];
}

export interface KeyFinding {
  marker: string;
  significance: string;
  student_caught: boolean;
}

export interface EvaluationResult {
  ai_diagnosis: string;
  ai_interpretation: string;
  student_identified: string;
  student_missed: string;
  educational_notes: string;
  flags_correct: number;
  flags_total: number;
  score_pct: number;
  grade: "A+" | "A" | "B" | "C" | "D";
  key_findings: KeyFinding[];
  next_steps: string[];
}
