// Helpers for upserting & reading the current user's profile row.
// Always called from server-side code (API routes / server components).

import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "./supabase";

export interface UserProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  medications: string | null;
  allergies: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  ethnicity: string | null;
  fasting_default: boolean | null;
  conditions: string | null;
  family_history: string | null;
  lifestyle_notes: string | null;
  profile_depth: "minimal" | "standard" | "comprehensive";
  created_at: string;
  updated_at: string;
}

/** Ensure the current Clerk user has a row in users_profile. Returns null if not signed in. */
export async function ensureProfileForCurrentUser(): Promise<UserProfile | null> {
  const user = await currentUser();
  if (!user) return null;

  const sb = supabaseServer();
  const email = user.emailAddresses[0]?.emailAddress ?? null;
  const display_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  const { data: existing } = await sb
    .from("users_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing as UserProfile;

  const { data, error } = await sb
    .from("users_profile")
    .insert({ user_id: user.id, email, display_name })
    .select("*")
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export async function getProfileForCurrentUser(): Promise<UserProfile | null> {
  const user = await currentUser();
  if (!user) return null;
  const sb = supabaseServer();
  const { data } = await sb
    .from("users_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as UserProfile) ?? null;
}
