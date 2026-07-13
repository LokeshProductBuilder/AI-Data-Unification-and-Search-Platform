import { NextRequest } from "next/server";
import { requireUserId } from "@/lib/user";
import { semanticSearch } from "@/lib/search";
import { anthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import type { SearchCitation } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Unify, an assistant that answers questions about the user's own email.
You are given the most relevant emails retrieved from their Gmail and Outlook accounts.

Rules:
- Answer the question directly and concisely using ONLY the provided emails.
- Cite the emails you use inline with bracketed numbers like [1], [3] that match the email indices.
- When relevant, mention the sender and date in prose.
- If the provided emails do not contain the answer, say so plainly — do not invent details.
- Be specific. Synthesize across multiple emails when useful.`;

function buildContext(
  emails: Awaited<ReturnType<typeof semanticSearch>>,
): string {
  return emails
    .map((e, i) => {
      const from = e.fromName
        ? `${e.fromName} <${e.fromEmail ?? ""}>`
        : e.fromEmail ?? "unknown";
      const date = e.receivedAt.toISOString().slice(0, 10);
      const body = (e.bodyText ?? e.snippet ?? "").slice(0, 1500);
      return [
        `[${i + 1}] (${e.provider})`,
        `From: ${from}`,
        `Date: ${date}`,
        `Subject: ${e.subject ?? "(no subject)"}`,
        `Body: ${body}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { query } = (await req.json()) as { query?: string };
  if (!query || query.trim().length === 0) {
    return new Response("Missing query", { status: 400 });
  }

  const results = await semanticSearch(userId, query.trim(), 20);

  const citations: SearchCitation[] = results.map((e) => ({
    id: e.id,
    provider: e.provider,
    fromName: e.fromName,
    fromEmail: e.fromEmail,
    subject: e.subject,
    receivedAt: e.receivedAt.toISOString(),
    similarity: Number(e.similarity),
  }));

  const encoder = new TextEncoder();
  const write = (obj: unknown) => encoder.encode(JSON.stringify(obj) + "\n");

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Emit the sources up front so the UI can render citations immediately.
      controller.enqueue(write({ type: "sources", sources: citations }));

      if (results.length === 0) {
        controller.enqueue(
          write({
            type: "delta",
            text: "I couldn't find any emails related to that. Try connecting an account or syncing first.",
          }),
        );
        controller.enqueue(write({ type: "done" }));
        controller.close();
        return;
      }

      try {
        const claude = anthropic().messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Question: ${query.trim()}\n\nRetrieved emails:\n\n${buildContext(results)}`,
            },
          ],
        });

        claude.on("text", (text) => {
          controller.enqueue(write({ type: "delta", text }));
        });

        await claude.finalMessage();
        controller.enqueue(write({ type: "done" }));
      } catch (e) {
        console.error("Claude stream failed:", e);
        controller.enqueue(
          write({ type: "error", message: "The model failed to respond." }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
