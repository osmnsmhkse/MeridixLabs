// Retrieval helper for the RAG layer.
//
// `retrieveChunks(query, k)` embeds the query via Voyage and runs a
// cosine-similarity search against `knowledge_chunks` via the
// `match_knowledge_chunks` Postgres RPC. Returns top-k chunks with
// the metadata needed for citations.

import { supabaseServer } from "./supabase";
import { embedQuery, isVoyageConfigured } from "./voyage";

export interface RetrievedChunk {
  id: string;
  content: string;
  source_name: string;
  source_url: string;
  source_body: string;
  specialty_tags: string[];
  similarity: number;
}

export const DEFAULT_K = 6;

export interface RetrieveOptions {
  k?: number;
  specialty?: string[];
}

export async function retrieveChunks(
  query: string,
  options: RetrieveOptions = {}
): Promise<RetrievedChunk[]> {
  const { k = DEFAULT_K, specialty } = options;

  if (!isVoyageConfigured()) return [];
  if (!query.trim()) return [];

  const embedding = await embedQuery(query);
  const supabase = supabaseServer();

  const { data, error } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: embedding,
    match_count: k,
    specialty_filter: specialty && specialty.length > 0 ? specialty : null,
  });

  if (error) {
    console.error("retrieveChunks: rpc error", error);
    return [];
  }

  return (data ?? []) as RetrievedChunk[];
}
