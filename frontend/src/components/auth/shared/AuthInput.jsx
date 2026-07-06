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
    <div>
      {!hideLabel && (
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${className}`}
      />
    </div>
  );
}
