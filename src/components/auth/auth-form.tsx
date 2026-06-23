"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!isSupabaseConfigured) {
      setError("Supabase isn't configured yet. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to .env.local.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${publicEnv.appUrl}/auth/callback?redirect=${encodeURIComponent(redirect)}` },
        });
        if (error) throw error;
        // If email confirmation is required, there's no active session yet.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push(redirect);
          router.refresh();
        } else {
          setNotice("Check your inbox to confirm your email, then log in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">
          <Sparkles className="h-4 w-4 text-white" />
        </span>
        AdMagic
      </Link>

      <div className="card p-6">
        <h1 className="text-lg font-semibold">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-ink-400">
          {isSignup ? "Start generating product ads in minutes." : "Log in to your dashboard."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="you@brand.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">Password</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base"
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {isSignup ? "Create account" : "Log in"}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-ink-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-brand-300 hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to AdMagic?{" "}
            <Link href="/signup" className="text-brand-300 hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
