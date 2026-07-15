export default function AuthInput({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  hideLabel = false,
  autoComplete,
  className = '',
}) {
  return (
    <div className="group">
      {!hideLabel && (
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          {label}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`h-[52px] w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 ${className}`}
      />
    </div>
  );
}
