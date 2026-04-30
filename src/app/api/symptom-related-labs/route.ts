// POST /api/symptom-related-labs
// Body: { symptoms: string }
// Returns: array of related-lab groupings, each with the user's actual
// readings if they exist. Used by /symptom result page to show
// "you have these labs that are clinically relevant to this symptom."

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { relatedLabsForSymptoms } from "@/lib/symptomLabMap";
import { normalizeAnalyses, type Analysis } from "@/lib/dashboardData";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symptoms: string = (body?.symptoms ?? "").toString();
    const groups = relatedLabsForSymptoms(symptoms);
    if (groups.length === 0) return NextResponse.json({ groups: [] });

    // Anonymous users get the recommendation list with no values.
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        signedIn: false,
        groups: groups.map((g) => ({
          symptom: g.matchedSymptom,
          rationale: g.rationale,
          markers: g.markers.map((m) => ({ slug: m.slug, name: m.canonical, value: null, unit: null, zone: null, date: null })),
        })),
      });
    }

    const sb = supabaseServer();
    const { data: rows } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    const map = normalizeAnalyses((rows ?? []) as Analysis[]);

    const enriched = groups.map((g) => ({
      symptom: g.matchedSymptom,
      rationale: g.rationale,
      markers: g.markers.map((m) => {
        const series = map.get(m.slug);
        const latest = series?.latest;
        return {
          slug: m.slug,
          name: m.canonical,
          value: latest?.value ?? null,
          raw: latest?.raw ?? null,
          unit: latest?.unit ?? m.unit ?? null,
          zone: latest?.zone ?? null,
          date: latest?.date ?? null,
        };
      }),
    }));

    return NextResponse.json({ signedIn: true, groups: enriched });
  } catch (err) {
    console.error("symptom-related-labs error:", err);
    return NextResponse.json({ groups: [], error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
