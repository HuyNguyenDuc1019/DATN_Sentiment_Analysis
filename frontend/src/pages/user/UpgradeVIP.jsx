import React, { useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import { createVnpayPayment } from '../../services/paymentService';

import VipPlanCard from '../../components/user/upgrade-vip/VipPlanCard';

export default function UpgradeVIP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  const handleUpgrade = async () => {
    try {
      if (!user?.id) {
        toast.error('Bạn cần đăng nhập trước khi nâng cấp VIP.');
        return;
      }

      setIsProcessing(true);

      const response = await createVnpayPayment({
        userId: user.id,
        amount: 50000,
      });

      const paymentUrl =
        response?.payment_url ||
        response?.data?.payment_url ||
        response?.paymentUrl ||
        response?.url;

      if (!paymentUrl) {
        throw new Error('Backend chưa trả về payment_url.');
      }

      toast.success('Đang chuyển sang cổng thanh toán VNPay...');

      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Lỗi tạo thanh toán VNPay:', error);
      toast.error(error.message || 'Không thể tạo thanh toán VNPay.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col items-center justify-center p-6">
      <VipPlanCard
        isProcessing={isProcessing}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}