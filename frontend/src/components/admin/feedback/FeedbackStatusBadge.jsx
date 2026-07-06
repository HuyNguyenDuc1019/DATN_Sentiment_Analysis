import {
  STATUS_LABEL,
  normalizeStatus,
} from '../../../utils/admin/feedbackUtils';

export default function FeedbackStatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const classMap = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium border ${classMap[normalized]}`}
    >
      {STATUS_LABEL[normalized]}
    </span>
  );
}
