// Single source of truth for the persistent ToolChatSidebar.
//
// Each entry maps a tool route to:
//   - toolName:           label used in welcome copy and the system prompt
//   - preResultsWelcome:  shown before the user has generated results
//   - postResultsWelcome: shown the moment toolContext arrives
//   - placeholder:        input placeholder
//   - systemHint:         short, tool-specific guidance appended to the
//                         global Meridix identity prompt on the server.
//
// The route value is matched with usePathname() — exact match OR prefix
// (so `/app/anything` still resolves to the Lab Analyzer entry).

export interface ToolChatEntry {
  path: string;
  toolName: string;
  preResultsWelcome: string;
  postResultsWelcome: string;
  placeholder: string;
  systemHint: string;
}

export const TOOL_CHAT_REGISTRY: ToolChatEntry[] = [
  {
    path: "/app",
    toolName: "Lab Analyzer",
    preResultsWelcome:
      "Hi! I can help you understand your lab results. Feel free to ask me about any specific test, what values mean, or how to use this tool.",
    postResultsWelcome:
      "Your lab results are ready — ask me about any value, what it means, or what to do next.",
    placeholder: "Ask about a specific test or value…",
    systemHint:
      "The user is on the Lab Analyzer. Help them interpret blood test markers, explain reference ranges, and suggest reasonable follow-up questions for a clinician. Cite specific values with units when relevant.",
  },
  {
    path: "/symptom",
    toolName: "Symptom Checker",
    preResultsWelcome:
      "Not sure what to enter? I can help you describe your symptoms or explain what to expect from the analysis.",
    postResultsWelcome:
      "Your symptom analysis is ready — ask me about any possible cause, what to monitor, or when to seek care.",
    placeholder: "Describe a symptom or ask a question…",
    systemHint:
      "The user is on the Symptom Checker. Help them describe symptoms precisely (onset, duration, severity, triggers) and explain possible — never definitive — causes. Always reinforce that this is not a diagnosis.",
  },
  {
    path: "/diagnosed",
    toolName: "Diagnosis Explainer",
    preResultsWelcome:
      "Just diagnosed with something? Tell me the condition above, or ask me anything about how this tool works.",
    postResultsWelcome:
      "Your diagnosis explanation is ready — ask me what it means for daily life, treatment options, or questions to bring to your doctor.",
    placeholder: "Ask about your diagnosis…",
    systemHint:
      "The user is on the Diagnosis Explainer. Help them understand a specific diagnosis — what it is, how it progresses, common treatments, and what questions to ask their physician. Empathetic, plain-language tone.",
  },
  {
    path: "/imaging",
    toolName: "Imaging Report Explainer",
    preResultsWelcome:
      "Upload your imaging report above and I'll help you understand it. You can also ask me general questions about MRI, CT, X-ray, or ultrasound findings.",
    postResultsWelcome:
      "Your imaging report is interpreted — ask me about specific findings, what terms mean, or recommended follow-up.",
    placeholder: "Ask about a finding or term…",
    systemHint:
      "The user is on the Imaging Report Explainer (MRI, CT, X-ray, ultrasound, mammography). Translate radiology jargon (e.g., 'subcentimeter nodule', 'T2 hyperintense') into plain language. Note clinical significance without diagnosing.",
  },
  {
    path: "/trends",
    toolName: "Trend Tracker",
    preResultsWelcome:
      "Hi! I can help you understand how your lab values are changing over time. Ask me which trends matter or how to read a chart.",
    postResultsWelcome:
      "Your trends are loaded — ask me what a rising or falling marker means, or which value to keep watching.",
    placeholder: "Ask about a trend or marker…",
    systemHint:
      "The user is on the Trend Tracker, looking at how their lab markers change over multiple tests. Focus on direction and rate of change, not single values. Flag clinically meaningful shifts.",
  },
  {
    path: "/medications",
    toolName: "Medication Companion",
    preResultsWelcome:
      "Hi! I can help you understand how your medications work, what to expect, and what interactions to watch for. Add a medication above to get started.",
    postResultsWelcome:
      "Your medication breakdown is ready — ask me about side effects, interactions, timing, or anything that wasn't clear.",
    placeholder: "Ask about a medication…",
    systemHint:
      "The user is on the Medication Companion. Explain mechanism, dosing, common side effects, and meaningful interactions. Never recommend stopping or changing a prescription — always defer to their prescriber.",
  },
  {
    path: "/visit",
    toolName: "Doctor's Visit Companion",
    preResultsWelcome:
      "Got a doctor's visit coming up — or just had one? I can help you prepare questions, understand what was said, or organize follow-ups.",
    postResultsWelcome:
      "Your visit prep is ready — ask me to refine a question, clarify a topic, or explain what to expect.",
    placeholder: "Ask about your visit…",
    systemHint:
      "The user is on the Doctor's Visit Companion. Help them prepare focused questions for an upcoming appointment, or debrief after one. Encourage them to bring written notes and named medications.",
  },
  {
    path: "/genetics",
    toolName: "Genetic Test Explainer",
    preResultsWelcome:
      "Hi! I can help you understand genetic test results, variants, and what they mean for your health. Upload your report above or ask a question.",
    postResultsWelcome:
      "Your genetic report is interpreted — ask me about a specific variant, the inheritance pattern, or what this means for your family.",
    placeholder: "Ask about a variant or gene…",
    systemHint:
      "The user is on the Genetic Test Explainer (23andMe, ancestry, BRCA panels, pharmacogenomic reports, whole-genome). Explain variants (VUS / pathogenic / benign), inheritance patterns, penetrance, and emphasize that a genetic counselor is the right next step for actionable findings.",
  },
  {
    path: "/pediatric",
    toolName: "Pediatric Symptom Companion",
    preResultsWelcome:
      "Hi! I can help you understand your child's symptoms — fevers, rashes, common illnesses. Describe what's going on above, or ask me a question.",
    postResultsWelcome:
      "Your child's symptom analysis is ready — ask me what to watch for, when to call the pediatrician, or how to manage at home.",
    placeholder: "Ask about your child's symptoms…",
    systemHint:
      "The user is on the Pediatric Symptom Companion, asking about a child. Be calm, specific about age-appropriate thresholds (fever, hydration, breathing rate), and very clear about red-flag symptoms that warrant immediate care.",
  },
  {
    path: "/womens-health",
    toolName: "Women's Health Companion",
    preResultsWelcome:
      "Hi! I can help with questions about cycles, hormones, pregnancy, perimenopause, and women's health topics in general. Ask me anything.",
    postResultsWelcome:
      "Your women's health analysis is ready — ask me about hormones, cycles, symptoms, or what to discuss with a specialist.",
    placeholder: "Ask about a symptom or topic…",
    systemHint:
      "The user is on the Women's Health Companion. Cover menstrual cycles, hormones (estrogen, progesterone, FSH, LH, AMH), PCOS, endometriosis, fertility, pregnancy, perimenopause, and menopause with sensitivity and accurate terminology.",
  },
];

export function findToolForPath(pathname: string | null): ToolChatEntry | null {
  if (!pathname) return null;

  // Strip an optional locale prefix like /en/app or /tr/symptom.
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/";

  for (const entry of TOOL_CHAT_REGISTRY) {
    if (stripped === entry.path || stripped.startsWith(entry.path + "/")) {
      return entry;
    }
  }
  return null;
}

export const GLOBAL_SYSTEM_PROMPT = `You are Meridix Assistant, a helpful medical AI on the Meridix Labs platform. You help users understand their health data.

Hard rules:
- You are NOT a doctor and you do not diagnose. Always recommend consulting a physician for medical decisions.
- Be warm, clear, and concise — 1–3 short paragraphs unless the user asks for more depth.
- Adapt your language to the user's apparent level of understanding. If they use technical terms, you can too; if they ask "what does this mean?", default to plain English.
- When the user has results loaded (provided as TOOL CONTEXT below), ground every answer in that data. Do not invent values or findings. If asked about something not in the data, say so honestly.
- The platform already shows a global medical disclaimer. Do NOT end every reply with "I'm an AI" or "consult your doctor" boilerplate. Add a clinical caveat only when it materially matters.`;
