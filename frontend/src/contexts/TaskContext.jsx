import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { analyzeUrl, predictBatch } from '../services/api';

const TaskContext = createContext(null);

const BACKGROUND_MESSAGE =
  'Đang nạp dữ liệu. Hệ thống sẽ phân tích ngầm, vui lòng xem kết quả tại trang Dashboard sau ít phút.';

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
            [
              'text',
              'content',
              'comment',
              'review',
              'binh_luan',
              'bình luận',
              'noi_dung',
              'nội dung',
            ].includes(String(name).trim().toLowerCase())
          ) || fields[0];

        const texts = data
          .map((row) => String(row[preferred] || '').trim())
          .filter(Boolean);

        setBatchFile(selected);
        setBatchColumns(fields);
        setBatchColumn(preferred || '');
        setBatchTexts(texts);
        setBatchResults([]);

        if (!texts.length) {
          toast.error('Không tìm thấy nội dung phản hồi trong file CSV.');
        }
      },
      error: (error) => toast.error(error.message || 'Không đọc được file CSV.'),
    });
  };

  const runBatchPrediction = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập trước khi phân tích file.');
      return;
    }
    if (!batchTexts.length) {
      toast.error('File chưa có phản hồi hợp lệ để phân tích.');
      return;
    }
    if (batchLoading) return;

    setBatchLoading(true);
    const loadingToast = toast.loading(BACKGROUND_MESSAGE);

    try {
      const data = await predictBatch({
        reviews: batchTexts.map((text) => ({
          content: text,
          review_date: new Date().toISOString(),
        })),
        user_id: user.id,
        source_url: 'CSV_Upload',
      });

      setBatchResults(data);
      toast.success(
        `Đã tiếp nhận ${data.length} phản hồi. Kết quả sẽ được cập nhật tại Dashboard.`,
        { id: loadingToast }
      );
    } catch (error) {
      toast.error(error.message || 'Không thể xử lý file CSV.', { id: loadingToast });
    } finally {
      setBatchLoading(false);
    }
  };

  const runUrlAnalysis = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập trước khi phân tích đường dẫn.');
      return;
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      toast.error('Vui lòng nhập đường dẫn hợp lệ.');
      return;
    }
    if (urlLoading) return;

    setUrlLoading(true);
    const loadingToast = toast.loading(BACKGROUND_MESSAGE);

    try {
      const data = await analyzeUrl({
        url: url.trim(),
        user_id: user.id,
      });

      setUrlResults(data);
      toast.success(
        `Đã tiếp nhận ${data.length} phản hồi từ đường dẫn. Dashboard sẽ cập nhật sau ít phút.`,
        { id: loadingToast }
      );
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
