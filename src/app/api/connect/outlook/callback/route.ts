import { NextRequest, NextResponse } from "next/server";
import { outlookExchangeCode } from "@/lib/outlook";
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

  const expected = req.cookies.get("oauth_state_outlook")?.value;
  if (!expected || expected !== state) return dashboard("state_mismatch");

  try {
    const userId = await requireUserId();
    const tokens = await outlookExchangeCode(code);
    await saveConnectedAccount(userId, "OUTLOOK", tokens);

    const res = dashboard("outlook_connected");
    res.cookies.delete("oauth_state_outlook");
    return res;
  } catch (e) {
    console.error("Outlook connect failed:", e);
    return dashboard("error");
  }
}
