import { supabase } from './supabaseClient';

export async function fetchUserReviews(userId) {
  const pageSize = 1000;
  let from = 0;
  let rows = [];

  while (true) {
    const { data, error } = await supabase
      .from('scraped_reviews')
      .select('id,source_url,content,ai_label,confidence,created_at,user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

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
