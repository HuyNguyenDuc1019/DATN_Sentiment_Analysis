export default function MetricBox({ label, value, tone }) {
  const tones = {
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}
