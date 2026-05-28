// Ingest curated medical sources into the `knowledge_chunks` table.
//
// Usage:
//   VOYAGE_API_KEY=... npm run ingest:knowledge -- ./data/knowledge
//
// Input layout:
//   <folder>/
//     hypothyroidism.md
//     hypothyroidism.meta.json
//     uspstf-statin.txt
//     uspstf-statin.meta.json
//
// Each .md / .txt / .text file is paired with a sibling `<basename>.meta.json`:
//   {
//     "source_name":    "Hypothyroidism — Diagnosis and treatment",
//     "source_url":     "https://medlineplus.gov/...",
//     "source_body":    "MedlinePlus",
//     "specialty_tags": ["endocrinology", "primary_care"],
//     "license":        "Public Domain",
//     "last_updated":   "2025-03-12"
//   }
//
// Idempotency: each chunk's `content_hash` is sha256(source_url + normalized
// content). Re-running the script upserts on conflict, so chunks won't
// duplicate. Edits to the upstream source produce new hashes and new rows;
// stale rows are NOT removed automatically — delete them by source_url if
// you want a clean reingest.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, basename } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { EMBEDDING_MODEL, embedDocuments } from "../src/lib/voyage";

// ── chunking ────────────────────────────────────────────────────────────────
// ~600 tokens with ~80-token overlap. Token count is approximated as
// `words * 1.3` (English heuristic); good enough for chunk sizing.
const TARGET_TOKENS = 600;
const OVERLAP_TOKENS = 80;
const WORDS_PER_TOKEN = 1 / 1.3;
const TARGET_WORDS = Math.round(TARGET_TOKENS * WORDS_PER_TOKEN);   // ~462
const OVERLAP_WORDS = Math.round(OVERLAP_TOKENS * WORDS_PER_TOKEN); // ~62

const BATCH_SIZE = 32;
const TEXT_EXTS = new Set([".md", ".txt", ".text"]);

interface Meta {
  source_name: string;
  source_url: string;
  source_body: string;
  specialty_tags?: string[];
  license?: string;
  last_updated?: string;
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function chunkText(text: string): string[] {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];

  // Split on blank lines first so we don't cut mid-paragraph; then pack
  // paragraphs into ~TARGET_WORDS windows with OVERLAP_WORDS overlap.
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const words: string[] = [];
  const paraBreaks = new Set<number>();
  for (const p of paragraphs) {
    const ws = p.split(/\s+/);
    words.push(...ws);
    paraBreaks.add(words.length); // index immediately after this paragraph
  }

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    let end = Math.min(start + TARGET_WORDS, words.length);
    // Prefer ending on a paragraph break if one falls within the last 80 words
    // of the target window.
    if (end < words.length) {
      for (let i = end; i > end - OVERLAP_WORDS && i > start; i--) {
        if (paraBreaks.has(i)) {
          end = i;
          break;
        }
      }
    }
    const chunk = words.slice(start, end).join(" ").trim();
    if (chunk) chunks.push(chunk);
    if (end >= words.length) break;
    start = Math.max(end - OVERLAP_WORDS, start + 1);
  }
  return chunks;
}

function hashChunk(sourceUrl: string, content: string): string {
  return createHash("sha256")
    .update(sourceUrl + "\n" + content)
    .digest("hex");
}

// ── env loading (matches scripts/test-supabase.mjs pattern) ────────────────
async function loadEnvLocal(): Promise<void> {
  const path = join(process.cwd(), ".env.local");
  try {
    const text = await readFile(path, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // .env.local optional; env vars may already be in process.env
  }
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── main ───────────────────────────────────────────────────────────────────
interface PreparedChunk {
  content: string;
  content_hash: string;
  source_name: string;
  source_url: string;
  source_body: string;
  specialty_tags: string[];
  license: string | null;
  last_updated: string | null;
}

async function loadDocument(folder: string, file: string): Promise<PreparedChunk[]> {
  const stem = basename(file, extname(file));
  const metaPath = join(folder, `${stem}.meta.json`);

  let metaRaw: string;
  try {
    metaRaw = await readFile(metaPath, "utf8");
  } catch {
    console.warn(`  · skipping ${file} — missing ${stem}.meta.json`);
    return [];
  }

  let meta: Meta;
  try {
    meta = JSON.parse(metaRaw);
  } catch (e) {
    console.warn(`  · skipping ${file} — invalid JSON in meta:`, e);
    return [];
  }
  if (!meta.source_name || !meta.source_url || !meta.source_body) {
    console.warn(`  · skipping ${file} — meta missing source_name/source_url/source_body`);
    return [];
  }

  const body = await readFile(join(folder, file), "utf8");
  const pieces = chunkText(body);

  return pieces.map((content) => ({
    content,
    content_hash: hashChunk(meta.source_url, content),
    source_name: meta.source_name,
    source_url: meta.source_url,
    source_body: meta.source_body,
    specialty_tags: meta.specialty_tags ?? [],
    license: meta.license ?? null,
    last_updated: meta.last_updated ?? null,
  }));
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: npm run ingest:knowledge -- <folder>");
    process.exit(1);
  }

  await loadEnvLocal();

  if (!process.env.VOYAGE_API_KEY) {
    console.error("VOYAGE_API_KEY is not set (check .env.local).");
    process.exit(1);
  }

  const supabase = getSupabase();
  const entries = await readdir(folder);
  const docs = entries.filter((f) => TEXT_EXTS.has(extname(f).toLowerCase()));

  console.log(`Ingesting from ${folder}`);
  console.log(`Model: ${EMBEDDING_MODEL}`);
  console.log(`Documents: ${docs.length}`);

  const all: PreparedChunk[] = [];
  for (const file of docs) {
    const chunks = await loadDocument(folder, file);
    console.log(`  · ${file}: ${chunks.length} chunks`);
    all.push(...chunks);
  }

  if (all.length === 0) {
    console.log("Nothing to ingest.");
    return;
  }

  // Embed in batches; skip chunks whose hash already exists (saves Voyage cost).
  const hashes = all.map((c) => c.content_hash);
  const existing = new Set<string>();
  for (let i = 0; i < hashes.length; i += 200) {
    const slice = hashes.slice(i, i + 200);
    const { data, error } = await supabase
      .from("knowledge_chunks")
      .select("content_hash")
      .in("content_hash", slice);
    if (error) throw error;
    for (const row of data ?? []) existing.add(row.content_hash);
  }
  const fresh = all.filter((c) => !existing.has(c.content_hash));
  console.log(`Embedding ${fresh.length} new chunks (${existing.size} already present).`);

  let inserted = 0;
  for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
    const batch = fresh.slice(i, i + BATCH_SIZE);
    const embeddings = await embedDocuments(batch.map((c) => c.content));
    const rows = batch.map((c, idx) => ({ ...c, embedding: embeddings[idx] }));

    const { error } = await supabase
      .from("knowledge_chunks")
      .upsert(rows, { onConflict: "content_hash" });
    if (error) throw error;

    inserted += rows.length;
    console.log(`  ✓ upserted ${inserted}/${fresh.length}`);
  }

  console.log(`Done. ${inserted} new chunks ingested, ${existing.size} unchanged.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
