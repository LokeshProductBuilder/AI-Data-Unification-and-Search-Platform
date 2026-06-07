import { type Provider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { embedBatch, toVectorLiteral } from "@/lib/embeddings";
import type { NormalizedEmail } from "@/types";

/** The text we embed for each email: subject + body, trimmed. */
function embeddingInput(email: NormalizedEmail): string {
  return [email.subject, email.bodyText ?? email.snippet ?? ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);
}

/**
 * Persist a batch of normalised emails and their embeddings.
 *
 * Prisma can't write the `Unsupported("vector")` column directly, so we upsert
 * the scalar fields with the client and then set the embedding via raw SQL.
 * Returns the number of rows written.
 */
export async function storeEmails(
  userId: string,
  accountId: string,
  provider: Provider,
  emails: NormalizedEmail[],
): Promise<number> {
  if (emails.length === 0) return 0;

  const embeddings = await embedBatch(emails.map(embeddingInput));

  let written = 0;
  const CHUNK = 25;
  for (let i = 0; i < emails.length; i += CHUNK) {
    const slice = emails.slice(i, i + CHUNK);
    const sliceEmbeddings = embeddings.slice(i, i + CHUNK);

    await prisma.$transaction(
      slice.flatMap((email, j) => {
        const literal = toVectorLiteral(sliceEmbeddings[j]);
        return [
          prisma.email.upsert({
            where: {
              accountId_externalId: {
                accountId,
                externalId: email.externalId,
              },
            },
            create: {
              userId,
              accountId,
              provider,
              externalId: email.externalId,
              threadId: email.threadId,
              fromName: email.fromName,
              fromEmail: email.fromEmail,
              toEmails: email.toEmails,
              subject: email.subject,
              snippet: email.snippet,
              bodyText: email.bodyText,
              receivedAt: email.receivedAt,
              isRead: email.isRead,
              labels: email.labels,
            },
            update: {
              subject: email.subject,
              snippet: email.snippet,
              bodyText: email.bodyText,
              isRead: email.isRead,
              labels: email.labels,
            },
          }),
          // Set the vector column by external id (unique within the account).
          prisma.$executeRaw`
            UPDATE "Email"
            SET embedding = ${literal}::vector
            WHERE "accountId" = ${accountId}
              AND "externalId" = ${email.externalId}
          `,
        ];
      }),
    );

    written += slice.length;
  }

  return written;
}
