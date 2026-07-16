import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { analyzeUrl, predictBatch, stopScrapeTask } from '../services/api';

const TaskContext = createContext(null);

const BACKGROUND_MESSAGE =
  'Đang nạp dữ liệu. Hệ thống sẽ phân tích ngầm, vui lòng xem kết quả tại trang Dashboard sau ít phút.';

const createTaskId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const detectUrlSource = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized.includes('foody.vn')) {
    return {
      type: 'foody',
      name: 'Foody',
    };
  }

  if (
    normalized.includes('google.com/maps') ||
    normalized.includes('www.google.com/maps') ||
    normalized.includes('maps.google.com') ||
    normalized.includes('maps.app.goo.gl') ||
    normalized.includes('goo.gl/maps') ||
    normalized.includes('google.com/search')
  ) {
    return {
      type: 'google_maps',
      name: 'Google Maps',
    };
  }

  return {
    type: 'unknown',
    name: 'Không xác định',
  };
};

export function TaskProvider({ children }) {
  const { user } = useAuth();

  const batchAbortRef = useRef(null);
  const urlAbortRef = useRef(null);
  const urlTaskIdRef = useRef(null);

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
    batchAbortRef.current?.abort();
    urlAbortRef.current?.abort();

    if (urlTaskIdRef.current) {
      stopScrapeTask(urlTaskIdRef.current);
    }

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

    batchAbortRef.current = null;
    urlAbortRef.current = null;
    urlTaskIdRef.current = null;
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
            ].includes(String(name).trim().toLowerCase()),
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
      error: (error) => {
        toast.error(error.message || 'Không đọc được file CSV.');
      },
    });
  };

  const stopBatchPrediction = () => {
    if (!batchLoading) return;

    batchAbortRef.current?.abort();
    batchAbortRef.current = null;

    setBatchLoading(false);
    toast.success('Đã dừng phân tích file.');
  };

  const stopUrlAnalysis = async () => {
    if (!urlLoading) return;

    urlAbortRef.current?.abort();

    if (urlTaskIdRef.current) {
      await stopScrapeTask(urlTaskIdRef.current);
    }

    urlAbortRef.current = null;
    urlTaskIdRef.current = null;

    setUrlLoading(false);
    toast.success('Đã gửi lệnh dừng thu thập dữ liệu.');
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

    const controller = new AbortController();
    batchAbortRef.current = controller;

    setBatchLoading(true);
    const loadingToast = toast.loading(BACKGROUND_MESSAGE);

    try {
      const csvFileName = batchFile?.name || 'CSV_Upload';

      const data = await predictBatch(
        {
          reviews: batchTexts.map((text) => ({
            content: text,
            review_date: new Date().toISOString(),
          })),
          user_id: user.id,
          source_url: 'CSV_Upload',
          dataset_name: csvFileName,
          file_name: csvFileName,
          dataset_type: 'csv',
        },
        {
          signal: controller.signal,
        },
      );

      setBatchResults(data);

      toast.success(
        `Đã tiếp nhận ${data.length} phản hồi. Kết quả sẽ được cập nhật tại Dashboard.`,
        { id: loadingToast },
      );
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.success('Đã dừng phân tích file.', { id: loadingToast });
        return;
      }

      toast.error(error.message || 'Không thể xử lý file CSV.', { id: loadingToast });
      throw error;
    } finally {
      setBatchLoading(false);
      batchAbortRef.current = null;
    }
  };

  const runUrlAnalysis = async ({ customStartDate = '', customEndDate = '' } = {}) => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập trước khi phân tích đường dẫn.');
      return;
    }

    const cleanUrl = url.trim();

    if (!/^https?:\/\//i.test(cleanUrl)) {
      toast.error('Vui lòng nhập đường dẫn hợp lệ.');
      return;
    }

    if (urlLoading) return;

    const sourceInfo = detectUrlSource(cleanUrl);
    if (sourceInfo.type === 'unknown') {
      toast.error('Hệ thống hiện chỉ hỗ trợ link Foody và Google Maps.');
      return;
    }

    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);

      if (start > end) {
        toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
        return;
      }
    }

    const controller = new AbortController();
    const taskId = createTaskId();

    urlAbortRef.current = controller;
    urlTaskIdRef.current = taskId;

    setUrlLoading(true);
    const loadingToast = toast.loading(BACKGROUND_MESSAGE);

    try {
      const payload = {
        task_id: taskId,
        url: cleanUrl,
        user_id: user.id,
        dataset_name: sourceInfo.name,
        dataset_type: sourceInfo.type,
      };

      if (customStartDate) {
        payload.custom_start_date = new Date(customStartDate).toISOString();
      }

      if (customEndDate) {
        const endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);

        payload.custom_end_date = endDate.toISOString();
      }

      console.log('Payload gửi xuống scraper:', payload);

      const data = await analyzeUrl(payload, {
        signal: controller.signal,
      });

      const receivedCount = Number(data.count || data.results?.length || 0);

      setUrlResults(data.results || []);
      setUrlCount(receivedCount);

      const successMessage =
        receivedCount > 0
          ? `Đã tiếp nhận ${receivedCount} phản hồi từ ${sourceInfo.name}. Dashboard sẽ cập nhật sau ít phút.`
          : `Đã kiểm tra ${sourceInfo.name}. Hiện chưa có phản hồi mới để cập nhật.`;

      toast.success(successMessage, { id: loadingToast });
    } catch (error) {
      if (error.name === 'AbortError') {
        toast.success('Đã dừng thu thập dữ liệu.', { id: loadingToast });
        return;
      }

      toast.error(
        error.message === 'Failed to fetch'
          ? 'Không kết nối được bộ thu thập dữ liệu tại cổng 3000.'
          : error.message,
        { id: loadingToast },
      );
    } finally {
      setUrlLoading(false);
      urlAbortRef.current = null;
      urlTaskIdRef.current = null;
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
        stop: stopBatchPrediction,
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
        stop: stopUrlAnalysis,
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
    ],
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
