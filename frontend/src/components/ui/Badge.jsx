import React from 'react';

const Badge = ({ prediction }) => {
  if (prediction === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-600 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Tích cực
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-600 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      Tiêu cực
    </span>
  );
};

export default Badge;