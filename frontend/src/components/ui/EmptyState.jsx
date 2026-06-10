import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineInbox } from 'react-icons/hi2';

const EmptyState = ({
  title = 'Chưa có dữ liệu',
  description = 'Upload file CSV hoặc nhập URL để bắt đầu phân tích.',
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <HiOutlineInbox className="w-7 h-7 text-slate-400" />
    </div>
    <p className="text-slate-600 dark:text-slate-400 font-medium">{title}</p>
    <p className="text-slate-400 text-sm mt-1 max-w-xs">{description}</p>
  </motion.div>
);

export default EmptyState;