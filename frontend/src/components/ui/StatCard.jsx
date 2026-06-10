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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl p-6 ${gradient} shadow-card cursor-default`}
    >
      {/* Decorative circle */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-2 w-20 h-20 rounded-full bg-white/5" />

      <div className={`relative z-10 w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4 shadow-sm`}>
        {icon}
      </div>
      <p className="relative z-10 text-white/80 text-sm font-medium mb-1">{label}</p>
      <p className="relative z-10 text-white text-3xl font-display font-bold tracking-tight">
        {rendered}
        {suffix && <span className="text-xl ml-0.5 font-sans font-medium text-white/70">{suffix}</span>}
      </p>
    </motion.div>
  );
};

export default StatCard;