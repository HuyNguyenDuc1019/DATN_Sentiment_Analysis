import { Calendar } from 'lucide-react';

export default function DateField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="date"
          value={value}
          onChange={onChange}
          className="rounded-lg border border-slate-700 bg-slate-900/50 py-2 pl-10 pr-3 text-slate-200 transition-colors [color-scheme:dark] hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </span>
    </label>
  );
}
