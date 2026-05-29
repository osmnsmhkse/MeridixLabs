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

const MAX_RETRIES = 5;

async function embedBatch(inputs: string[], inputType: InputType): Promise<number[][]> {
  let attempt = 0;
  while (true) {
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

    // Retry on 429 (rate limit) and 5xx with exponential backoff.
    // Respect Retry-After header when present.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? parseFloat(retryAfterHeader) : NaN;
      const backoffSec = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? retryAfterSec
        : Math.min(60, 5 * Math.pow(2, attempt)); // 5,10,20,40,60s
      // eslint-disable-next-line no-console
      console.warn(`  ⚠ Voyage ${res.status} — retrying in ${backoffSec.toFixed(0)}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, backoffSec * 1000));
      attempt += 1;
      continue;
    }

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
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedBatch([text], "query");
  return vec;
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return embedBatch(texts, "document");
}
