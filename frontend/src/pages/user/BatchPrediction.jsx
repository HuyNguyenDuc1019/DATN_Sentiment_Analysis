import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasks } from '../../contexts/TaskContext';
import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/common/UpgradeModal';

import MiniStat from '../../components/user/batch/MiniStat';
import UploadCard from '../../components/user/batch/UploadCard';
import ConfigCard from '../../components/user/batch/ConfigCard';
import ProcessSummary from '../../components/user/batch/ProcessSummary';
import PreviewTable from '../../components/user/batch/PreviewTable';

import { getBatchStats, normalizeBatchResults } from '../../utils/user/batchUtils';

export default function BatchPrediction() {
  const inputRef = useRef(null);
  const { userProfile, refreshUserProfile } = useAuth();
  const { batch } = useTasks();
  const { file, texts, column, columns, results, loading, selectFile, setColumn, analyze } = batch;

  const [page, setPage] = useState(1);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const pageSize = 8;
  const isVip = userProfile?.tier === 'vip';

  useEffect(() => {
    setPage(1);
  }, [file?.name, results.length]);

  const tableData = useMemo(() => normalizeBatchResults(results), [results]);
  const { positiveCount, negativeCount, averageConfidence } = useMemo(
    () => getBatchStats(tableData),
    [tableData],
  );

  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));
  const visibleRows = tableData.slice((page - 1) * pageSize, page * pageSize);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) {
      selectFile(selectedFile);
      return;
    }

    if (!isVip && selectedFile.size > 5 * 1024 * 1024) {
      toast.error('Gói Free chỉ hỗ trợ file tối đa 5MB.');
      setIsUpgradeModalOpen(true);
      return;
    }

    selectFile(selectedFile);
  };

  const handleAnalyze = async () => {
    if (!isVip && texts.length > 50) {
      toast.error('Gói Free chỉ hỗ trợ tối đa 50 bình luận/lần.');
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      await analyze();
    } catch (error) {
      const status = error?.status || error?.response?.status;

      if (status === 403 || String(error?.message || '').includes('403')) {
        setIsUpgradeModalOpen(true);
        return;
      }

      throw error;
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] p-6 font-sans animate-in fade-in duration-500 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            CSV Sentiment Batch
          </div>
          <h1 className="text-2xl font-semibold tracking-wide text-white">Nhập phản hồi từ file</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Tải file CSV, chọn cột chứa bình luận và để hệ thống phân tích hàng loạt. Kết quả sẽ được ghi nhận để cập nhật Tổng quan.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-700 bg-slate-800/40 p-3 backdrop-blur-md">
          <MiniStat label="Đã đọc" value={texts.length} />
          <MiniStat label="Hài lòng" value={positiveCount} tone="positive" />
          <MiniStat label="Chưa hài lòng" value={negativeCount} tone="negative" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <UploadCard file={file} count={texts.length} inputRef={inputRef} onFile={handleFileSelect} isVip={isVip} />

          <ConfigCard
            columns={columns}
            column={column}
            setColumn={setColumn}
            disabled={!texts.length || loading}
            loading={loading}
            onAnalyze={handleAnalyze}
            isVip={isVip}
          />

          <ProcessSummary
            file={file}
            count={texts.length}
            column={column}
            resultCount={tableData.length}
            averageConfidence={averageConfidence}
            isVip={isVip}
          />
        </div>

        <PreviewTable
          tableData={visibleRows}
          total={tableData.length}
          loading={loading}
          hasFile={Boolean(file)}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          isVip={isVip}
          onUpgrade={() => setIsUpgradeModalOpen(true)}
          positiveCount={positiveCount}
          negativeCount={negativeCount}
          averageConfidence={averageConfidence}
        />
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </div>
  );
}
