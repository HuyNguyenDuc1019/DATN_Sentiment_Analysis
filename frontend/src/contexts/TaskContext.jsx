import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { analyzeUrl, predictBatch } from '../services/api';

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const { user } = useAuth();

  const [batchFile, setBatchFile] = useState(null);
  const [batchTexts, setBatchTexts] = useState([]);
  const [batchColumn, setBatchColumn] = useState('');
  const [batchColumns, setBatchColumns] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const [url, setUrl] = useState('');
  const [urlResults, setUrlResults] = useState([]);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlFilter, setUrlFilter] = useState('all');

  useEffect(() => {
    setBatchFile(null);
    setBatchTexts([]);
    setBatchColumn('');
    setBatchColumns([]);
    setBatchResults([]);
    setBatchLoading(false);
    setUrl('');
    setUrlResults([]);
    setUrlLoading(false);
    setUrlFilter('all');
  }, [user?.id]);

  const selectBatchFile = (selected) => {
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

        setBatchFile(selected);
        setBatchColumns(fields);
        setBatchColumn(preferred || '');
        setBatchTexts(data.map((row) => String(row[preferred] || '').trim()).filter(Boolean));
        setBatchResults([]);
      },
      error: (error) => toast.error(error.message),
    });
  };

  const runBatchPrediction = async () => {
    if (!user?.id || !batchTexts.length || batchLoading) return;

    setBatchLoading(true);
    const loadingToast = toast.loading(
      'Đang nạp dữ liệu. Hệ thống sẽ phân tích ngầm, vui lòng xem kết quả tại trang Dashboard sau ít phút.'
    );

    try {
      const data = await predictBatch({
        texts: batchTexts,
        user_id: user.id,
        source_url: 'CSV_Upload',
      });

      setBatchResults(data);
      toast.success(`Đã tiếp nhận ${data.length} phản hồi. Kết quả sẽ được cập nhật tại Dashboard.`, { id: loadingToast });
    } catch (error) {
      toast.error(error.message || 'Không thể xử lý file CSV.', { id: loadingToast });
    } finally {
      setBatchLoading(false);
    }
  };

  const runUrlAnalysis = async () => {
    if (!/^https?:\/\//i.test(url.trim()) || !user?.id) {
      toast.error('Vui lòng nhập đường dẫn hợp lệ.');
      return;
    }
    if (urlLoading) return;

    setUrlLoading(true);
    const loadingToast = toast.loading(
      'Đang nạp dữ liệu. Hệ thống sẽ phân tích ngầm, vui lòng xem kết quả tại trang Dashboard sau ít phút.'
    );

    try {
      const data = await analyzeUrl({ url: url.trim(), user_id: user.id });
      setUrlResults(data);
      toast.success(`Đã tiếp nhận ${data.length} phản hồi từ đường dẫn. Dashboard sẽ cập nhật sau ít phút.`, { id: loadingToast });
    } catch (error) {
      toast.error(
        error.message === 'Failed to fetch'
          ? 'Không kết nối được bộ thu thập dữ liệu tại cổng 3000.'
          : error.message,
        { id: loadingToast }
      );
    } finally {
      setUrlLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      batch: {
        file: batchFile,
        texts: batchTexts,
        column: batchColumn,
        columns: batchColumns,
        results: batchResults,
        loading: batchLoading,
        selectFile: selectBatchFile,
        setColumn: setBatchColumn,
        analyze: runBatchPrediction,
      },
      urlAnalyzer: {
        url,
        setUrl,
        results: urlResults,
        loading: urlLoading,
        filter: urlFilter,
        setFilter: setUrlFilter,
        analyze: runUrlAnalysis,
      },
    }),
    [
      batchFile,
      batchTexts,
      batchColumn,
      batchColumns,
      batchResults,
      batchLoading,
      url,
      urlResults,
      urlLoading,
      urlFilter,
      user?.id,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used inside TaskProvider');
  }
  return context;
}
