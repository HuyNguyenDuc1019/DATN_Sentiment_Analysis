import { Check } from 'lucide-react';

export default function PreferenceToggle({ title, description, active, onClick }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-700/50">
      <div>
        <div className="text-sm font-medium text-slate-200">{title}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
      </div>

      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          active ? 'bg-emerald-500' : 'bg-slate-600'
        }`}
      >
        <span
          className={`${active ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm flex items-center justify-center`}
        >
          {active && <Check className="w-3 h-3 text-indigo-600" strokeWidth={3} />}
        </span>
      </button>
    </div>
  );
}
