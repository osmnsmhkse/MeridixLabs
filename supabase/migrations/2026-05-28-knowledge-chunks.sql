-- ─────────────────────────────────────────────────────────────────────
-- Knowledge chunks — RAG layer for grounded AI answers with citations.
-- Run this in the Supabase SQL editor on your existing project.
-- Safe to re-run (uses IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────

-- pgvector extension
create extension if not exists vector;

-- ── knowledge_chunks ──
-- One row per ~500–800-token chunk of a curated medical source
-- (MedlinePlus articles, USPSTF guidelines, etc). Embedded with
-- Voyage `voyage-3-large` (1024 dims). The ingestion script
-- (scripts/ingest-knowledge.ts) is responsible for chunking,
-- embedding, and upserting. `content_hash` enforces idempotency:
-- re-running ingestion will not duplicate chunks.
create table if not exists public.knowledge_chunks (
  id              uuid primary key default gen_random_uuid(),
  content         text not null,
  content_hash    text not null unique,           -- sha256(source_url + normalized content)
  embedding       vector(1024) not null,          -- voyage-3-large dimension
  source_name     text not null,                  -- e.g. "Hypothyroidism — Diagnosis and treatment"
  source_url      text not null,                  -- canonical URL for citation
  source_body     text not null,                  -- e.g. "MedlinePlus", "USPSTF", "NIH"
  specialty_tags  text[]  default '{}',           -- e.g. {endocrinology, primary_care}
  license         text,                           -- e.g. "Public Domain", "CC-BY-4.0"
  last_updated    date,                           -- as published by the upstream source
  retrieved_at    timestamptz default now()       -- when we ingested it
);

-- Cosine-similarity ANN index. HNSW is fast and accurate for typical
-- knowledge-base sizes; rebuild concurrently if needed in the future.
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using hnsw (embedding vector_cosine_ops);

create index if not exists knowledge_chunks_source_idx
  on public.knowledge_chunks (source_body, source_name);

create index if not exists knowledge_chunks_specialty_idx
  on public.knowledge_chunks using gin (specialty_tags);

-- ── match_knowledge_chunks ──
-- RPC the retrieval helper calls: given a query embedding, return the
-- top-k most similar chunks (optionally filtered by specialty tags).
-- Returns cosine similarity in [0, 1] (1 = identical direction).
create or replace function public.match_knowledge_chunks(
  query_embedding   vector(1024),
  match_count       int default 6,
  specialty_filter  text[] default null
)
returns table (
  id            uuid,
  content       text,
  source_name   text,
  source_url    text,
  source_body   text,
  specialty_tags text[],
  similarity    float
)
language sql
stable
set search_path = public
as $$
  select
    kc.id,
    kc.content,
    kc.source_name,
    kc.source_url,
    kc.source_body,
    kc.specialty_tags,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where specialty_filter is null
     or kc.specialty_tags && specialty_filter
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- ── RLS ──
-- Deny by default; only the service role (API routes / ingestion
-- script) can read or write. Reads happen server-side from the
-- /api/analyze route.
alter table public.knowledge_chunks enable row level security;
