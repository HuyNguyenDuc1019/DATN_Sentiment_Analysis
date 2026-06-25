import { supabase } from './supabaseClient';

export async function fetchUserReviews(userId, filters = {}) {
  const pageSize = 1000;
  let from = 0;
  let rows = [];

  while (true) {
    let query = supabase
      .from('scraped_reviews')
      .select('id,source_url,content,ai_label,confidence,created_at,user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.startDate) {
      query = query.gte('created_at', new Date(`${filters.startDate}T00:00:00`).toISOString());
    }
    if (filters.endDate) {
      query = query.lte('created_at', new Date(`${filters.endDate}T23:59:59.999`).toISOString());
    }

    if (filters.source === 'CSV') query = query.eq('source_url', 'CSV_Upload');
    if (filters.source === 'Foody') query = query.ilike('source_url', '%foody%');
    if (filters.source === 'Shopee') query = query.ilike('source_url', '%shopee%');

    const { data, error } = await query.range(from, from + pageSize - 1);

    if (error) throw error;
    rows = rows.concat(data || []);
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export const confidenceRatio = (value) => {
  const number = Number(value) || 0;
  return number > 1 ? number / 100 : number;
};
