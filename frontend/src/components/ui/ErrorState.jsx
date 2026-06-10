import React from 'react';
import { motion } from 'framer-motion';
import { HiExclamationTriangle } from 'react-icons/hi2';

const ErrorState = ({ message, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
      <HiExclamationTriangle className="w-7 h-7 text-red-500" />
    </div>
    <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">{message}</p>
    <p className="text-slate-400 text-sm mb-5">Kiểm tra xem API FastAPI đã chạy bằng uvicorn hay chưa.</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Thử lại
      </button>
    )}
  </motion.div>
);

export default ErrorState;