export default function FloatingBadge({
  className,
  color,
  text,
  value,
  reverse = false,
}) {
  const styles = color === 'emerald'
    ? { dot: 'bg-emerald-400', text: 'text-emerald-400', shadow: 'shadow-[0_0_8px_rgba(52,211,153,0.8)]' }
    : { dot: 'bg-rose-500', text: 'text-rose-400', shadow: 'shadow-[0_0_8px_rgba(129,140,248,0.5)]' };

  return (
    <div
      className={`absolute ${className} bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2 z-20`}
      style={{
        animation: reverse
          ? 'float-reverse 7s ease-in-out infinite'
          : 'float-delayed 5s ease-in-out infinite 1s',
      }}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${styles.dot} ${styles.shadow}`} />
      <span className={`text-sm font-semibold ${styles.text}`}>{text}</span>
      {value && <span className="text-sm font-medium text-slate-300 ml-1">{value}</span>}
    </div>
  );
}
