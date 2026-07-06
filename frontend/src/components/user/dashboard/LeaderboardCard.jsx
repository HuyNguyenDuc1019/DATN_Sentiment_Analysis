import { Frown, Smile } from 'lucide-react';

import KeywordList from './KeywordList';

export default function LeaderboardCard({ leaderboard }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h2 className="mb-1 text-lg font-semibold text-white">Bảng xếp hạng khen/chê</h2>
      <p className="mb-5 text-sm text-slate-400">
        Các điểm sáng và vấn đề được khách nhắc lại nhiều nhất.
      </p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <KeywordList
          title="Top 5 điểm sáng được khen nhiều nhất"
          icon={<Smile className="h-4 w-4" />}
          items={leaderboard.top_positive || []}
          positive
        />
        <KeywordList
          title="Top 5 vấn đề bị phàn nàn nhiều nhất"
          icon={<Frown className="h-4 w-4" />}
          items={leaderboard.top_negative || []}
        />
      </div>
    </section>
  );
}
