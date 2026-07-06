import { Eye, EyeOff } from 'lucide-react';

export default function AuthPasswordInput({
  label,
  value,
  onChange,
  visible = false,
  onToggle,
  autoComplete = 'new-password',
  showToggle = true,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </label>

      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className={`w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${showToggle ? 'pr-11' : ''}`}
        />

        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
