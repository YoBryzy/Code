-- ─────────────────────────────────────────────────────────────────────────────
-- AdMagic — initial schema
--
-- Multi-tenant SaaS. Every domain row is scoped by account_id and protected by
-- Row-Level Security. A user reaches a row only through a membership in that
-- row's account. Workers use the service-role key (bypasses RLS) and filter by
-- the account_id stored on each job.
--
-- Apply via the Supabase SQL editor or `supabase db push`.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;          -- gen_random_uuid()

-- ── Shared helpers ───────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- SECURITY DEFINER so it bypasses RLS on memberships and never recurses into a
-- membership policy. This is the membership check every other table's RLS uses.
create or replace function public.is_account_member(p_account uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.memberships m
    where m.account_id = p_account
      and m.user_id = auth.uid()
  );
$$;

-- ── Accounts & membership ────────────────────────────────────────────────────

create table public.accounts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  plan               text not null default 'free'
                       check (plan in ('free','starter','growth','agency')),
  stripe_customer_id text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  created_at  timestamptz not null default now(),
  unique (account_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

-- Atomically create an account and make the caller its owner. Called from the
-- app with the user's session; SECURITY DEFINER lets it write the first
-- membership before any membership exists.
create or replace function public.create_account(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.accounts (name) values (coalesce(nullif(p_name,''),'My workspace'))
    returning id into v_account;
  insert into public.memberships (account_id, user_id, role)
    values (v_account, auth.uid(), 'owner');
  return v_account;
end;
$$;

-- ── Brand kits ───────────────────────────────────────────────────────────────

create table public.brand_kits (
  id                 uuid primary key default gen_random_uuid(),
  account_id         uuid not null references public.accounts(id) on delete cascade,
  name               text not null default 'Default',
  brand_name         text,
  logo_url           text,
  primary_color      text,
  secondary_color    text,
  accent_color       text,
  font_style         text,
  tone_of_voice      text,
  target_audience    text,
  cta_style          text,
  caption_style      text,
  hashtags           text[] not null default '{}',
  default_platforms  text[] not null default '{}',
  default_post_times jsonb  not null default '{}'::jsonb,
  is_default         boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index brand_kits_account_idx on public.brand_kits(account_id);

-- ── Connected social accounts (encrypted tokens) ─────────────────────────────

create table public.connected_accounts (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts(id) on delete cascade,
  platform          text not null check (platform in ('tiktok','instagram','youtube')),
  external_id       text not null,
  username          text,
  display_name      text,
  avatar_url        text,
  access_token_enc  text,                 -- AES-256-GCM ciphertext, never plaintext
  refresh_token_enc text,
  token_expires_at  timestamptz,
  scopes            text[] not null default '{}',
  status            text not null default 'active'
                      check (status in ('active','expired','revoked','error')),
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (account_id, platform, external_id)
);
create index connected_accounts_account_idx on public.connected_accounts(account_id);

-- ── Products (normalized sources) ─────────────────────────────────────────────

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  source_type text not null
                check (source_type in ('product_url','tiktok','reel','upload','manual')),
  source_url  text,
  name        text not null default 'Untitled product',
  status      text not null default 'pending'
                check (status in ('pending','analyzing','ready','failed')),
  brief       jsonb,                       -- validated ProductBrief
  raw_extract jsonb,                        -- scraped OG/JSON-LD/page data
  owns_rights boolean not null default false,
  error       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_account_created_idx on public.products(account_id, created_at desc);

create table public.product_assets (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  kind         text not null check (kind in ('image','video')),
  storage_path text not null,
  source_url   text,
  mime_type    text,
  width        int,
  height       int,
  duration_sec numeric,
  created_at   timestamptz not null default now()
);
create index product_assets_product_idx on public.product_assets(product_id);

create table public.creative_teardowns (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.accounts(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete cascade,
  source_caption text,
  teardown       jsonb not null,            -- validated CreativeTeardown
  created_at     timestamptz not null default now()
);
create index creative_teardowns_product_idx on public.creative_teardowns(product_id);

-- ── AI strategy & concepts ────────────────────────────────────────────────────

create table public.strategy_packs (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  pack        jsonb not null,               -- validated StrategyPack
  model       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create index strategy_packs_product_idx on public.strategy_packs(product_id, created_at desc);

create table public.ad_concepts (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.accounts(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete cascade,
  strategy_pack_id uuid references public.strategy_packs(id) on delete set null,
  title            text,
  hook             text,
  script           jsonb,                   -- one ScriptVariant (storyboard etc.)
  caption          text,
  cta              text,
  hashtags         text[] not null default '{}',
  style            text,
  status           text not null default 'draft' check (status in ('draft','approved')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index ad_concepts_product_idx on public.ad_concepts(product_id);

-- ── Campaigns (series) & content plan ─────────────────────────────────────────

create table public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.accounts(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  brand_kit_id uuid references public.brand_kits(id) on delete set null,
  name         text not null default 'Untitled campaign',
  platforms    text[] not null default '{}',
  cadence      text not null default 'daily' check (cadence in ('daily','weekdays','custom')),
  autopilot    boolean not null default false,
  status       text not null default 'draft'
                 check (status in ('draft','active','paused','completed')),
  starts_on    date,
  days_total   int not null default 30,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index campaigns_account_idx on public.campaigns(account_id, created_at desc);

create table public.content_plan_items (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.accounts(id) on delete cascade,
  campaign_id    uuid not null references public.campaigns(id) on delete cascade,
  day_index      int not null,
  scheduled_date date,
  plan           jsonb not null,            -- one ContentPlanDay
  status         text not null default 'planned'
                   check (status in ('planned','generating','ready','scheduled','skipped')),
  video_id       uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (campaign_id, day_index)
);
create index content_plan_items_campaign_idx on public.content_plan_items(campaign_id, day_index);

-- ── Videos & render jobs ──────────────────────────────────────────────────────

create table public.videos (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.accounts(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  ad_concept_id  uuid references public.ad_concepts(id) on delete set null,
  campaign_id    uuid references public.campaigns(id) on delete set null,
  title          text,
  aspect         text not null default '9:16',
  width          int not null default 1080,
  height         int not null default 1920,
  duration_sec   numeric,
  storage_path   text,
  thumbnail_path text,
  status         text not null default 'draft'
                   check (status in ('draft','rendering','ready','failed')),
  error          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index videos_account_status_idx on public.videos(account_id, status);

create table public.render_jobs (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  video_id    uuid not null references public.videos(id) on delete cascade,
  status      text not null default 'queued'
                check (status in ('queued','running','done','failed')),
  inputs      jsonb not null default '{}'::jsonb,
  attempts    int not null default 0,
  error       text,
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index render_jobs_queue_idx on public.render_jobs(status, created_at);

-- ── Scheduling, posting & metrics ─────────────────────────────────────────────

create table public.scheduled_posts (
  id                    uuid primary key default gen_random_uuid(),
  account_id            uuid not null references public.accounts(id) on delete cascade,
  video_id              uuid not null references public.videos(id) on delete cascade,
  campaign_id           uuid references public.campaigns(id) on delete set null,
  connected_account_id  uuid references public.connected_accounts(id) on delete set null,
  platform              text not null check (platform in ('tiktok','instagram','youtube')),
  scheduled_for         timestamptz not null,
  caption               text,
  hashtags              text[] not null default '{}',
  status                text not null default 'pending_review'
                          check (status in ('pending_review','scheduled','publishing',
                                            'published','failed','canceled')),
  external_post_id      text,
  error                 text,
  published_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index scheduled_posts_due_idx on public.scheduled_posts(status, scheduled_for);
create index scheduled_posts_account_idx on public.scheduled_posts(account_id, scheduled_for);

create table public.post_metrics (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts(id) on delete cascade,
  scheduled_post_id uuid not null references public.scheduled_posts(id) on delete cascade,
  views             int not null default 0,
  likes             int not null default 0,
  comments          int not null default 0,
  shares            int not null default 0,
  saves             int not null default 0,
  clicks            int not null default 0,
  captured_at       timestamptz not null default now()
);
create index post_metrics_post_idx on public.post_metrics(scheduled_post_id, captured_at desc);

create table public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  kind       text not null,                  -- e.g. 'analysis','strategy','render','post'
  quantity   int not null default 1,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index usage_events_account_idx on public.usage_events(account_id, created_at desc);

-- ── updated_at triggers ───────────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'accounts','brand_kits','connected_accounts','products','ad_concepts',
    'campaigns','content_plan_items','videos','render_jobs','scheduled_posts'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- ── Row-Level Security ─────────────────────────────────────────────────────────
-- Every domain table: members of the row's account may read/write. Workers use
-- the service-role key which bypasses RLS entirely.

alter table public.accounts            enable row level security;
alter table public.memberships         enable row level security;
alter table public.brand_kits          enable row level security;
alter table public.connected_accounts  enable row level security;
alter table public.products            enable row level security;
alter table public.product_assets      enable row level security;
alter table public.creative_teardowns  enable row level security;
alter table public.strategy_packs      enable row level security;
alter table public.ad_concepts         enable row level security;
alter table public.campaigns           enable row level security;
alter table public.content_plan_items  enable row level security;
alter table public.videos              enable row level security;
alter table public.render_jobs         enable row level security;
alter table public.scheduled_posts     enable row level security;
alter table public.post_metrics        enable row level security;
alter table public.usage_events        enable row level security;

-- accounts: visible to members; updatable by members.
create policy accounts_select on public.accounts
  for select using (public.is_account_member(id));
create policy accounts_update on public.accounts
  for update using (public.is_account_member(id)) with check (public.is_account_member(id));

-- memberships: a user sees memberships of accounts they belong to (definer fn → no recursion).
create policy memberships_select on public.memberships
  for select using (public.is_account_member(account_id));
-- A user may remove their own membership (leave). Owner/admin management is done server-side.
create policy memberships_delete on public.memberships
  for delete using (user_id = auth.uid());

-- Generic account-scoped policy for the remaining tables.
do $$
declare t text;
begin
  foreach t in array array[
    'brand_kits','connected_accounts','products','product_assets','creative_teardowns',
    'strategy_packs','ad_concepts','campaigns','content_plan_items','videos',
    'render_jobs','scheduled_posts','post_metrics','usage_events'
  ] loop
    execute format(
      'create policy %1$s_rw on public.%1$I
         for all
         using (public.is_account_member(account_id))
         with check (public.is_account_member(account_id));', t);
  end loop;
end $$;

grant execute on function public.create_account(text) to authenticated;

-- ── Storage buckets ────────────────────────────────────────────────────────────
-- Private buckets. The app writes objects under an `<account_id>/...` path prefix
-- and serves them via short-lived signed URLs minted server-side (after a
-- membership check). Public exposure only happens when a video is published to a
-- social platform through its official API.

insert into storage.buckets (id, name, public)
values ('product-assets','product-assets', false),
       ('renders','renders', false),
       ('brand','brand', false)
on conflict (id) do nothing;

-- Authenticated users may operate within these buckets; the server enforces
-- per-account path scoping + signed-URL issuance. (Tighten to path-based RLS
-- using the `<account_id>/` prefix before opening uploads to untrusted clients.)
create policy "admagic objects: authenticated read" on storage.objects
  for select to authenticated
  using (bucket_id in ('product-assets','renders','brand'));
create policy "admagic objects: authenticated write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-assets','renders','brand'));
create policy "admagic objects: authenticated update" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-assets','renders','brand'));
create policy "admagic objects: authenticated delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-assets','renders','brand'));
