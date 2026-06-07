import { NextRequest, NextResponse } from "next/server";
import { gmailExchangeCode } from "@/lib/gmail";
import { saveConnectedAccount } from "@/lib/accounts";
import { requireUserId } from "@/lib/user";
import { appUrl } from "@/lib/env";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const dashboard = (status: string) =>
    NextResponse.redirect(`${appUrl()}/dashboard?connect=${status}`);

  if (error) return dashboard("error");
  if (!code) return dashboard("missing_code");

  // CSRF: the state must match the cookie we set when starting the flow.
  const expected = req.cookies.get("oauth_state_gmail")?.value;
  if (!expected || expected !== state) return dashboard("state_mismatch");

  try {
    const userId = await requireUserId();
    const tokens = await gmailExchangeCode(code);
    await saveConnectedAccount(userId, "GMAIL", tokens);

    const res = dashboard("gmail_connected");
    res.cookies.delete("oauth_state_gmail");
    return res;
  } catch (e) {
    console.error("Gmail connect failed:", e);
    return dashboard("error");
  }
}
