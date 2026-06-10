import React from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineChartBar,
  HiFaceSmile,
  HiFaceFrown,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import StatCard from '@/components/ui/StatCard';
import SentimentPieChart from '@/components/charts/SentimentPieChart';
import ConfidenceBarChart from '@/components/charts/ConfidenceBarChart';

// Mảng dữ liệu mẫu (Demo data) sau khi đã loại bỏ khai báo type
const DEMO = [
  { text: 'Sản phẩm rất tốt, đóng gói cẩn thận!', prediction: 1, confidence: 0.97 },
  { text: 'Giao hàng quá chậm, không hài lòng chút nào.', prediction: 0, confidence: 0.91 },
  { text: 'Chất lượng tuyệt vời, sẽ mua lại.', prediction: 1, confidence: 0.95 },
  { text: 'Hàng bị lỗi, cần đổi trả ngay.', prediction: 0, confidence: 0.88 },
  { text: 'Giá tốt, phục vụ nhiệt tình.', prediction: 1, confidence: 0.93 },
  { text: 'Shop tư vấn rất nhiệt tình.', prediction: 1, confidence: 0.89 },
  { text: 'Hàng không đúng mô tả.', prediction: 0, confidence: 0.85 },
  { text: 'Giao nhanh, hàng đẹp.', prediction: 1, confidence: 0.96 },
];

const Dashboard = () => {
  const total = DEMO.length;
  const positive = DEMO.filter((r) => r.prediction === 1).length;
  const negative = total - positive;
  const avgConf = DEMO.reduce((a, r) => a + r.confidence, 0) / total;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-semibold rounded-full border border-primary-100 dark:border-primary-800">
            <HiOutlineSparkles className="w-3.5 h-3.5" />
            AI Powered
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Dashboard Tổng quan</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Thống kê phân tích cảm xúc từ AI · Dữ liệu demo</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tổng bình luận"
          value={total}
          icon={<HiOutlineChartBar className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-primary-600 to-blue-400"
          iconBg="bg-white/20"
          delay={0}
        />
        <StatCard
          label="Tích cực"
          value={positive}
          icon={<HiFaceSmile className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-green-500 to-emerald-400"
          iconBg="bg-white/20"
          delay={0.1}
        />
        <StatCard
          label="Tiêu cực"
          value={negative}
          icon={<HiFaceFrown className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-red-500 to-rose-400"
          iconBg="bg-white/20"
          delay={0.2}
        />
        <StatCard
          label="Avg Confidence"
          value={avgConf * 100}
          suffix="%"
          icon={<HiOutlineSparkles className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-600 to-purple-400"
          iconBg="bg-white/20"
          delay={0.3}
          isFloat
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentPieChart positive={positive} negative={negative} />
        <ConfidenceBarChart results={DEMO} />
      </div>

      {/* Quick info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-primary-600 to-blue-500 rounded-2xl p-6 text-white"
      >
        <h3 className="font-display font-bold text-lg mb-1">Bắt đầu phân tích ngay</h3>
        <p className="text-blue-100 text-sm mb-4">Upload file CSV hoặc dán link Shopee/Foody để phân tích hàng nghìn bình luận chỉ trong vài giây.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/batch" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-600 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors">
            Upload CSV →
          </a>
          <a href="/url" className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white font-semibold text-sm rounded-xl hover:bg-white/30 transition-colors border border-white/30">
            Phân tích URL →
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;