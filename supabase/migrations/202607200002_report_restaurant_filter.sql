begin;

-- Bổ sung bộ lọc theo source_url để Report tổng hợp đúng từng quán.
drop function if exists public.get_report_summary_fast(uuid, date, date, text);

create or replace function public.get_report_summary_fast(
  p_user_id uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_source text default 'all',
  p_source_urls text[] default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with classified as (
    select
      ai_label,
      confidence,
      coalesce(keywords, array[]::text[]) as keywords,
      source_url,
      case
        when lower(coalesce(dataset_type, '')) = 'google_maps'
          or lower(coalesce(dataset_name, '')) like '%google%'
          or lower(coalesce(source_url, '')) like '%google.com/maps%'
          or lower(coalesce(source_url, '')) like '%maps.app.goo.gl%'
          then 'Google Maps'
        when lower(coalesce(dataset_type, '')) = 'foody'
          or lower(coalesce(dataset_name, '')) like '%foody%'
          or lower(coalesce(source_url, '')) like '%foody.vn%'
          then 'Foody'
        when lower(coalesce(dataset_type, '')) = 'csv'
          or lower(coalesce(dataset_name, '')) like '%csv%'
          or lower(coalesce(source_url, '')) in ('csv_upload', 'csv')
          then 'CSV'
        else 'Khác'
      end as source_name
    from public.scraped_reviews
    where user_id = p_user_id
      and (p_start_date is null or created_at >= p_start_date)
      and (p_end_date is null or created_at < p_end_date + 1)
  ), filtered as (
    select *
    from classified
    where (
      coalesce(lower(p_source), 'all') = 'all'
      or lower(source_name) = lower(p_source)
    )
      and (
        coalesce(cardinality(p_source_urls), 0) = 0
        or source_url = any(p_source_urls)
      )
  ), totals as (
    select
      count(*)::bigint as total,
      count(*) filter (where ai_label = 1)::bigint as positive,
      count(*) filter (where ai_label = 0)::bigint as negative,
      coalesce(avg(confidence), 0) as confidence
    from filtered
  ), source_groups as (
    select
      source_name as source,
      count(*) filter (where ai_label = 1)::bigint as positive,
      count(*) filter (where ai_label = 0)::bigint as negative,
      count(*)::bigint as total
    from filtered
    group by source_name
  ), keyword_counts as (
    select
      trim(keyword) as text,
      case when f.ai_label = 1 then 'positive' else 'negative' end as sentiment,
      count(*)::bigint as value
    from filtered f
    cross join lateral unnest(f.keywords) as keyword
    where nullif(trim(keyword), '') is not null
    group by trim(keyword), case when f.ai_label = 1 then 'positive' else 'negative' end
  ), ranked_keywords as (
    select *, row_number() over (partition by sentiment order by value desc, text) as position
    from keyword_counts
  )
  select jsonb_build_object(
    'total', t.total,
    'positive', t.positive,
    'negative', t.negative,
    'confidence', t.confidence,
    'groups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'source', source,
          'positive', positive,
          'negative', negative,
          'total', total
        ) order by case source when 'Foody' then 1 when 'Google Maps' then 2 when 'CSV' then 3 else 4 end
      ) from source_groups
    ), '[]'::jsonb),
    'wordcloud', coalesce((
      select jsonb_agg(
        jsonb_build_object('text', text, 'value', value, 'sentiment', sentiment)
        order by value desc, text
      ) from ranked_keywords where position <= 20
    ), '[]'::jsonb)
  )
  from totals t;
$$;

create index if not exists idx_scraped_reviews_user_source_url_created
  on public.scraped_reviews (user_id, source_url, created_at desc);

commit;
