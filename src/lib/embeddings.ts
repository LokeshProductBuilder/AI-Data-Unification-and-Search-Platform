import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: serverEnv.openaiApiKey() });
  return client;
}

/** Embed a single string (used for search queries). */
export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector;
}

/**
 * Embed many strings. OpenAI accepts up to ~2048 inputs per request; we chunk
 * conservatively and truncate each input to stay within token limits.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const CHUNK = 100;
  for (let i = 0; i < texts.length; i += CHUNK) {
    const inputs = texts
      .slice(i, i + CHUNK)
      .map((t) => (t || " ").slice(0, 8000));
    const res = await openai().embeddings.create({
      model: EMBEDDING_MODEL,
      input: inputs,
    });
    for (const item of res.data) out.push(item.embedding);
  }
  return out;
}

/** Format a JS number[] as a pgvector literal: "[0.1,0.2,...]". */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
