import React from 'react';
import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';

const StatCard = ({
  label,
  value,
  suffix = '',
  icon,
  gradient,
  iconBg,
  delay = 0,
  isFloat,
}) => {
  const displayValue = isFloat ? value : Math.round(value);
  const animatedInt = useCountUp(Math.round(displayValue * (isFloat ? 100 : 1)));
  const rendered = isFloat ? (animatedInt / 100).toFixed(1) : animatedInt.toLocaleString('vi-VN');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      className={`relative min-h-[132px] overflow-hidden rounded-xl p-4 sm:p-5 ${gradient} shadow-card cursor-default`}
    >
      {/* Decorative circle */}
      <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/10 sm:h-28 sm:w-28" />
      <div className="absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/5" />

      <div className={`relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-xl sm:mb-4 sm:h-11 sm:w-11 ${iconBg} shadow-sm`}>
        {icon}
      </div>
      <p className="relative z-10 mb-1 text-xs font-medium text-white/80 sm:text-sm">{label}</p>
      <p className="relative z-10 break-words font-display text-2xl font-bold tracking-normal text-white sm:text-3xl">
        {rendered}
        {suffix && <span className="ml-0.5 font-sans text-base font-medium text-white/70 sm:text-xl">{suffix}</span>}
      </p>
    </motion.div>
  );
};

export default StatCard;
