import { Sparkles } from 'lucide-react';

export default function AuthBrand() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
      <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
    </div>
  );
}
