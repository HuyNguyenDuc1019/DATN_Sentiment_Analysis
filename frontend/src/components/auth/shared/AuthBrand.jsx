import { Sparkles } from 'lucide-react';

export default function AuthBrand() {
  return (
    <div className="mb-8 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
        <Sparkles className="h-5 w-5" fill="currentColor" />
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-white">Almotion</p>
        <p className="text-xs text-slate-500">Customer Intelligence</p>
      </div>
    </div>
  );
}
