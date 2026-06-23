import { publicEnv } from "@/lib/env";

export type PlatformId = "tiktok" | "instagram" | "youtube";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  tokenUrl: string;
  authorizeUrl: (state: string) => string;
}

/**
 * Returns the OAuth config for a platform, or null if the required app
 * credentials aren't set (so the UI can show a "needs setup" message instead
 * of a broken redirect). All values come from server-only env vars.
 */
export function getOAuthConfig(platform: PlatformId): OAuthConfig | null {
  const fallback = (p: string) => `${publicEnv.appUrl}/api/connect/${p}/callback`;

  switch (platform) {
    case "tiktok": {
      const clientId = process.env.TIKTOK_CLIENT_KEY;
      const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      const redirectUri = process.env.TIKTOK_REDIRECT_URI || fallback("tiktok");
      const scopes = ["user.info.basic", "video.upload", "video.publish"];
      return {
        clientId,
        clientSecret,
        redirectUri,
        scopes,
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        authorizeUrl: (state) =>
          `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({
            client_key: clientId,
            scope: scopes.join(","),
            response_type: "code",
            redirect_uri: redirectUri,
            state,
          })}`,
      };
    }
    case "instagram": {
      const clientId = process.env.META_APP_ID;
      const clientSecret = process.env.META_APP_SECRET;
      if (!clientId || !clientSecret) return null;
      const redirectUri = process.env.META_REDIRECT_URI || fallback("instagram");
      const scopes = ["instagram_basic", "instagram_content_publish", "pages_show_list", "business_management"];
      return {
        clientId,
        clientSecret,
        redirectUri,
        scopes,
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        authorizeUrl: (state) =>
          `https://www.facebook.com/v21.0/dialog/oauth?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scopes.join(","),
            response_type: "code",
            state,
          })}`,
      };
    }
    case "youtube": {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return null;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI || fallback("youtube");
      const scopes = ["https://www.googleapis.com/auth/youtube.upload"];
      return {
        clientId,
        clientSecret,
        redirectUri,
        scopes,
        tokenUrl: "https://oauth2.googleapis.com/token",
        authorizeUrl: (state) =>
          `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: scopes.join(" "),
            access_type: "offline",
            prompt: "consent",
            state,
          })}`,
      };
    }
  }
}
