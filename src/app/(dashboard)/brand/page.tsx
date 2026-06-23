import { getSessionContext } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { BrandForm } from "@/components/brand/brand-form";
import type { BrandKit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const ctx = await getSessionContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("account_id", ctx.account.id)
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <PageHeader
        title="Brand kit"
        description="Saved once, applied to every ad the AI generates — voice, audience, colors, hashtags."
      />
      <BrandForm initial={(data as BrandKit) ?? null} />
    </div>
  );
}
