import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Bound to the request's auth cookies, so every query is RLS-scoped to the
 * logged-in user. In Next 15 `cookies()` is async.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` is called from a Server Component where mutating cookies is
          // not allowed; the middleware refreshes the session instead. Safe to ignore.
        }
      },
    },
  });
}
