-- Durable analytics storage.
--
-- Replaces the old /tmp JSON-file approach, which silently lost data on
-- Vercel (ephemeral /tmp, not shared across serverless instances). Events
-- now live in Supabase so the admin dashboard reflects real usage.

-- ── Product / usage events ─────────────────────────────────────────────────
-- One row per tracked action: report_uploaded, interpretation_complete,
-- page_view, chat_message, etc. `anon_id` is a per-browser random id (no PII)
-- used to count unique visitors. `user_id` is the Clerk id when signed in.
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  event      text        not null,
  anon_id    text,
  user_id    text,
  props      jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_event_idx   on public.analytics_events(event);
create index if not exists analytics_events_anon_idx    on public.analytics_events(anon_id);
create index if not exists analytics_events_user_idx    on public.analytics_events(user_id);

-- ── A/B test impressions / clicks ──────────────────────────────────────────
create table if not exists public.ab_events (
  id         bigint generated always as identity primary key,
  variant    text        not null,
  action     text        not null check (action in ('shown', 'clicked')),
  anon_id    text,
  created_at timestamptz not null default now()
);

create index if not exists ab_events_created_idx on public.ab_events(created_at desc);
create index if not exists ab_events_variant_idx on public.ab_events(variant);

-- ── Registered users (mirrored from Clerk via webhook) ─────────────────────
-- Lets the dashboard show total sign-ups, including dormant accounts that
-- never fire an event. Populated by /api/webhooks/clerk on user.created and
-- marked deleted on user.deleted.
create table if not exists public.clerk_users (
  id         text primary key,    -- Clerk user id
  email      text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists clerk_users_created_idx on public.clerk_users(created_at desc);

-- Service-role writes/reads only (RLS denies anon by default once enabled).
alter table public.analytics_events enable row level security;
alter table public.ab_events        enable row level security;
alter table public.clerk_users      enable row level security;

-- ── Dashboard aggregation ──────────────────────────────────────────────────
-- Computes the entire admin dashboard payload in one round-trip. Pushing the
-- aggregation into Postgres keeps it accurate at any volume (no row caps) and
-- the API route thin. Called via the service-role key, which bypasses RLS.
create or replace function public.analytics_summary()
returns jsonb
language sql
stable
as $$
  with day0 as (select date_trunc('day', now()) as d),
       interp as (
         select * from public.analytics_events where event = 'interpretation_complete'
       )
  select jsonb_build_object(
    'interpretations', jsonb_build_object(
      'today',    (select count(*) from interp, day0 where created_at >= day0.d),
      'thisWeek', (select count(*) from interp, day0 where created_at >= day0.d - interval '6 days'),
      'allTime',  (select count(*) from interp)
    ),
    'uniqueVisitors', (select count(distinct anon_id) from public.analytics_events where anon_id is not null),
    'signedInUsers',  (select count(distinct user_id) from public.analytics_events where user_id is not null),
    'signups', jsonb_build_object(
      'today',    (select count(*) from public.clerk_users, day0 where deleted_at is null and created_at >= day0.d),
      'thisWeek', (select count(*) from public.clerk_users, day0 where deleted_at is null and created_at >= day0.d - interval '6 days'),
      'total',    (select count(*) from public.clerk_users where deleted_at is null)
    ),
    'totals', jsonb_build_object(
      'uploads',          (select count(*) from public.analytics_events where event in ('report_uploaded','imaging_report_uploaded','scan_image_uploaded')),
      'demos',            (select count(*) from public.analytics_events where event = 'demo_mode_used'),
      'shares',           (select count(*) from public.analytics_events where event in ('share_whatsapp','imaging_share_whatsapp')),
      'emails',           (select count(*) from public.analytics_events where event in ('email_sent','imaging_email_sent')),
      'specialistClicks', (select count(*) from public.analytics_events where event in ('specialist_link_clicked','imaging_specialist_link')),
      'chatMessages',     (select count(*) from public.analytics_events where event = 'chat_message')
    ),
    'tierDistribution', (
      select coalesce(jsonb_object_agg(k, c), '{}'::jsonb)
      from (select props->>'tier' k, count(*) c from interp where props->>'tier' is not null group by 1) t
    ),
    'topTier', (
      select props->>'tier' from interp where props->>'tier' is not null
      group by 1 order by count(*) desc limit 1
    ),
    'langDistribution', (
      select coalesce(jsonb_object_agg(k, c), '{}'::jsonb)
      from (select props->>'language' k, count(*) c from interp where props->>'language' is not null group by 1) t
    ),
    'topLanguage', (
      select props->>'language' from interp where props->>'language' is not null
      group by 1 order by count(*) desc limit 1
    ),
    'topSpecialist', (
      select props->>'specialist' from public.analytics_events
      where event in ('specialist_link_clicked','imaging_specialist_link') and props->>'specialist' is not null
      group by 1 order by count(*) desc limit 1
    ),
    'toolUsage', (
      select coalesce(jsonb_object_agg(k, c), '{}'::jsonb)
      from (select props->>'page' k, count(*) c from public.analytics_events where event = 'page_view' and props->>'page' is not null group by 1) t
    ),
    'dailySeries', (
      select coalesce(jsonb_agg(jsonb_build_object('date', days.day, 'count', coalesce(cnt.c, 0)) order by days.day), '[]'::jsonb)
      from (
        select to_char(gs, 'YYYY-MM-DD') as day
        from day0, generate_series(day0.d - interval '29 days', day0.d, interval '1 day') gs
      ) days
      left join (
        select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(*) as c
        from interp, day0
        where created_at >= day0.d - interval '29 days'
        group by 1
      ) cnt on cnt.day = days.day
    ),
    'abVariants', (
      select coalesce(jsonb_object_agg(variant, stats), '{}'::jsonb)
      from (
        select variant, jsonb_build_object(
          'shown',   count(*) filter (where action = 'shown'),
          'clicked', count(*) filter (where action = 'clicked')
        ) stats
        from public.ab_events group by variant
      ) x
    )
  );
$$;
