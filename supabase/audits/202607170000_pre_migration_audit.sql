-- Run this read-only audit before the migration.

-- Duplicate feedback links must return no rows.
select user_id, scraped_review_id, count(*) as duplicate_count
from public.feedback_data
where scraped_review_id is not null
group by user_id, scraped_review_id
having count(*) > 1;

-- Orphan feedback links must return no rows.
select f.id, f.user_id, f.scraped_review_id
from public.feedback_data f
left join public.scraped_reviews r on r.id = f.scraped_review_id
where f.scraped_review_id is not null
  and r.id is null;

-- Record how much subscription/payment data will be removed.
select 'transactions' as object_name, count(*)::bigint as row_count
from public.transactions
union all
select 'profiles_with_subscription_state', count(*)::bigint
from public.profiles
where tier is not null
   or vip_started_at is not null
   or vip_expires_at is not null;

-- Policies depending on removed objects must be rewritten before DROP COLUMN.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and concat_ws(' ', qual, with_check) ~* '(tier|vip|transactions)';

-- Views depending on removed objects must return no rows.
select viewname, definition
from pg_views
where schemaname = 'public'
  and definition ~* '(tier|vip|transactions)';

-- Functions depending on removed objects must return no rows except the old
-- signup handler, which this migration replaces as public.handle_new_user().
select p.proname, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and pg_get_functiondef(p.oid) ~* '(tier|vip|transactions)';

-- Inspect Auth signup triggers. Remove or update any additional trigger that
-- still writes subscription columns; the migration refreshes the conventional
-- on_auth_user_created trigger.
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_statement
from information_schema.triggers
where event_object_schema = 'auth'
  and event_object_table = 'users'
order by trigger_name;

-- Every table containing user data should have RLS enabled.
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
