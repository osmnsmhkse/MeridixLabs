// Quick connectivity test for Supabase.
// Run with: node scripts/test-supabase.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
const env = {};
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", url);
console.log("Service key prefix:", serviceKey?.slice(0, 40) + "...");
console.log("Anon key prefix:", anonKey?.slice(0, 40) + "...");

const sb = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("\n─ Testing users_profile table ─");
const { data: profiles, error: pErr } = await sb.from("users_profile").select("user_id").limit(1);
if (pErr) console.error("  ❌", pErr);
else console.log("  ✓ ok, rows:", profiles?.length);

console.log("\n─ Testing lab_analyses table ─");
const { data: la, error: laErr } = await sb.from("lab_analyses").select("id").limit(1);
if (laErr) console.error("  ❌", laErr);
else console.log("  ✓ ok, rows:", la?.length);

console.log("\n─ Testing insert to users_profile ─");
const testId = "test_user_" + Date.now();
const { data: ins, error: insErr } = await sb
  .from("users_profile")
  .insert({ user_id: testId, email: "test@test.com" })
  .select()
  .single();
if (insErr) console.error("  ❌", insErr);
else {
  console.log("  ✓ inserted:", ins.user_id);
  await sb.from("users_profile").delete().eq("user_id", testId);
  console.log("  ✓ cleaned up");
}
