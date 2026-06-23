import { createClient } from "@/lib/supabase/server";
import type { Account } from "@/lib/types";

export interface SessionContext {
  userId: string;
  email: string | null;
  account: Account;
}

/**
 * Resolve the logged-in user and their primary account. If the user has no
 * account yet (first login), provision one via the `create_account` RPC.
 * Returns null when there is no authenticated user.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // First membership the user belongs to (MVP: one account per user).
  const { data: membership } = await supabase
    .from("memberships")
    .select("account_id, accounts(id, name, plan, created_at)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  let account = (membership?.accounts ?? null) as Account | null;

  if (!account) {
    const fallbackName = user.email ? `${user.email.split("@")[0]}'s workspace` : "My workspace";
    const { data: newAccountId, error } = await supabase.rpc("create_account", {
      p_name: fallbackName,
    });
    if (error || !newAccountId) {
      throw new Error(`Could not provision an account: ${error?.message ?? "unknown error"}`);
    }
    const { data: created } = await supabase
      .from("accounts")
      .select("id, name, plan, created_at")
      .eq("id", newAccountId)
      .single();
    account = created as Account;
  }

  return { userId: user.id, email: user.email ?? null, account };
}

/** Like getSessionContext, but throws if unauthenticated — for API routes. */
export async function requireSessionContext(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("Not authenticated");
  return ctx;
}
