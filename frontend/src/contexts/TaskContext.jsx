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
  const [urlCount, setUrlCount] = useState(0);
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
    setUrlCount(0);
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
      const csvFileName = batchFile?.name || 'CSV_Upload';

      const data = await predictBatch({
        reviews: batchTexts.map((text) => ({
          content: text,
          review_date: new Date().toISOString(),
        })),
        user_id: user.id,
        source_url: 'CSV_Upload',

        // THÊM MỚI: để Settings hiển thị đúng tên file CSV
        dataset_name: csvFileName,
        file_name: csvFileName,
      });

      setBatchResults(data);
      toast.success(
        `Đã tiếp nhận ${data.length} phản hồi. Kết quả sẽ được cập nhật tại Dashboard.`,
        { id: loadingToast }
      );
    } catch (error) {
      toast.error(error.message || 'Không thể xử lý file CSV.', { id: loadingToast });

      // Quan trọng: ném lỗi ra ngoài để BatchPrediction.jsx bắt được status 403
      // và mở UpgradeModal khi gói Free vượt giới hạn.
      throw error;
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
      const cleanUrl = url.trim();

      const data = await analyzeUrl({
        url: cleanUrl,
        user_id: user.id,

        // THÊM MỚI: nếu backend/scraper chuyển tiếp field này sang /predict/batch,
        // Settings sẽ hiển thị theo link/quán thay vì tên mặc định.
        dataset_name: cleanUrl,
      });

      const receivedCount = Number(data.count || data.results?.length || 0);
      setUrlResults(data.results || []);
      setUrlCount(receivedCount);
      const successMessage = receivedCount > 0
        ? `Đã tiếp nhận ${receivedCount} phản hồi từ đường dẫn. Dashboard sẽ cập nhật sau ít phút.`
        : 'Đã kiểm tra đường dẫn này. Hiện chưa có phản hồi mới để cập nhật.';
      toast.success(successMessage, { id: loadingToast });
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
        count: urlCount,
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
      urlCount,
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
