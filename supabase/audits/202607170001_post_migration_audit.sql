-- 1. The old subscription/payment objects should return no rows.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    column_name in ('tier', 'vip_started_at', 'vip_expires_at', 'max_upload_size_free')
    or table_name = 'transactions'
  )
order by table_name, ordinal_position;

-- 2. Confirm the renamed setting exists exactly once.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'system_settings'
  and column_name = 'max_upload_size';

-- 3. Confirm feedback_data now cascades when its review is deleted.
select
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.conrelid = 'public.feedback_data'::regclass
  and con.contype = 'f';

-- 4. Confirm all performance/uniqueness indexes created by the migration.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'uq_feedback_data_user_review',
    'idx_scraped_reviews_user_created',
    'idx_scraped_reviews_user_source',
    'idx_feedback_data_user_created',
    'idx_feedback_data_status_created',
    'idx_comparison_sessions_user_created',
    'idx_comparison_items_comparison',
    'idx_admin_activity_logs_created'
  )
order by tablename, indexname;

-- 5. No duplicate link between a user and a review should remain.
select user_id, scraped_review_id, count(*) as duplicate_count
from public.feedback_data
where scraped_review_id is not null
group by user_id, scraped_review_id
having count(*) > 1;

-- 6. RLS status for every application table.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;

-- 7. Review every active policy. User-owned tables should restrict rows by auth.uid().
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 8. This query must return no rows after all tier/VIP/payment dependencies are removed.
select 'policy' as object_type, tablename as object_name, policyname as detail
from pg_policies
where schemaname = 'public'
  and concat_ws(' ', qual, with_check) ~* '(tier|vip|transactions)'
union all
select 'view', viewname, left(definition, 250)
from pg_views
where schemaname = 'public'
  and definition ~* '(tier|vip|transactions)'
union all
select 'function', p.proname, left(pg_get_functiondef(p.oid), 250)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and pg_get_functiondef(p.oid) ~* '(tier|vip|transactions)';

-- 9. Exactly one signup trigger should call the tier-free profile function.
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
order by trigger_name;
