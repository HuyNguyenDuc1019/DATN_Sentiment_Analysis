import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineChatBubbleLeftRight, HiOutlineSparkles, HiCheck } from 'react-icons/hi2';
import { submitFeedback } from '@/services/api';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FeedbackCenter = () => {
  const [text, setText] = useState('');
  const [oldPred, setOldPred] = useState(0);
  const [newPred, setNewPred] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const userId = localStorage.getItem('user_id');

    if (!text.trim()) {
      toast.error('Vui lòng nhập bình luận.');
      return;
    }

    if (!userId || !UUID_PATTERN.test(userId)) {
      toast.error('Thiếu user_id hợp lệ. Hãy đăng nhập hoặc lưu UUID user vào localStorage.user_id.');
      return;
    }

    setLoading(true);
    try {
      await submitFeedback({
        original_content: text.trim(),
        old_ai_label: oldPred,
        corrected_label: newPred,
        user_id: userId,
      });

      toast.success('Đã lưu đóng góp thành công!');
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setText('');
        setOldPred(0);
        setNewPred(1);
      }, 2500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Feedback Center</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gửi nhãn đúng để cải thiện mô hình AI</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700 space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border dark:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <HiOutlineChatBubbleLeftRight className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-ink dark:text-white">Đóng góp dữ liệu</h2>
            <p className="text-slate-400 text-sm">Nhập bình luận, nhãn AI dự đoán và nhãn đúng của bạn</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Bình luận gốc</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Nhập nội dung bình luận cần chỉnh nhãn..."
            className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-ink dark:text-white placeholder-slate-400 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Nhãn cũ AI dự đoán</label>
            <div className="space-y-2">
              {[1, 0].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setOldPred(v)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-sm transition-all ${oldPred === v ? (v === 1 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20') : 'border-border dark:border-slate-600 hover:border-slate-300'}`}
                >
                  <Badge prediction={v} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Nhãn đúng của bạn</label>
            <div className="space-y-2">
              {[1, 0].map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setNewPred(v)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-sm transition-all ${newPred === v ? (v === 1 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20') : 'border-border dark:border-slate-600 hover:border-slate-300'}`}
                >
                  <Badge prediction={v} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? <Spinner size="sm" className="text-white" /> : sent ? <HiCheck className="w-4 h-4" /> : <HiOutlineSparkles className="w-4 h-4" />}
          {loading ? 'Đang gửi...' : sent ? 'Đã gửi!' : 'Gửi đóng góp'}
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5"
      >
        <h3 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-2">Dữ liệu này được lưu như thế nào?</h3>
        <p className="text-blue-600 dark:text-blue-300 text-sm leading-relaxed">
          Hệ thống gửi bình luận gốc, nhãn AI đã dự đoán, nhãn đúng do bạn chọn và user_id lên backend để lưu vào bảng feedback_data.
        </p>
      </motion.div>
    </div>
  );
};

export default FeedbackCenter;
