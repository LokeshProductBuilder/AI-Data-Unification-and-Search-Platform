import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";

export const CLAUDE_MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: serverEnv.anthropicApiKey() });
  return client;
}
