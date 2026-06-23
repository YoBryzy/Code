import type {
  ProductBrief,
  CreativeTeardown,
  StrategyPack,
  ContentPlan,
  ContentPlanDay,
  ScriptVariant,
} from "@/lib/ai/schemas";

export type {
  ProductBrief,
  CreativeTeardown,
  StrategyPack,
  ContentPlan,
  ContentPlanDay,
  ScriptVariant,
};

export type Platform = "tiktok" | "instagram" | "youtube";
export type SourceType = "product_url" | "tiktok" | "reel" | "upload" | "manual";
export type ProductStatus = "pending" | "analyzing" | "ready" | "failed";
export type VideoStatus = "draft" | "rendering" | "ready" | "failed";
export type PostStatus =
  | "pending_review"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "canceled";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";

/** Brand context passed into AI generation so output matches the user's brand. */
export interface BrandKitContext {
  brandName?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  ctaStyle?: string | null;
  captionStyle?: string | null;
  hashtags?: string[] | null;
  primaryColor?: string | null;
}

// ── Database row shapes (subset used by the UI) ───────────────────────────────

export interface Account {
  id: string;
  name: string;
  plan: "free" | "starter" | "growth" | "agency";
  created_at: string;
}

export interface Product {
  id: string;
  account_id: string;
  source_type: SourceType;
  source_url: string | null;
  name: string;
  status: ProductStatus;
  brief: ProductBrief | null;
  raw_extract: Record<string, unknown> | null;
  owns_rights: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyPackRow {
  id: string;
  account_id: string;
  product_id: string;
  pack: StrategyPack;
  model: string | null;
  created_at: string;
}

export interface CreativeTeardownRow {
  id: string;
  product_id: string;
  teardown: CreativeTeardown;
  source_caption: string | null;
  created_at: string;
}

export interface BrandKit {
  id: string;
  account_id: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_style: string | null;
  tone_of_voice: string | null;
  target_audience: string | null;
  cta_style: string | null;
  caption_style: string | null;
  hashtags: string[];
  default_platforms: string[];
  is_default: boolean;
  updated_at: string;
}

export interface Campaign {
  id: string;
  account_id: string;
  product_id: string;
  name: string;
  platforms: Platform[];
  cadence: "daily" | "weekdays" | "custom";
  autopilot: boolean;
  status: CampaignStatus;
  starts_on: string | null;
  days_total: number;
  created_at: string;
}

export interface Video {
  id: string;
  account_id: string;
  title: string | null;
  status: VideoStatus;
  duration_sec: number | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  username: string | null;
  display_name: string | null;
  status: "active" | "expired" | "revoked" | "error";
  created_at: string;
}

export interface ScheduledPost {
  id: string;
  video_id: string;
  platform: Platform;
  scheduled_for: string;
  caption: string | null;
  status: PostStatus;
  created_at: string;
}

/** Compact "what's working" summary injected into generation prompts. */
export interface PerformanceSummary {
  bestHookTypes?: string[];
  bestStyles?: string[];
  bestPostTimes?: string[];
  notes?: string;
}
