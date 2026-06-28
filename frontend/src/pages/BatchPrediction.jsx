import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  Filter,
  Play,
  Settings,
  TableProperties,
  XCircle,
} from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';

export default function BatchPredictionContent() {
  const inputRef = useRef(null);
  const { batch } = useTasks();
  const { file, texts, column, columns, results, loading, selectFile, setColumn, analyze } = batch;
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setPage(1);
  }, [file?.name, results.length]);

  const tableData = useMemo(() => results.map((item, index) => ({
    id: `#${String(index + 1).padStart(4, '0')}`,
    content: item.text || item.content || '',
    sentiment: item.prediction === null || item.prediction === undefined ? null : item.prediction === 1 ? 'positive' : 'negative',
    confidence: item.prediction === null || item.prediction === undefined ? null : Math.round((Number(item.confidence) > 1 ? item.confidence : item.confidence * 100) || 0),
  })), [results]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));
  const visibleRows = tableData.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-8 animate-in fade-in duration-500 font-sans h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">Nhập phản hồi từ file</h1>
        <p className="text-slate-400 text-sm">
          Tải file CSV để hệ thống ghi nhận phản hồi khách hàng và cập nhật kết quả tại trang Tổng quan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <UploadCard file={file} count={texts.length} inputRef={inputRef} onFile={selectFile} />
          <ConfigCard
            columns={columns}
            column={column}
            setColumn={setColumn}
            disabled={!texts.length || loading}
            loading={loading}
            onAnalyze={analyze}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col h-full">
          <PreviewTable
            tableData={visibleRows}
            total={tableData.length}
            loading={loading}
            hasFile={Boolean(file)}
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </div>
      </div>
    </div>
  );
}

function UploadCard({ file, count, inputRef, onFile }) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files?.[0]);
      }}
      className="bg-slate-800/30 backdrop-blur-md border border-dashed border-slate-600 hover:border-indigo-500 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => onFile(event.target.files?.[0])}
      />

      <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 shadow-lg">
        <CloudUpload className="w-6 h-6 text-indigo-400" />
      </div>

      <h3 className="text-lg font-medium text-white mb-2">{file ? file.name : 'Tải lên file CSV'}</h3>
      <p className="text-slate-400 text-sm mb-6 max-w-[220px]">
        {file ? `${count} phản hồi đã đọc` : 'Kéo thả file vào đây hoặc bấm chọn tệp.'}
      </p>

      <button
        onClick={() => inputRef.current?.click()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg transition-colors text-sm shadow-lg shadow-indigo-600/20"
      >
        Chọn tệp
      </button>
    </div>
  );
}

function ConfigCard({ columns, column, setColumn, disabled, loading, onAnalyze }) {
  const ready = !disabled || loading;

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col flex-1">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-indigo-400" />
        <h3 className="text-base font-medium text-white">Thiết lập dữ liệu</h3>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Nguồn phản hồi</label>
          <div className="relative">
            <select className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm">
              <option>CSV Upload</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Cột chứa nội dung phản hồi</label>
          <div className="relative">
            <select
              value={column}
              onChange={(event) => setColumn(event.target.value)}
              disabled={!columns.length}
              className="w-full bg-slate-900/50 border border-slate-800 text-slate-400 rounded-lg py-2.5 pl-4 pr-10 appearance-none disabled:cursor-not-allowed text-sm"
            >
              {columns.length ? (
                columns.map((name) => <option key={name}>{name}</option>)
              ) : (
                <option>Vui lòng tải tệp lên trước</option>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <button
          onClick={onAnalyze}
          disabled={disabled}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-all ${
            loading
              ? 'cursor-wait border border-indigo-400/60 bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : ready
                ? 'border border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-500/30'
                : 'cursor-not-allowed border border-slate-700 bg-slate-800/70 text-slate-500'
          }`}
        >
          <Play className="w-4 h-4" />
          {loading ? 'Đang xử lý ngầm...' : 'Bắt đầu xử lý'}
        </button>

        {loading && (
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
            <p className="mb-2 text-xs text-indigo-100">
              Hệ thống đang xử lý ngầm. Bạn có thể chuyển sang trang khác và quay lại xem kết quả.
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
              <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTable({ tableData, total, loading, hasFile, page, totalPages, onPrev, onNext }) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col h-full">
        <div className="mb-6 flex items-center gap-3">
          <TableProperties className="w-5 h-5 text-slate-300" />
          <h3 className="text-base font-medium text-white">Đang chuẩn bị danh sách kết quả</h3>
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (!total) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col h-full">
        <div className="mb-6 flex items-center gap-3">
          <TableProperties className="w-5 h-5 text-slate-300" />
          <h3 className="text-base font-medium text-white">Danh sách phản hồi sau xử lý</h3>
        </div>
        <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
          <div className="max-w-md">
            <TableProperties className="mx-auto mb-4 h-10 w-10 text-slate-500" />
            <h4 className="text-base font-semibold text-white">
              {hasFile ? 'Chưa có kết quả xử lý' : 'Chưa có tệp phản hồi'}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {hasFile
                ? 'Bấm Bắt đầu xử lý để hệ thống ghi nhận phản hồi. Danh sách kết quả sẽ hiển thị tại đây sau khi xử lý xong.'
                : 'Tải file CSV lên để bắt đầu. Bảng này chỉ hiển thị danh sách phản hồi sau khi hệ thống xử lý xong.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <TableProperties className="w-5 h-5 text-slate-300" />
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            Xem trước phản hồi
            <span className="text-sm font-normal text-slate-500">({tableData.length}/{total} dòng)</span>
          </h3>
        </div>

        <div className="flex gap-2">
          <button className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap md:whitespace-normal">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 text-xs font-medium">
              <th className="pb-3 font-medium w-20">ID</th>
              <th className="pb-3 font-medium">Nội dung phản hồi</th>
              <th className="pb-3 font-medium text-center w-40">Kết quả ghi nhận</th>
              <th className="pb-3 font-medium text-right w-28">Độ chắc chắn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {tableData.map((row, index) => <TableRow key={index} data={row} />)}
          </tbody>
        </table>
      </div>

      <div className="pt-4 border-t border-slate-700 mt-4 flex items-center justify-between text-sm text-slate-400">
        <div>Hiển thị {tableData.length} trên tổng {total} phản hồi</div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} disabled={page <= 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 text-white font-medium border border-slate-600">
            {page}
          </button>
          <button onClick={onNext} disabled={page >= totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="grid grid-cols-12 gap-4 rounded-lg border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="col-span-1 h-4 rounded bg-slate-700" />
          <div className="col-span-7 h-4 rounded bg-slate-700" />
          <div className="col-span-2 h-4 rounded bg-slate-700" />
          <div className="col-span-2 h-4 rounded bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function TableRow({ data }) {
  const { id, content, sentiment, confidence } = data;
  const isPositive = sentiment === 'positive';

  return (
    <tr className="hover:bg-slate-800/30 transition-colors group">
      <td className="py-4 text-slate-500 font-mono text-xs">{id}</td>
      <td className="py-4 text-slate-300 pr-4 max-w-[250px] truncate" title={content}>
        {content}
      </td>
      <td className="py-4">
        <div className="flex justify-center">
          {sentiment ? (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {isPositive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
            </span>
          ) : (
            <span className="text-slate-500">Chưa xử lý</span>
          )}
        </div>
      </td>
      <td className="py-4 text-right">
        <div className="flex items-center justify-end gap-2 font-mono text-xs text-slate-300">
          {confidence === null ? '-' : `${confidence}%`}
        </div>
      </td>
    </tr>
  );
}
