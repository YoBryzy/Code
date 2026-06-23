/**
 * Centralized environment access.
 *
 * - `publicEnv` values are safe in the browser (they're `NEXT_PUBLIC_*`).
 * - `serverEnv()` reads server-only secrets and must never be imported into a
 *   Client Component. Each getter throws a clear error if a required var is
 *   missing, so misconfiguration fails loudly instead of at a random call site.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". See .env.example and set it in .env.local (local) or your host's secret manager (prod).`,
    );
  }
  return value;
}

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY);
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  },
  get tokenEncryptionKey() {
    return required("TOKEN_ENCRYPTION_KEY", process.env.TOKEN_ENCRYPTION_KEY);
  },
  get workerSecret() {
    return required("WORKER_SECRET", process.env.WORKER_SECRET);
  },
};

/** True when the two vars needed to render the app without crashing are present. */
export const isSupabaseConfigured = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseAnonKey,
);
