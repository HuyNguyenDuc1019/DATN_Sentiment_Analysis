import { CheckCircle2 } from 'lucide-react';

export default function VipFeatureItem({ text }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <span dangerouslySetInnerHTML={{ __html: text }} />
    </li>
  );
}
