begin;

-- Danh sách quán được tổng hợp ngay trong PostgreSQL, không còn tải toàn bộ review về Python.
create or replace function public.get_dashboard_restaurants_fast(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select
      case
        when lower(coalesce(source_url, '')) = 'csv_upload'
          or lower(coalesce(dataset_type, '')) = 'csv'
          then 'source:csv_upload'
        when nullif(trim(source_url), '') is not null
          then 'url:' || lower(regexp_replace(split_part(trim(source_url), '?', 1), '/+$', ''))
        else 'dataset:' || coalesce(dataset_id::text, nullif(trim(dataset_name), ''), id::text)
      end as group_key,
      case
        when lower(coalesce(source_url, '')) = 'csv_upload'
          or lower(coalesce(dataset_type, '')) = 'csv'
          then 'Dữ liệu CSV'
        when nullif(trim(dataset_name), '') is not null
          and lower(trim(dataset_name)) not in ('foody', 'google', 'google maps')
          then trim(dataset_name)
        when nullif(trim(source_url), '') is not null
          then initcap(replace(replace(regexp_replace(regexp_replace(split_part(trim(source_url), '?', 1), '^.*/', ''), '[-_]+', ' ', 'g'), '%20', ' '), '%2d', '-'))
        else coalesce(nullif(trim(dataset_name), ''), 'Dữ liệu đã phân tích')
      end as display_name,
      coalesce(nullif(trim(dataset_type), ''), 'reviews') as dataset_type,
      nullif(trim(source_url), '') as source_url,
      ai_label,
      coalesce(review_date, created_at) as activity_at
    from public.scraped_reviews
    where user_id = p_user_id
  ), grouped as (
    select
      group_key,
      min(display_name) as display_name,
      min(dataset_type) as dataset_type,
      min(source_url) as source_url,
      coalesce(array_agg(distinct source_url) filter (where source_url is not null), array[]::text[]) as source_urls,
      count(*)::bigint as review_count,
      count(*) filter (where ai_label = 1)::bigint as positive_count,
      count(*) filter (where ai_label = 0)::bigint as negative_count,
      max(activity_at) as latest_at
    from normalized
    group by group_key
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'key', group_key,
        'name', display_name,
        'dataset_type', dataset_type,
        'source_url', coalesce(source_url, ''),
        'source_urls', to_jsonb(source_urls),
        'review_count', review_count,
        'positive_count', positive_count,
        'negative_count', negative_count,
        'latest_at', latest_at
      )
      order by latest_at desc nulls last, display_name
    ),
    '[]'::jsonb
  )
  from grouped;
$$;

-- Toàn bộ KPI, xu hướng 7 ngày và thống kê khía cạnh của Dashboard trong một request.
create or replace function public.get_dashboard_summary_fast(
  p_user_id uuid,
  p_source_urls text[] default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select created_at, ai_label, coalesce(aspects, array[]::text[]) as aspects,
      coalesce(keywords, array[]::text[]) as keywords
    from public.scraped_reviews
    where user_id = p_user_id
      and (
        p_source_urls is null
        or cardinality(p_source_urls) = 0
        or source_url = any(p_source_urls)
      )
  ), totals as (
    select
      count(*)::bigint as total,
      count(*) filter (where ai_label = 1)::bigint as positive,
      count(*) filter (where ai_label = 0)::bigint as negative,
      count(*) filter (where created_at >= now() - interval '7 days')::bigint as current_week,
      count(*) filter (
        where created_at >= now() - interval '14 days'
          and created_at < now() - interval '7 days'
      )::bigint as previous_week
    from filtered
  ), days as (
    select generate_series(
      current_date - interval '6 days',
      current_date,
      interval '1 day'
    )::date as day
  ), daily as (
    select
      d.day,
      count(f.*) filter (where f.ai_label = 1)::bigint as positive,
      count(f.*) filter (where f.ai_label = 0)::bigint as negative
    from days d
    left join filtered f
      on f.created_at >= d.day
     and f.created_at < d.day + interval '1 day'
    group by d.day
  ), aspect_rows as (
    select trim(aspect) as aspect, f.ai_label
    from filtered f
    cross join lateral unnest(f.aspects) as aspect
    where nullif(trim(aspect), '') is not null
  ), aspect_counts as (
    select
      aspect,
      count(*) filter (where ai_label = 1)::bigint as positive,
      count(*) filter (where ai_label = 0)::bigint as negative,
      count(*)::bigint as total
    from aspect_rows
    group by aspect
    order by total desc, negative desc, aspect
    limit 8
  ), keyword_rows as (
    select trim(keyword) as keyword, f.ai_label
    from filtered f
    cross join lateral unnest(f.keywords) as keyword
    where nullif(trim(keyword), '') is not null
  ), keyword_counts as (
    select keyword, ai_label, count(*)::bigint as count
    from keyword_rows
    group by keyword, ai_label
  )
  select jsonb_build_object(
    'total', t.total,
    'positive', t.positive,
    'negative', t.negative,
    'positive_rate', case when t.total > 0 then t.positive::numeric / t.total else 0 end,
    'growth', case
      when t.previous_week > 0 then ((t.current_week - t.previous_week)::numeric / t.previous_week) * 100
      when t.current_week > 0 then 100
      else 0
    end,
    'trend', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'label', case extract(dow from day)::int
            when 0 then 'CN' when 1 then 'T2' when 2 then 'T3' when 3 then 'T4'
            when 4 then 'T5' when 5 then 'T6' else 'T7' end,
          'date', to_char(day, 'DD/MM'),
          'positive', positive,
          'negative', negative
        ) order by day
      ) from daily
    ), '[]'::jsonb),
    'aspects', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'aspect', aspect,
          'positive', positive,
          'negative', negative,
          'total', total
        ) order by total desc, negative desc, aspect
      ) from aspect_counts
    ), '[]'::jsonb),
    'leaderboard', jsonb_build_object(
      'top_positive', coalesce((
        select jsonb_agg(jsonb_build_object('keyword', keyword, 'count', count) order by count desc, keyword)
        from (select keyword, count from keyword_counts where ai_label = 1 order by count desc, keyword limit 5) p
      ), '[]'::jsonb),
      'top_negative', coalesce((
        select jsonb_agg(jsonb_build_object('keyword', keyword, 'count', count) order by count desc, keyword)
        from (select keyword, count from keyword_counts where ai_label = 0 order by count desc, keyword limit 5) n
      ), '[]'::jsonb)
    )
  )
  from totals t;
$$;

-- Report chỉ nhận số liệu đã tổng hợp, không tải hàng nghìn bình luận về trình duyệt.
create or replace function public.get_report_summary_fast(
  p_user_id uuid,
  p_start_date date default null,
  p_end_date date default null,
  p_source text default 'all'
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
    where coalesce(lower(p_source), 'all') = 'all'
       or lower(source_name) = lower(p_source)
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

create index if not exists idx_scraped_reviews_user_source_created
  on public.scraped_reviews (user_id, source_url, created_at desc);

create index if not exists idx_scraped_reviews_user_label_created
  on public.scraped_reviews (user_id, ai_label, created_at desc);

commit;
