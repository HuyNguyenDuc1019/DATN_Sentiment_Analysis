import DataRow from './DataRow';

export default function RecentReviews({ reviews }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h3 className="mb-4 text-sm font-medium text-slate-200">Phản hồi mới nhất</h3>
      <div className="grid grid-cols-12 gap-4 border-b border-slate-700 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <div className="col-span-1">Nguồn</div>
        <div className="col-span-7">Nội dung</div>
        <div className="col-span-2 text-center">Nhận định</div>
        <div className="col-span-2 text-right">Độ chắc chắn</div>
      </div>
      <div className="mt-2 flex flex-col">
        {reviews.slice(0, 4).map((item) => <DataRow key={item.id} item={item} />)}
        {!reviews.length && <p className="py-8 text-center text-sm text-slate-500">Chưa có dữ liệu phản hồi.</p>}
      </div>
    </div>
  );
}
