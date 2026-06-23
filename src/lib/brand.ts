import { createClient } from "@/lib/supabase/server";
import type { BrandKitContext } from "@/lib/types";

/** Load the account's default brand kit as a context object for AI generation. */
export async function getBrandContext(accountId: string): Promise<BrandKitContext | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("account_id", accountId)
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    brandName: data.brand_name,
    toneOfVoice: data.tone_of_voice,
    targetAudience: data.target_audience,
    ctaStyle: data.cta_style,
    captionStyle: data.caption_style,
    hashtags: data.hashtags,
    primaryColor: data.primary_color,
  };
}
