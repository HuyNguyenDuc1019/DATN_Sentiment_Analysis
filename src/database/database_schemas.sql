-- AImotion - Supabase database schema
-- Chay toan bo tep nay mot lan trong Supabase SQL Editor tren du an moi.

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  id smallint primary key default 1 check (id = 1),
  ai_threshold numeric(5,4) not null default 0.75 check (ai_threshold between 0 and 1),
  max_upload_size integer not null default 5 check (max_upload_size > 0),
  data_retention_days integer not null default 30 check (data_retention_days > 0),
  custom_dictionary text not null default '',
  danger_keywords text[] not null default array[]::text[],
  positive_keywords text[] not null default array[]::text[],
  negative_signal_keywords text[] not null default array[]::text[],
  crisis_alert_enabled boolean not null default true,
  aspect_dictionary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  custom_aspects jsonb not null default '{}'::jsonb,
  custom_sensitive_words text not null default '',
  custom_threshold integer not null default 50 check (custom_threshold between 0 and 100),
  use_custom_threshold boolean not null default false,
  alert_email boolean not null default false,
  weekly_report boolean not null default true,
  retention_days integer not null default 7 check (retention_days > 0),
  feedback_confidence_threshold integer not null default 70 check (feedback_confidence_threshold between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scraped_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  review_date timestamptz,
  ai_label smallint not null check (ai_label in (0, 1)),
  confidence numeric(7,6) not null default 0 check (confidence between 0 and 1),
  aspects text[] not null default array[]::text[],
  keywords text[] not null default array[]::text[],
  is_action_required boolean not null default false,
  source_url text,
  dataset_id uuid,
  dataset_name text,
  dataset_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scraped_review_id uuid references public.scraped_reviews(id) on delete cascade,
  original_content text not null,
  old_ai_label smallint not null check (old_ai_label in (0, 1)),
  corrected_label smallint not null check (corrected_label in (0, 1)),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'skipped')),
  include_retrain boolean not null default false,
  review_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comparison_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Lich su so sanh',
  created_at timestamptz not null default now()
);

create table if not exists public.comparison_items (
  id uuid primary key default gen_random_uuid(),
  comparison_id uuid not null references public.comparison_sessions(id) on delete cascade,
  restaurant_name text not null,
  source_url text not null default '',
  total_reviews integer not null default 0 check (total_reviews >= 0),
  positive_count integer not null default 0 check (positive_count >= 0),
  negative_count integer not null default 0 check (negative_count >= 0),
  positive_rate numeric(7,4) not null default 0,
  negative_rate numeric(7,4) not null default 0,
  risk_score numeric(10,4) not null default 0,
  top_positive_keywords text[] not null default array[]::text[],
  top_negative_keywords text[] not null default array[]::text[],
  aspects jsonb not null default '{}'::jsonb,
  recommendation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  admin_name text not null default 'Admin',
  action_type text not null,
  target_type text not null,
  target_id text,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. TRIGGERS AND HELPERS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_system_settings_updated_at on public.system_settings;
create trigger set_system_settings_updated_at before update on public.system_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_scraped_reviews_updated_at on public.scraped_reviews;
create trigger set_scraped_reviews_updated_at before update on public.scraped_reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_feedback_data_updated_at on public.feedback_data;
create trigger set_feedback_data_updated_at before update on public.feedback_data
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'user',
    'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles
      where id = p_user_id and role = 'admin' and status = 'active'
    ),
    false
  );
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     and not public.is_admin(auth.uid())
     and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Only administrators may change role or status';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- ============================================================
-- 3. INDEXES
-- ============================================================

create unique index if not exists uq_feedback_data_user_review
  on public.feedback_data (user_id, scraped_review_id)
  where scraped_review_id is not null;
create index if not exists idx_scraped_reviews_user_created
  on public.scraped_reviews (user_id, created_at desc);
create index if not exists idx_scraped_reviews_user_source_created
  on public.scraped_reviews (user_id, source_url, created_at desc);
create index if not exists idx_scraped_reviews_user_label_created
  on public.scraped_reviews (user_id, ai_label, created_at desc);
