import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { getOAuthConfig, type PlatformId } from "@/lib/social/oauth";
import { encryptToken } from "@/lib/crypto/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSec?: number;
  externalId: string;
  username?: string;
  scopes: string[];
}

/** Platform-specific authorization-code → token exchange. */
async function exchangeCode(
  platform: PlatformId,
  code: string,
  config: NonNullable<ReturnType<typeof getOAuthConfig>>,
): Promise<TokenResult> {
  if (platform === "tiktok") {
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error_description || json.error || "TikTok token exchange failed");
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresInSec: json.expires_in,
      externalId: json.open_id ?? "tiktok",
      scopes: (json.scope ?? "").split(",").filter(Boolean),
    };
  }

  if (platform === "youtube") {
    const res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error_description || json.error || "Google token exchange failed");
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresInSec: json.expires_in,
      externalId: "youtube", // resolve the channel id via youtube.channels.list afterwards
      scopes: (json.scope ?? "").split(" ").filter(Boolean),
    };
  }

  // instagram (Meta)
  const res = await fetch(
    `${config.tokenUrl}?${new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    })}`,
  );
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || "Meta token exchange failed");
  return {
    accessToken: json.access_token,
    expiresInSec: json.expires_in,
    externalId: "instagram", // resolve the IG business account id via the Graph API afterwards
    scopes: config.scopes,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const origin = req.nextUrl.origin;
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");

  if (err) return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(err)}`);
  if (!code) return NextResponse.redirect(`${origin}/accounts?error=missing_code`);

  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.redirect(`${origin}/login?redirect=/accounts`);

  const config = getOAuthConfig(platform as PlatformId);
  if (!config) return NextResponse.redirect(`${origin}/accounts?error=needs_setup`);

  try {
    const token = await exchangeCode(platform as PlatformId, code, config);
    const supabase = await createClient();

    const expiresAt = token.expiresInSec
      ? new Date(Date.now() + token.expiresInSec * 1000).toISOString()
      : null;

    await supabase.from("connected_accounts").upsert(
      {
        account_id: ctx.account.id,
        platform,
        external_id: token.externalId,
        username: token.username ?? null,
        access_token_enc: encryptToken(token.accessToken),
        refresh_token_enc: token.refreshToken ? encryptToken(token.refreshToken) : null,
        token_expires_at: expiresAt,
        scopes: token.scopes,
        status: "active",
      },
      { onConflict: "account_id,platform,external_id" },
    );

    return NextResponse.redirect(`${origin}/accounts?connected=${platform}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : "connection_failed";
    return NextResponse.redirect(`${origin}/accounts?error=${encodeURIComponent(message)}`);
  }
}
