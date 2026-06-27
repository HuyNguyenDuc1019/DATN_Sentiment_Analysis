import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  CloudUpload,
  Settings,
  ChevronDown,
  Play,
  Loader2,
  TableProperties,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { predictBatch } from '../services/api';

export default function BatchPredictionContent() {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [texts, setTexts] = useState([]);
  const [column, setColumn] = useState('');
  const [columns, setColumns] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectFile = (selected) => {
    if (!selected) return;

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const fields = meta.fields || [];
        const preferred =
          fields.find((name) =>
            ['text', 'content', 'comment', 'review', 'bình luận', 'binh_luan'].includes(
              name.toLowerCase()
            )
          ) || fields[0];

        setFile(selected);
        setColumns(fields);
        setColumn(preferred || '');
        setTexts(data.map((row) => String(row[preferred] || '').trim()).filter(Boolean));
        setResults([]);
      },
      error: (error) => window.alert(error.message),
    });
  };

  const analyze = async () => {
    if (!user?.id || !texts.length) return;

    setLoading(true);
    try {
      setResults(await predictBatch({ texts, user_id: user.id, source_url: 'CSV_Upload' }));
    } catch (error) {
      window.alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const tableData = (results.length ? results : texts.map((text) => ({ text, prediction: null, confidence: 0 })))
    .slice(0, 5)
    .map((item, index) => ({
      id: `#${String(index + 1).padStart(4, '0')}`,
      content: item.text,
      sentiment: item.prediction === null ? null : item.prediction === 1 ? 'positive' : 'negative',
      confidence: item.prediction === null ? null : Math.round(item.confidence * 100),
    }));

  return (
    <div className="p-8 animate-in fade-in duration-500 font-sans h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">Dự đoán hàng loạt</h1>
        <p className="text-slate-400 text-sm">
          Tải lên tệp dữ liệu lớn để phân tích cảm xúc đa luồng.
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
          <PreviewTable tableData={tableData} total={results.length || texts.length} />
        </div>
      </div>
    </div>
  );
}

function UploadCard({ file, count, inputRef, onFile }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onFile(e.dataTransfer.files?.[0]);
      }}
      className="bg-slate-800/30 backdrop-blur-md border border-dashed border-slate-600 hover:border-indigo-500 transition-colors rounded-2xl p-8 flex flex-col items-center justify-center text-center"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 shadow-lg">
        <CloudUpload className="w-6 h-6 text-indigo-400" />
      </div>

      <h3 className="text-lg font-medium text-white mb-2">{file ? file.name : 'Tải lên tệp CSV'}</h3>
      <p className="text-slate-400 text-sm mb-6 max-w-[200px]">
        {file ? `${count} dòng bình luận đã đọc` : 'Kéo thả tệp của bạn vào đây hoặc nhấp để duyệt.'}
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
        <h3 className="text-base font-medium text-white">Cấu hình mô hình</h3>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Nguồn dữ liệu</label>
          <div className="relative">
            <select className="w-full bg-slate-900 border border-slate-700 text-slate-300 rounded-lg py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm">
              <option>CSV Upload</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Cột chứa văn bản</label>
          <div className="relative">
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              disabled={!columns.length}
              className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 rounded-lg py-2.5 pl-4 pr-10 appearance-none cursor-not-allowed text-sm"
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
              ? 'cursor-wait border border-indigo-400/50 bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : ready
                ? 'border border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-500/30'
                : 'cursor-not-allowed border border-slate-700 bg-slate-800/70 text-slate-500'
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? 'Đang phân tích...' : 'Bắt đầu phân tích'}
        </button>

        {loading && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900 border border-indigo-500/20">
            <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300" />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewTable({ tableData, total }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <TableProperties className="w-5 h-5 text-slate-300" />
          <h3 className="text-base font-medium text-white flex items-center gap-2">
            Xem trước mẫu phân tích
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
              <th className="pb-3 font-medium">Nội dung đánh giá</th>
              <th className="pb-3 font-medium text-center w-32">Dự đoán</th>
              <th className="pb-3 font-medium text-right w-24">Độ tin cậy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {tableData.map((row, index) => <TableRow key={index} data={row} />)}
          </tbody>
        </table>
      </div>

      <div className="pt-4 border-t border-slate-700 mt-4 flex items-center justify-between text-sm text-slate-400">
        <div>Hiển thị {tableData.length} trên tổng {total} kết quả</div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700 text-white font-medium border border-slate-600">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
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
              {isPositive ? 'Tích cực' : 'Tiêu cực'}
            </span>
          ) : (
            <span className="text-slate-500">Chưa phân tích</span>
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