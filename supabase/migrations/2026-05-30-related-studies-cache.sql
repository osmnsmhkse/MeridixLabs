-- Cache for PubMed "Related Studies" lookups so we don't re-hit NCBI for the
-- same marker, and don't re-generate the same abstract-grounded relevance note.
--
--   • pubmed_marker_cache — one row per normalized marker key. Stores the full
--     article list (with relevance notes) as JSON. TTL enforced in app code via
--     fetched_at.
create table if not exists public.pubmed_marker_cache (
  marker_key   text primary key,                 -- normalized marker + direction + lang
  marker_label text not null,                     -- human-readable marker name
  articles     jsonb not null default '[]'::jsonb,-- [{pmid,title,journal,year,pubType,url,note}]
  fetched_at   timestamptz not null default now()
);

create index if not exists pubmed_marker_cache_fetched_idx on public.pubmed_marker_cache(fetched_at desc);

-- Service-role access only (RLS denies anon by default once enabled). All reads
-- and writes go through the /api/related-studies route using supabaseServer().
alter table public.pubmed_marker_cache enable row level security;
