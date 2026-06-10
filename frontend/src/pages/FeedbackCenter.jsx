import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineChatBubbleLeftRight, HiOutlineSparkles, HiCheck } from 'react-icons/hi2';
import { submitFeedback } from '@/services/api';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

const FeedbackCenter = () => {
  const [text, setText] = useState('');
  const [oldPred, setOldPred] = useState(0);
  const [newPred, setNewPred] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) { 
      toast.error('Vui lòng nhập bình luận.'); 
      return; 
    }
    setLoading(true);
    try {
      await submitFeedback({ 
        text: text.trim(), 
        old_prediction: oldPred, 
        new_prediction: newPred 
      });
      toast.success('Đã lưu đính chính thành công!');
      setSent(true);
      setTimeout(() => { 
        setSent(false); 
        setText(''); 
      }, 2500);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Feedback Center</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gửi đính chính để cải thiện mô hình AI</p>
      </motion.div>

      {/* Form Card */}
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
            <h2 className="font-semibold text-ink dark:text-white">Gửi feedback thủ công</h2>
            <p className="text-slate-400 text-sm">Điền thông tin bình luận cần đính chính</p>
          </div>
        </div>

        {/* Text Area */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Bình luận</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Nhập nội dung bình luận cần đính chính..."
            className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-ink dark:text-white placeholder-slate-400 resize-none"
          />
        </div>

        {/* Labels Selection */}
        <div className="grid grid-cols-2 gap-4">
          {/* Old Prediction */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Nhãn cũ (AI dự đoán)</label>
            <div className="space-y-2">
              {[1, 0].map((v) => (
                <button 
                  key={v} 
                  onClick={() => setOldPred(v)} 
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 text-sm transition-all ${oldPred === v ? (v === 1 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20') : 'border-border dark:border-slate-600 hover:border-slate-300'}`}
                >
                  <Badge prediction={v} />
                </button>
              ))}
            </div>
          </div>
          
          {/* New/Correct Prediction */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Nhãn đúng (của bạn)</label>
            <div className="space-y-2">
              {[1, 0].map((v) => (
                <button 
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

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? <Spinner size="sm" className="text-white" /> : sent ? <HiCheck className="w-4 h-4" /> : <HiOutlineSparkles className="w-4 h-4" />}
          {loading ? 'Đang gửi...' : sent ? 'Đã gửi!' : 'Gửi đính chính'}
        </button>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5"
      >
        <h3 className="font-semibold text-blue-700 dark:text-blue-400 text-sm mb-2">Tại sao feedback quan trọng?</h3>
        <p className="text-blue-600 dark:text-blue-300 text-sm leading-relaxed">
          Mỗi đính chính bạn gửi sẽ được lưu vào bộ dữ liệu huấn luyện. Khi tích lũy đủ mẫu, mô hình AI sẽ được tái huấn luyện để cải thiện độ chính xác, giúp hệ thống ngày càng thông minh hơn.
        </p>
      </motion.div>
    </div>
  );
};

export default FeedbackCenter;