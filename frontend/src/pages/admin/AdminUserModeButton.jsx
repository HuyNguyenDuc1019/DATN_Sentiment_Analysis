import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AdminUserModeButton() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-indigo-400 hover:bg-slate-700"
    >
      <ArrowLeft className="h-4 w-4" />
      Về trang người dùng
    </Link>
  );
}
