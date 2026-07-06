import { Download, Filter, TableProperties } from 'lucide-react';
import toast from 'react-hot-toast';

import Pagination from '../../ui/Pagination';
import MiniPill from './MiniPill';
import TableRow from './TableRow';
import TableSkeleton from './TableSkeleton';

import { downloadBatchResults } from '../../../utils/user/batchUtils';

export default function PreviewTable({
  tableData,
  total,
  loading,
  hasFile,
  page,
  totalPages,
  onPageChange,
  isVip,
  onUpgrade,
  positiveCount,
  negativeCount,
  averageConfidence,
}) {
  if (loading) {
    return (
      <div className="flex min-h-[680px] flex-col rounded-3xl border border-slate-700 bg-slate-800/50 p-6 shadow-2xl shadow-slate-950/15 backdrop-blur-md">
        <div className="mb-6 flex items-center gap-3">
          <TableProperties className="h-5 w-5 text-indigo-300" />
          <h3 className="text-base font-bold text-white">Đang chuẩn bị danh sách kết quả</h3>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (!total) {
    return (
      <div className="flex min-h-[680px] flex-col rounded-3xl border border-slate-700 bg-slate-800/50 p-6 shadow-2xl shadow-slate-950/15 backdrop-blur-md">
        <div className="mb-6 flex items-center gap-3">
          <TableProperties className="h-5 w-5 text-indigo-300" />
          <h3 className="text-base font-bold text-white">Danh sách phản hồi sau xử lý</h3>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/25 p-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70">
              <TableProperties className="h-8 w-8 text-slate-500" />
            </div>
            <h4 className="text-lg font-bold text-white">
              {hasFile ? 'Sẵn sàng xử lý file' : 'Chưa có tệp phản hồi'}
            </h4>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {hasFile
                ? 'Bấm Bắt đầu xử lý để hệ thống ghi nhận phản hồi. Kết quả sẽ xuất hiện tại đây sau khi xử lý xong.'
                : 'Tải file CSV lên để bắt đầu. Bảng này chỉ hiển thị danh sách phản hồi sau khi hệ thống xử lý xong.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[680px] flex-col rounded-3xl border border-slate-700 bg-slate-800/50 p-6 shadow-2xl shadow-slate-950/15 backdrop-blur-md">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <TableProperties className="h-5 w-5 text-indigo-300" />
            <h3 className="text-base font-bold text-white">Xem trước phản hồi</h3>
            <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2.5 py-1 text-xs font-bold text-slate-400">
              {tableData.length}/{total} dòng
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniPill label="Hài lòng" value={positiveCount} tone="positive" />
            <MiniPill label="Chưa hài lòng" value={negativeCount} tone="negative" />
            <MiniPill label="Tin cậy TB" value={averageConfidence ? `${averageConfidence}%` : '—'} />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            title="Lọc phản hồi"
            onClick={() => toast('Bảng đang hiển thị danh sách phản hồi sau xử lý. Bạn có thể dùng phân trang để xem thêm.')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <Filter className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Tải kết quả"
            onClick={() => (isVip ? downloadBatchResults(tableData) : onUpgrade())}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
              isVip
                ? 'border-slate-700 bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-white'
                : 'cursor-pointer border-slate-700 bg-slate-900/40 text-slate-600'
            }`}
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-700/70">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md">
              <tr className="border-b border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-4 w-24">ID</th>
                <th className="px-4 py-4">Nội dung phản hồi</th>
                <th className="px-4 py-4 text-center w-44">Kết quả ghi nhận</th>
                <th className="px-4 py-4 text-right w-32">Độ chắc chắn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {tableData.map((row, index) => (
                <TableRow key={`${row.id}-${index}`} data={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-700 pt-4 text-sm text-slate-400 xl:flex-row xl:items-center xl:justify-between">
        <div>
          Hiển thị <span className="font-semibold text-slate-200">{tableData.length}</span> trên tổng{' '}
          <span className="font-semibold text-slate-200">{total}</span> phản hồi · Trang{' '}
          <span className="font-semibold text-slate-200">{page}/{totalPages}</span>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
