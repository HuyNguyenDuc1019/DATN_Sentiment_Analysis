export default function ResponseCounterCard({ receivedCount }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center">
      <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">
        Số phản hồi đã nhận
      </h3>
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke="#6366f1"
            strokeWidth="8"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 - Math.min(receivedCount / 500, 1) * 251.2}
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{receivedCount}</span>
        </div>
      </div>
      <div className="text-sm text-slate-400 mt-2">/ 500 phản hồi</div>
    </div>
  );
}
