import React, { useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

import VipPlanCard from '../../components/user/upgrade-vip/VipPlanCard';

import { delayPaymentMock } from '../../utils/user/upgradeVipUtils';
import {
  getCurrentUserId,
  upgradeUserToVip,
} from '../../services/user/upgradeVipService';

export default function UpgradeVIP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshUserProfile } = useAuth();

  const handleMockPayment = async () => {
    setIsProcessing(true);

    const paymentPromise = delayPaymentMock(2000);

    toast.promise(paymentPromise, {
      loading: 'Đang kết nối cổng thanh toán...',
      success: 'Thanh toán thành công! Đang nâng cấp tài khoản...',
      error: 'Thanh toán thất bại.',
    });

    await paymentPromise;

    try {
      const userId = await getCurrentUserId();

      await upgradeUserToVip({
        userId,
        amount: 99000,
      });

      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile();
      }

      toast.success('🎉 Chúc mừng! Bạn đã trở thành thành viên VIP.', {
        duration: 4000,
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra trong quá trình nâng cấp.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <VipPlanCard
        isProcessing={isProcessing}
        onUpgrade={handleMockPayment}
      />
    </div>
  );
}
