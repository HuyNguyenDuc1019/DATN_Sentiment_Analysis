import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiXMark, HiCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { submitFeedback } from '@/services/api';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

const FeedbackModal = ({ item, onClose, onSuccess }) => {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!item || selected === null) return;
    setLoading(true);
    try {
      await submitFeedback({ text: item.text, old_prediction: item.prediction, new_prediction: selected });
      toast.success('Đã lưu đính chính thành công!', { duration: 3000 });
      onSuccess(item, selected);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Lỗi khi lưu feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-border dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border dark:border-slate-700">
              <div>
                <h2 className="font-display font-bold text-ink dark:text-white text-lg">Đính chính nhãn</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Chọn nhãn đúng cho bình luận này</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
                <HiXMark className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Comment */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bình luận</p>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-4">
                  {item.text}
                </div>
              </div>

              {/* Current label */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nhãn hiện tại</p>
                <Badge prediction={item.prediction} />
              </div>

              {/* New label */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chọn nhãn mới</p>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 0].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSelected(val)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-sm font-medium ${
                        selected === val
                          ? val === 1
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                          : 'border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected === val ? (val === 1 ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500') : 'border-slate-300 dark:border-slate-500'
                      }`}>
                        {selected === val && <HiCheck className="w-2.5 h-2.5 text-white" />}
                      </span>
                      {val === 1 ? '🟢 Tích cực' : '🔴 Tiêu cực'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-border dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={loading || selected === null}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="text-white" /> Đang lưu...
                  </>
                ) : (
                  'Lưu đính chính'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeedbackModal;