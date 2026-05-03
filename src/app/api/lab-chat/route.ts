// POST /api/lab-chat
// Streaming chat endpoint for the Lab Analyzer results page.
//
// Body: {
//   messages:        { role: "user"|"assistant", content: string }[],
//   analysisContext: { result, tier, fileName, isSample },
//   analysisId?:     string   // when set, persists messages for signed-in users
// }
//
// Streams plain UTF-8 text chunks (no SSE framing). Client reads via
// response.body.getReader() and appends chunks to the assistant bubble.
//
// For signed-in users with an analysisId, both the user turn and the
// fully-streamed assistant reply are saved to lab_chat_messages once the
// stream completes.

import { NextRequest } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { getProfileForCurrentUser } from "@/lib/userProfile";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Types ──────────────────────────────────────────────────────────────────
type Tier = "simple" | "medium" | "expert";

interface AnalysisFlag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface AnalysisResult {
  simple: string;
  medium: string;
  expert: string;
  etiology?: string;
  mechanism?: string;
  diseases?: string;
  specialist?: string;
  action: string;
  flags: AnalysisFlag[];
  labs?: AnalysisFlag[];
  medication_context?: string;
  health_insights?: string;
  supplements?: string;
  overall_status?: "normal" | "amber" | "red";
  summary_headline?: string;
  urgency?: "routine" | "soon" | "weeks";
}

interface AnalysisContext {
  result: AnalysisResult;
  tier: Tier;
  fileName?: string;
  isSample?: boolean;
}

interface ChatMsg { role: "user" | "assistant"; content: string }

// ── System prompt builder ──────────────────────────────────────────────────
const TIER_GUIDANCE: Record<Tier, string> = {
  simple:
    "Speak in plain, warm English — like talking to a worried friend. Avoid jargon. If you must use a medical term, define it the first time.",
  medium:
    "Assume the reader understands basic biology and is comfortable with common medical terms. Briefly explain anything specialised, and reference clinical context where useful.",
  expert:
    "Use full clinical terminology. Reference specific values, units, reference ranges, guidelines (ADA, ACC/AHA, Fleischner, etc.) where appropriate. Keep it concise and rigorous.",
};

function fmtFlags(flags: AnalysisFlag[]): string {
  if (!flags?.length) return "  (no abnormal flags — all values within reference ranges)";
  return flags
    .map(
      (f) =>
        `  ${f.status === "high" ? "↑" : f.status === "low" ? "↓" : "·"} ${f.marker}: ${f.value}${
          f.unit ? " " + f.unit : ""
        }${f.reference ? ` (ref ${f.reference})` : ""} [${f.status.toUpperCase()}]`,
    )
    .join("\n");
}

function fmtAllLabs(labs: AnalysisFlag[] | undefined): string {
  if (!labs?.length) return "  (no detailed lab values available)";
  return labs
    .map(
      (l) =>
        `  • ${l.marker}: ${l.value}${l.unit ? " " + l.unit : ""}${l.reference ? ` (ref ${l.reference})` : ""}${
          l.status && l.status !== "normal" ? ` [${l.status.toUpperCase()}]` : ""
        }`,
    )
    .join("\n");
}

function fmtProfile(p: Record<string, unknown> | null): string | null {
  if (!p) return null;
  const lines: string[] = [];
  const push = (label: string, key: string) => {
    const v = p[key];
    if (v != null && v !== "") lines.push(`${label}: ${v}`);
  };
  push("Age", "age");
  push("Sex", "sex");
  push("Weight (kg)", "weight_kg");
  push("Height (cm)", "height_cm");
  push("Ethnicity", "ethnicity");
  push("Medications", "medications");
  push("Allergies", "allergies");
  push("Conditions", "conditions");
  push("Family history", "family_history");
  push("Lifestyle notes", "lifestyle_notes");
  return lines.length ? lines.join("\n") : null;
}

function buildSystemPrompt(ctx: AnalysisContext, profileText: string | null): string {
  const { result, tier, fileName, isSample } = ctx;
  const today = new Date().toISOString().slice(0, 10);

  const profileBlock = profileText
    ? `\n— USER PROFILE —\n${profileText}\n`
    : "";

  return `You are Meridix Labs' Lab Interpreter AI — the user's private guide for understanding the report they just uploaded. They have already seen the AI interpretation; you are here for follow-up questions about THIS specific report.

DEPTH TIER: ${tier.toUpperCase()}
${TIER_GUIDANCE[tier]}

Rules:
- Ground every answer in the lab values and interpretation below. If asked about something not covered by the data, say so honestly — do not speculate beyond the evidence.
- Cite specific values with units when you reference them (e.g., "your LDL of 134 mg/dL").
- Stay within an educational scope — explain mechanisms, possibilities, and questions to raise with a clinician. Frame medication and dietary suggestions as "things to discuss with your physician," never as prescriptions.
- Never make a definitive diagnosis. Explain possibilities, not certainties.
- Be concise. 1–3 short paragraphs unless the user asks for more depth. No bullet-point spam.
- The platform already shows a global medical disclaimer. Do NOT end every reply with "I'm an AI" or "consult your doctor" boilerplate. Add a single relevant clinical caveat only when it materially matters.
- Match the depth tier above. If the user explicitly asks for more or less detail, follow their lead.

Today's date: ${today}.${isSample ? "\nNote: this is a SAMPLE report for demonstration — values are not from a real patient." : ""}
${profileBlock}
— REPORT METADATA —
File: ${fileName ?? "(unnamed)"}
Overall status: ${result.overall_status ?? "n/a"}
Urgency: ${result.urgency ?? "n/a"}
Headline: ${result.summary_headline ?? "(none)"}

— FLAGGED VALUES —
${fmtFlags(result.flags ?? [])}

— ALL EXTRACTED LAB VALUES —
${fmtAllLabs(result.labs)}

— AI INTERPRETATION (${tier} tier — what the user is currently reading) —
${result[tier]}

— CLINICAL CONTEXT (already shown to the user, available for follow-ups) —
Recommended action: ${result.action ?? "(none)"}
Specialist: ${result.specialist ?? "(none)"}
Possible causes: ${result.etiology ?? "(none)"}
Mechanism: ${result.mechanism ?? "(none)"}
Associated conditions: ${result.diseases ?? "(none)"}
${result.medication_context ? `\nMedication context: ${result.medication_context}` : ""}${result.supplements ? `\n\nSupplement & lifestyle notes:\n${result.supplements}` : ""}`;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function lastUserText(messages: ChatMsg[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content ?? "";
  }
  return "";
}

// ── Route handler ──────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: {
    messages?: ChatMsg[];
    analysisContext?: AnalysisContext;
    analysisId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const analysisContext = body.analysisContext;
  const analysisId = body.analysisId ?? null;

  if (!messages.length) {
    return new Response(JSON.stringify({ error: "No messages." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!analysisContext?.result) {
    return new Response(JSON.stringify({ error: "Missing analysisContext." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Optional: enrich with the user's profile if signed in
  let profileText: string | null = null;
  let signedInUserId: string | null = null;
  try {
    const u = await currentUser();
    if (u) {
      signedInUserId = u.id;
      const profile = await getProfileForCurrentUser();
      profileText = fmtProfile(profile as unknown as Record<string, unknown> | null);
    }
  } catch {
    // Auth optional — anonymous users still get the chat
  }

  const systemPrompt = buildSystemPrompt(analysisContext, profileText);

  // ── Stream from Anthropic ────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let assistantBuffer = "";

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })) as Anthropic.MessageParam[],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            assistantBuffer += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.close();

        // ── Persist to Supabase (signed-in users with a saved analysis) ──
        if (signedInUserId && analysisId) {
          try {
            const sb = supabaseServer();
            const userText = lastUserText(messages);
            if (userText && assistantBuffer) {
              await sb.from("lab_chat_messages").insert([
                {
                  user_id: signedInUserId,
                  analysis_id: analysisId,
                  role: "user",
                  content: userText,
                  tier: analysisContext.tier ?? null,
                },
                {
                  user_id: signedInUserId,
                  analysis_id: analysisId,
                  role: "assistant",
                  content: assistantBuffer,
                  tier: analysisContext.tier ?? null,
                },
              ]);
            }
          } catch (e) {
            console.warn("[lab-chat] persist failed:", e);
          }
        }
      } catch (err) {
        console.error("[lab-chat] stream error:", err);
        const message = err instanceof Error ? err.message : "Stream failed";
        try {
          controller.enqueue(encoder.encode(`\n\n[error] ${message}`));
        } catch {
          /* noop */
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no", // disable buffering on proxies
    },
  });
}