create index if not exists idx_feedback_data_user_created
  on public.feedback_data (user_id, created_at desc);
create index if not exists idx_feedback_data_status_created
  on public.feedback_data (status, created_at desc);
create index if not exists idx_comparison_sessions_user_created
  on public.comparison_sessions (user_id, created_at desc);
create index if not exists idx_comparison_items_comparison
  on public.comparison_items (comparison_id);
create index if not exists idx_admin_activity_logs_created
  on public.admin_activity_logs (created_at desc);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;
alter table public.user_settings enable row level security;
alter table public.scraped_reviews enable row level security;
alter table public.feedback_data enable row level security;
alter table public.comparison_sessions enable row level security;
alter table public.comparison_items enable row level security;
alter table public.admin_activity_logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists system_settings_select on public.system_settings;
create policy system_settings_select on public.system_settings for select to authenticated using (true);
drop policy if exists system_settings_admin_update on public.system_settings;
create policy system_settings_admin_update on public.system_settings for update to authenticated
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists user_settings_owner_all on public.user_settings;
create policy user_settings_owner_all on public.user_settings for all to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists scraped_reviews_owner_all on public.scraped_reviews;
create policy scraped_reviews_owner_all on public.scraped_reviews for all to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists feedback_data_owner_select on public.feedback_data;
create policy feedback_data_owner_select on public.feedback_data for select to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists feedback_data_owner_insert on public.feedback_data;
create policy feedback_data_owner_insert on public.feedback_data for insert to authenticated
with check (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists feedback_data_owner_update on public.feedback_data;
create policy feedback_data_owner_update on public.feedback_data for update to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists feedback_data_owner_delete on public.feedback_data;
create policy feedback_data_owner_delete on public.feedback_data for delete to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists comparison_sessions_owner_all on public.comparison_sessions;
create policy comparison_sessions_owner_all on public.comparison_sessions for all to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists comparison_items_owner_all on public.comparison_items;
create policy comparison_items_owner_all on public.comparison_items for all to authenticated
using (
  exists (select 1 from public.comparison_sessions s
          where s.id = comparison_id and (s.user_id = auth.uid() or public.is_admin(auth.uid())))
)
with check (
  exists (select 1 from public.comparison_sessions s
          where s.id = comparison_id and (s.user_id = auth.uid() or public.is_admin(auth.uid())))
);

drop policy if exists admin_activity_logs_admin_all on public.admin_activity_logs;
create policy admin_activity_logs_admin_all on public.admin_activity_logs for all to authenticated
using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ============================================================
-- 5. USER DASHBOARD / REPORT RPCS
-- ============================================================

create or replace function public.get_priority_feedback_queue(
  p_user_id uuid,
  p_threshold numeric default 0.7,
  p_limit integer default 50
)
returns setof public.scraped_reviews
language sql stable security invoker set search_path = public
as $$
  select r.*
  from public.scraped_reviews r
  where r.user_id = p_user_id
    and r.confidence < p_threshold
    and not exists (
      select 1 from public.feedback_data f
      where f.user_id = p_user_id and f.scraped_review_id = r.id
    )
  order by r.confidence asc, r.created_at desc, r.id desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

create or replace function public.get_all_feedback_queue(
  p_user_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns setof public.scraped_reviews
language sql stable security invoker set search_path = public
as $$
  select r.*
  from public.scraped_reviews r
  where r.user_id = p_user_id
    and not exists (
      select 1 from public.feedback_data f
      where f.user_id = p_user_id and f.scraped_review_id = r.id
    )
    and (
      p_before_created_at is null
      or (r.created_at, r.id) < (p_before_created_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by r.created_at desc, r.id desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

create or replace function public.get_dashboard_restaurants_fast(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = public
as $$
  with normalized as (
    select
      case
        when lower(coalesce(source_url, '')) = 'csv_upload' or lower(coalesce(dataset_type, '')) = 'csv'
          then 'source:csv_upload'
        when nullif(trim(source_url), '') is not null
          then 'url:' || lower(regexp_replace(split_part(trim(source_url), '?', 1), '/+$', ''))
        else 'dataset:' || coalesce(dataset_id::text, nullif(trim(dataset_name), ''), id::text)
      end as group_key,
      coalesce(nullif(trim(dataset_name), ''), nullif(trim(source_url), ''), 'Du lieu da phan tich') as display_name,
      coalesce(nullif(trim(dataset_type), ''), 'reviews') as dataset_type,
      nullif(trim(source_url), '') as source_url,
      ai_label, coalesce(review_date, created_at) as activity_at
    from public.scraped_reviews where user_id = p_user_id
  ), grouped as (
    select group_key, min(display_name) display_name, min(dataset_type) dataset_type,
      min(source_url) source_url,
      coalesce(array_agg(distinct source_url) filter (where source_url is not null), array[]::text[]) source_urls,
      count(*)::bigint review_count,
      count(*) filter (where ai_label = 1)::bigint positive_count,
      count(*) filter (where ai_label = 0)::bigint negative_count,
      max(activity_at) latest_at
    from normalized group by group_key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', group_key, 'name', display_name, 'dataset_type', dataset_type,
    'source_url', coalesce(source_url, ''), 'source_urls', to_jsonb(source_urls),
    'review_count', review_count, 'positive_count', positive_count,
    'negative_count', negative_count, 'latest_at', latest_at
  ) order by latest_at desc nulls last), '[]'::jsonb) from grouped;
$$;

create or replace function public.get_dashboard_summary_fast(
  p_user_id uuid, p_source_urls text[] default null
)
returns jsonb language sql stable security invoker set search_path = public
as $$
  with filtered as (
    select created_at, ai_label, coalesce(aspects, array[]::text[]) aspects,
      coalesce(keywords, array[]::text[]) keywords
    from public.scraped_reviews
    where user_id = p_user_id
      and (coalesce(cardinality(p_source_urls), 0) = 0 or source_url = any(p_source_urls))
  ), totals as (
    select count(*)::bigint total,
      count(*) filter (where ai_label=1)::bigint positive,
      count(*) filter (where ai_label=0)::bigint negative,
      count(*) filter (where created_at >= now()-interval '7 days')::bigint current_week,
      count(*) filter (where created_at >= now()-interval '14 days' and created_at < now()-interval '7 days')::bigint previous_week
    from filtered
  ), days as (
    select generate_series(current_date-interval '6 days', current_date, interval '1 day')::date day
  ), daily as (
    select d.day, count(f.*) filter(where f.ai_label=1)::bigint positive,
      count(f.*) filter(where f.ai_label=0)::bigint negative
    from days d left join filtered f on f.created_at>=d.day and f.created_at<d.day+interval '1 day'
    group by d.day
  ), aspect_counts as (
    select trim(a) aspect, count(*) filter(where f.ai_label=1)::bigint positive,
      count(*) filter(where f.ai_label=0)::bigint negative, count(*)::bigint total
    from filtered f cross join lateral unnest(f.aspects) a where nullif(trim(a),'') is not null
    group by trim(a) order by total desc limit 8
  ), keyword_counts as (
    select trim(k) keyword, f.ai_label, count(*)::bigint count
    from filtered f cross join lateral unnest(f.keywords) k where nullif(trim(k),'') is not null
    group by trim(k), f.ai_label
  )
  select jsonb_build_object(
    'total',t.total,'positive',t.positive,'negative',t.negative,
    'positive_rate',case when t.total>0 then t.positive::numeric/t.total else 0 end,
    'growth',case when t.previous_week>0 then ((t.current_week-t.previous_week)::numeric/t.previous_week)*100 when t.current_week>0 then 100 else 0 end,
    'trend',coalesce((select jsonb_agg(jsonb_build_object('date',to_char(day,'DD/MM'),'positive',positive,'negative',negative) order by day) from daily),'[]'::jsonb),
    'aspects',coalesce((select jsonb_agg(to_jsonb(a) order by total desc) from aspect_counts a),'[]'::jsonb),
    'leaderboard',jsonb_build_object(
      'top_positive',coalesce((select jsonb_agg(jsonb_build_object('keyword',keyword,'count',count) order by count desc) from (select * from keyword_counts where ai_label=1 order by count desc limit 5) p),'[]'::jsonb),
      'top_negative',coalesce((select jsonb_agg(jsonb_build_object('keyword',keyword,'count',count) order by count desc) from (select * from keyword_counts where ai_label=0 order by count desc limit 5) n),'[]'::jsonb)
    )
  ) from totals t;
$$;

create or replace function public.get_report_summary_fast(
  p_user_id uuid, p_start_date date default null, p_end_date date default null,
  p_source text default 'all', p_source_urls text[] default null
)
returns jsonb language sql stable security invoker set search_path = public
as $$
  with classified as (
    select ai_label, confidence, coalesce(keywords,array[]::text[]) keywords, source_url,
      case when lower(coalesce(dataset_type,''))='google_maps' or lower(coalesce(source_url,'')) like '%google.com/maps%' then 'Google Maps'
           when lower(coalesce(dataset_type,''))='foody' or lower(coalesce(source_url,'')) like '%foody.vn%' then 'Foody'
           when lower(coalesce(dataset_type,''))='csv' or lower(coalesce(source_url,'')) in ('csv_upload','csv') then 'CSV'
           else 'Khac' end source_name
    from public.scraped_reviews
    where user_id=p_user_id and (p_start_date is null or created_at>=p_start_date)
      and (p_end_date is null or created_at<p_end_date+1)
  ), filtered as (
    select * from classified where (coalesce(lower(p_source),'all')='all' or lower(source_name)=lower(p_source))
      and (coalesce(cardinality(p_source_urls),0)=0 or source_url=any(p_source_urls))
  ), totals as (
    select count(*)::bigint total, count(*) filter(where ai_label=1)::bigint positive,
      count(*) filter(where ai_label=0)::bigint negative, coalesce(avg(confidence),0) confidence from filtered
  ), source_groups as (
    select source_name source, count(*) filter(where ai_label=1)::bigint positive,
      count(*) filter(where ai_label=0)::bigint negative, count(*)::bigint total from filtered group by source_name
  ), keyword_counts as (
    select trim(k) text, case when f.ai_label=1 then 'positive' else 'negative' end sentiment, count(*)::bigint value
    from filtered f cross join lateral unnest(f.keywords) k where nullif(trim(k),'') is not null
    group by trim(k), case when f.ai_label=1 then 'positive' else 'negative' end
  ), ranked as (
    select *,row_number() over(partition by sentiment order by value desc,text) pos from keyword_counts
  )
  select jsonb_build_object('total',t.total,'positive',t.positive,'negative',t.negative,'confidence',t.confidence,
    'groups',coalesce((select jsonb_agg(to_jsonb(g) order by source) from source_groups g),'[]'::jsonb),
    'wordcloud',coalesce((select jsonb_agg(jsonb_build_object('text',text,'value',value,'sentiment',sentiment) order by value desc) from ranked where pos<=20),'[]'::jsonb)
  ) from totals t;
$$;

-- ============================================================
-- 6. ADMIN RPCS
-- ============================================================

create or replace function public.get_admin_dashboard_metrics()
returns jsonb language sql stable security definer set search_path = public
as $$
  select case when public.is_admin(auth.uid()) then jsonb_build_object(
    'total_analyzed_reviews',(select count(*) from public.scraped_reviews),
    'total_users',(select count(*) from public.profiles where role='user'),
    'pending_feedbacks',(select count(*) from public.feedback_data where status='pending'),
    'global_positive_ratio',coalesce((select 100.0*count(*) filter(where ai_label=1)/nullif(count(*),0) from public.scraped_reviews),0)
  ) else '{}'::jsonb end;
$$;

create or replace function public.get_admin_sentiment_chart(p_days integer default 7)
returns table(date date, positive bigint, negative bigint)
language sql stable security definer set search_path = public
as $$
  with days as (select generate_series(current_date-greatest(p_days,1)+1,current_date,interval '1 day')::date d)
  select d.d, count(r.*) filter(where r.ai_label=1), count(r.*) filter(where r.ai_label=0)
  from days d left join public.scraped_reviews r on r.created_at>=d.d and r.created_at<d.d+1
  where public.is_admin(auth.uid()) group by d.d order by d.d;
$$;

create or replace function public.get_admin_feedback_stats()
returns jsonb language sql stable security definer set search_path = public
as $$
  select case when public.is_admin(auth.uid()) then jsonb_build_object(
    'total',(select count(*) from public.feedback_data),
    'pending',(select count(*) from public.feedback_data where status='pending'),
    'approved',(select count(*) from public.feedback_data where status='approved'),
    'rejected',(select count(*) from public.feedback_data where status='rejected'),
    'skipped',(select count(*) from public.feedback_data where status='skipped')
  ) else '{}'::jsonb end;
$$;

create or replace function public.get_admin_feedback_queue(
  p_status text default 'pending', p_search text default null, p_confidence text default 'all',
  p_mismatch text default 'all', p_date_from timestamptz default null, p_date_to timestamptz default null,
  p_priority text default 'all', p_before_created_at timestamptz default null,
  p_before_id uuid default null, p_limit integer default 50
)
returns table(
  id uuid,user_id uuid,scraped_review_id uuid,original_content text,old_ai_label smallint,
  corrected_label smallint,status text,include_retrain boolean,review_history jsonb,created_at timestamptz,
  profile_email text,profile_full_name text,ai_confidence numeric
)
language sql stable security definer set search_path = public
as $$
  select f.id,f.user_id,f.scraped_review_id,f.original_content,f.old_ai_label,f.corrected_label,
    f.status,f.include_retrain,f.review_history,f.created_at,p.email,p.full_name,r.confidence
  from public.feedback_data f
  left join public.profiles p on p.id=f.user_id
  left join public.scraped_reviews r on r.id=f.scraped_review_id
  where public.is_admin(auth.uid())
    and (coalesce(p_status,'all')='all' or f.status=p_status)
    and (p_search is null or f.original_content ilike '%'||p_search||'%' or p.email ilike '%'||p_search||'%')
    and (p_date_from is null or f.created_at>=p_date_from) and (p_date_to is null or f.created_at<=p_date_to)
    and (p_mismatch='all' or (p_mismatch='yes' and f.old_ai_label<>f.corrected_label) or (p_mismatch='no' and f.old_ai_label=f.corrected_label))
    and (p_confidence='all' or (p_confidence='low' and r.confidence<0.7) or (p_confidence='high' and r.confidence>=0.7))
    and (p_before_created_at is null or (f.created_at,f.id)<(p_before_created_at,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by case when p_priority='high' and r.confidence<0.5 then 0 else 1 end, f.created_at desc,f.id desc
  limit greatest(coalesce(p_limit,50),1)+1;
$$;

create or replace function public.admin_bulk_review_feedback(
  p_admin_id uuid,p_feedback_ids uuid[],p_action text,p_reason text default null,p_new_label smallint default null
)
returns integer language plpgsql security definer set search_path = public
as $$
declare v_count integer;
begin
  if not public.is_admin(p_admin_id) and auth.role()<>'service_role' then raise exception 'Administrator permission required'; end if;
  update public.feedback_data set
    status=case when p_action='approve' then 'approved' when p_action='reject' then 'rejected' else status end,
    corrected_label=case when p_action='edit_label' then p_new_label else corrected_label end,
    review_history=review_history||jsonb_build_array(jsonb_build_object('admin_id',p_admin_id,'action','bulk_'||p_action,'reason',p_reason,'new_label',p_new_label,'timestamp',now()))
  where id=any(p_feedback_ids);
  get diagnostics v_count=row_count;
  return v_count;
end;
$$;

-- ============================================================
-- 7. GRANTS
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

commit;

-- Sau khi chay xong, tao tai khoan trong Authentication > Users.
-- De cap quyen admin cho mot tai khoan, thay email ben duoi roi chay RIENG cau lenh:
-- update public.profiles set role='admin' where email='admin@example.com';
