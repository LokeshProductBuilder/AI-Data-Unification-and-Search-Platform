import { prisma } from "@/lib/prisma";
import { embedText, toVectorLiteral } from "@/lib/embeddings";
import type { Provider } from "@prisma/client";

export interface RetrievedEmail {
  id: string;
  provider: Provider;
  fromName: string | null;
  fromEmail: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  receivedAt: Date;
  similarity: number;
}

/**
 * Embed the query and run a pgvector cosine-similarity search over the user's
 * emails, returning the top `limit` matches (default 20).
 */
export async function semanticSearch(
  userId: string,
  query: string,
  limit = 20,
): Promise<RetrievedEmail[]> {
  const vector = await embedText(query);
  const literal = toVectorLiteral(vector);

  // <=> is cosine distance; similarity = 1 - distance.
  const rows = await prisma.$queryRaw<RetrievedEmail[]>`
    SELECT
      id,
      provider,
      "fromName",
      "fromEmail",
      subject,
      snippet,
      "bodyText",
      "receivedAt",
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM "Email"
    WHERE "userId" = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `;

  return rows;
}
