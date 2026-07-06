export default function EmptyDashboardState() {
  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-700 bg-slate-800/40 p-8 text-center shadow-lg shadow-slate-950/10">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10">
          <div className="relative h-24 w-24">
            <div className="absolute bottom-0 left-2 h-12 w-4 rounded-t-lg bg-indigo-400/70" />
            <div className="absolute bottom-0 left-9 h-20 w-4 rounded-t-lg bg-emerald-400/70" />
            <div className="absolute bottom-0 right-5 h-16 w-4 rounded-t-lg bg-rose-400/70" />
            <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-slate-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-white">Chưa có dữ liệu để phân tích</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Hãy dán link quán ăn hoặc tải tệp CSV lên để bắt đầu. Khi có phản hồi mới, hệ thống sẽ tự cập nhật biểu đồ và các chỉ số tại đây.
        </p>
      </div>
    </section>
  );
}
