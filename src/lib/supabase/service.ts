import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Service-role Supabase client. **Bypasses Row-Level Security** — use only in
 * trusted server contexts (workers, internal jobs) and always filter by the
 * `account_id` you intend to act on. Never expose this client or its key to the
 * browser.
 */
export function createServiceClient() {
  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
