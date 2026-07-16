begin;

-- Stop early when feedback rows would make the new uniqueness rule fail.
do $$
begin
  if exists (
    select 1
    from public.feedback_data
    where scraped_review_id is not null
    group by user_id, scraped_review_id
    having count(*) > 1
  ) then
    raise exception
      'feedback_data contains duplicate (user_id, scraped_review_id) rows; merge them before running this migration';
  end if;
end
$$;

-- Rename the shared upload limit. Keep the migration idempotent.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'system_settings'
      and column_name = 'max_upload_size_free'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'system_settings'
      and column_name = 'max_upload_size'
  ) then
    alter table public.system_settings
      rename column max_upload_size_free to max_upload_size;
  end if;
end
$$;

-- Profiles no longer contain subscription state.
alter table public.profiles
  drop column if exists tier,
  drop column if exists vip_started_at,
  drop column if exists vip_expires_at;

-- Keep Auth signup compatible with the simplified profiles table.
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
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Payment history is no longer part of the product.
drop table if exists public.transactions;

-- A review owns its feedback. Deleting the review must remove linked feedback.
alter table public.feedback_data
  drop constraint if exists feedback_data_scraped_review_id_fkey;

alter table public.feedback_data
  add constraint feedback_data_scraped_review_id_fkey
  foreign key (scraped_review_id)
  references public.scraped_reviews(id)
  on delete cascade;

-- Supports feedback upsert(on_conflict='user_id,scraped_review_id').
create unique index if not exists uq_feedback_data_user_review
  on public.feedback_data (user_id, scraped_review_id);

-- Common user-facing filters and newest-first pagination.
create index if not exists idx_scraped_reviews_user_created
  on public.scraped_reviews (user_id, created_at desc);

create index if not exists idx_scraped_reviews_user_source
  on public.scraped_reviews (user_id, source_url);

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

commit;
