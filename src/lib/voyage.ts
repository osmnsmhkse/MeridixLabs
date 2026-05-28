// Voyage AI embedding client.
//
// Single config constant `EMBEDDING_MODEL` + `EMBEDDING_DIM` so the
// model can be swapped without touching call sites. The migration's
// `vector(N)` column dimension MUST match `EMBEDDING_DIM` — if you
// change the model here, write a new migration.

export const EMBEDDING_MODEL = "voyage-3-large";
export const EMBEDDING_DIM = 1024;

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

// `input_type` lets Voyage produce asymmetric query/document embeddings.
type InputType = "query" | "document";

interface VoyageResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage?: { total_tokens?: number };
}

function getKey(): string {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY is not set");
  return key;
}

export function isVoyageConfigured(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

async function embedBatch(inputs: string[], inputType: InputType): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({
      input: inputs,
      model: EMBEDDING_MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Voyage API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as VoyageResponse;
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text], "query");
  return vec;
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return embedBatch(texts, "document");
}
