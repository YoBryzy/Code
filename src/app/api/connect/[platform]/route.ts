import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/account";
import { getOAuthConfig, type PlatformId } from "@/lib/social/oauth";

export const dynamic = "force-dynamic";

const VALID: PlatformId[] = ["tiktok", "instagram", "youtube"];

/** Starts the OAuth flow for a platform (or explains that setup is needed). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const origin = req.nextUrl.origin;

  if (!VALID.includes(platform as PlatformId)) {
    return NextResponse.redirect(`${origin}/accounts?error=unknown_platform`);
  }

  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.redirect(`${origin}/login?redirect=/accounts`);

  const config = getOAuthConfig(platform as PlatformId);
  if (!config) {
    // App credentials not configured yet — see .env.example + docs/COMPLIANCE.md.
    return NextResponse.redirect(`${origin}/accounts?error=needs_setup&platform=${platform}`);
  }

  // State carries the platform + a nonce for CSRF. (For production, also set a
  // signed state cookie and verify it in the callback.)
  const state = Buffer.from(
    JSON.stringify({ platform, account: ctx.account.id, n: crypto.randomUUID() }),
  ).toString("base64url");

  return NextResponse.redirect(config.authorizeUrl(state));
}
