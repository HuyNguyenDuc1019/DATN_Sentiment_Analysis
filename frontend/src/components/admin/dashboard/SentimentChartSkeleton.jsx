export default function SentimentChartSkeleton() {
  return (
    <div className="w-full h-full relative overflow-hidden flex items-end pb-8 px-8 gap-4 justify-between">
      <div className="absolute inset-0 flex flex-col justify-between py-8">
        {Array(5)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="w-full h-px bg-slate-700/50" />
          ))}
      </div>

      {[40, 70, 45, 90, 65, 30, 80].map((height, index) => (
        <div
          key={index}
          className="w-full bg-slate-700/50 rounded-t-sm animate-pulse z-10"
          style={{ height: `${height}%`, animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
}
