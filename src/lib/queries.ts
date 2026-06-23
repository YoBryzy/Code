/**
 * Server-side data-access layer for the dashboard. In DEMO_MODE every function
 * returns seeded sample data (no Supabase); otherwise it runs the real,
 * RLS-scoped query. Pages call these instead of querying Supabase directly, so
 * demo and live data render through the exact same components.
 */
import { DEMO_MODE } from "@/lib/demo-flag";
import { createClient } from "@/lib/supabase/server";
import * as demo from "@/lib/demo";
import type {
  Product,
  StrategyPack,
  CreativeTeardown,
  Campaign,
  ContentPlanDay,
  Video,
  ScheduledPost,
  ConnectedAccount,
  BrandKit,
} from "@/lib/types";

export async function getCounts(accountId: string) {
  if (DEMO_MODE) return demo.demoCounts;
  const supabase = await createClient();
  const one = async (table: string) =>
    (await supabase.from(table).select("id", { count: "exact", head: true }).eq("account_id", accountId)).count ?? 0;
  const [products, videos, scheduled, campaigns] = await Promise.all([
    one("products"),
    one("videos"),
    one("scheduled_posts"),
    one("campaigns"),
  ]);
  return { products, videos, scheduled, campaigns };
}

export async function listProducts(accountId: string): Promise<Product[]> {
  if (DEMO_MODE) return demo.demoProducts;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, source_type, source_url, status, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Product[];
}

export interface ProductBundle {
  product: Product | null;
  pack: StrategyPack | null;
  teardown: CreativeTeardown | null;
}

export async function getProductBundle(accountId: string, id: string): Promise<ProductBundle> {
  if (DEMO_MODE) {
    const product = demo.demoProducts.find((p) => p.id === id) ?? null;
    return {
      product,
      pack: id === "demo-product-1" ? demo.demoStrategyPack : null,
      teardown: demo.demoTeardown,
    };
  }
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!product) return { product: null, pack: null, teardown: null };

  const [{ data: packRow }, { data: teardownRow }] = await Promise.all([
    supabase
      .from("strategy_packs")
      .select("pack")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("creative_teardowns")
      .select("teardown")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    product: product as Product,
    pack: (packRow?.pack ?? null) as StrategyPack | null,
    teardown: (teardownRow?.teardown ?? null) as CreativeTeardown | null,
  };
}

export async function listCampaigns(accountId: string): Promise<Campaign[]> {
  if (DEMO_MODE) return [demo.demoCampaign];
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("id, name, platforms, days_total, autopilot, status, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Campaign[];
}

export interface CampaignBundle {
  campaign: Campaign | null;
  items: { id: string; day_index: number; plan: ContentPlanDay; status: string }[];
}

export async function getCampaignBundle(accountId: string, id: string): Promise<CampaignBundle> {
  if (DEMO_MODE) {
    return {
      campaign: id === demo.demoCampaign.id ? demo.demoCampaign : null,
      items: demo.demoContentDays,
    };
  }
  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("account_id", accountId)
    .maybeSingle();
  if (!campaign) return { campaign: null, items: [] };
  const { data: items } = await supabase
    .from("content_plan_items")
    .select("id, day_index, plan, status")
    .eq("campaign_id", id)
    .order("day_index", { ascending: true });
  return {
    campaign: campaign as Campaign,
    items: (items ?? []) as CampaignBundle["items"],
  };
}

export async function listVideos(accountId: string): Promise<Video[]> {
  if (DEMO_MODE) return demo.demoVideos;
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, title, status, duration_sec, thumbnail_path, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Video[];
}

export async function listScheduledPosts(accountId: string): Promise<ScheduledPost[]> {
  if (DEMO_MODE) return demo.demoScheduledPosts;
  const supabase = await createClient();
  const { data } = await supabase
    .from("scheduled_posts")
    .select("id, video_id, platform, scheduled_for, caption, status, created_at")
    .eq("account_id", accountId)
    .order("scheduled_for", { ascending: true });
  return (data ?? []) as ScheduledPost[];
}

export async function listPendingPosts(accountId: string): Promise<ScheduledPost[]> {
  if (DEMO_MODE) return demo.demoScheduledPosts.filter((p) => p.status === "pending_review");
  const supabase = await createClient();
  const { data } = await supabase
    .from("scheduled_posts")
    .select("id, video_id, platform, scheduled_for, caption, status, created_at")
    .eq("account_id", accountId)
    .eq("status", "pending_review")
    .order("scheduled_for", { ascending: true });
  return (data ?? []) as ScheduledPost[];
}

export async function listMetricsRows(accountId: string) {
  if (DEMO_MODE) return demo.demoMetricsRows;
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_metrics")
    .select("views, likes, comments, shares, saves")
    .eq("account_id", accountId);
  return (data ?? []) as Record<string, number>[];
}

export async function listConnectedAccounts(accountId: string): Promise<ConnectedAccount[]> {
  if (DEMO_MODE) return demo.demoConnectedAccounts;
  const supabase = await createClient();
  const { data } = await supabase
    .from("connected_accounts")
    .select("id, platform, username, display_name, status, created_at")
    .eq("account_id", accountId);
  return (data ?? []) as ConnectedAccount[];
}

export async function getDefaultBrandKit(accountId: string): Promise<BrandKit | null> {
  if (DEMO_MODE) return demo.demoBrandKit;
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("account_id", accountId)
    .eq("is_default", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BrandKit) ?? null;
}
