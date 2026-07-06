import AdminStatCard from './AdminStatCard';
import AdminStatSkeleton from './AdminStatSkeleton';

export default function AdminStatsGrid({ isLoading, cards }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {isLoading
        ? Array(4)
            .fill(0)
            .map((_, index) => <AdminStatSkeleton key={index} />)
        : cards.map((card, index) => (
            <AdminStatCard key={index} card={card} />
          ))}
    </div>
  );
}
