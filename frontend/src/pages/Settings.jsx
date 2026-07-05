import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CreditCard,
  Crown,
  Database,
  Lock,
  Save,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import UpgradeModal from '../components/common/UpgradeModal';

const API_BASE_URL = 'http://localhost:8000';

export default function SettingsContent() {
  const [activeTab, setActiveTab] = useState('ai');

  // Lấy dữ liệu thật từ hệ thống, không dùng mock.
  const { user, profile, userProfile, refreshUserProfile } = useAuth();
  const currentProfile = userProfile || profile;
  const userId = user?.id;
  const isVip = currentProfile?.tier === 'vip';

  // ==========================================
  // 1. KHAI BÁO STATE QUẢN LÝ FORM
  // ==========================================
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  // State Tab AI
  const [threshold, setThreshold] = useState(50);
  const [stopWords, setStopWords] = useState('');

  // State Tab Thông báo
  const [alertEmail, setAlertEmail] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);

  // State Tab Dữ liệu
  const [retentionDays, setRetentionDays] = useState(7);

  // ==========================================
  // 2. FETCH DỮ LIỆU TỪ BACKEND (GET)
  // ==========================================
  useEffect(() => {
    const fetchSettings = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const response = await fetch(`${API_BASE_URL}/api/user/settings?user_id=${userId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || 'Không thể tải cấu hình');
        }

        const data = await response.json();

        if (data) {
          setThreshold(Number(data.custom_threshold ?? 50));
          setStopWords(data.custom_sensitive_words ?? '');
          setAlertEmail(Boolean(data.alert_email ?? false));
          setWeeklyReport(Boolean(data.weekly_report ?? true));

          const nextRetentionDays = Number(data.retention_days || (isVip ? 30 : 7));
          setRetentionDays(isVip ? nextRetentionDays : 7);
        }
      } catch (error) {
        toast.error(error.message || 'Lỗi khi tải cấu hình hệ thống!');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [userId, isVip]);

  useEffect(() => {
    if (!isVip && retentionDays !== 7) {
      setRetentionDays(7);
    }
  }, [isVip, retentionDays]);

  // ==========================================
  // 3. HÀM LƯU DỮ LIỆU (PUT)
  // ==========================================
  const handleSaveSettings = async () => {
    if (!userId) {
      toast.error('Vui lòng đăng nhập trước khi lưu cấu hình.');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        user_id: userId,
        custom_threshold: Number(threshold),
        custom_sensitive_words: stopWords,
        alert_email: Boolean(alertEmail),
        weekly_report: Boolean(weeklyReport),
        retention_days: isVip ? Number(retentionDays) : 7,
      };

      const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Lưu cấu hình thất bại');
      }

      toast.success('Đã lưu cấu hình thành công!');
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi lưu cấu hình.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 4. XÓA TOÀN BỘ DỮ LIỆU (DELETE)
  // ==========================================
  const handleOpenClearConfirm = () => {
    if (!userId) {
      toast.error('Vui lòng đăng nhập trước khi xóa dữ liệu.');
      return;
    }

    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearAllData = async () => {
    if (!userId) {
      toast.error('Vui lòng đăng nhập trước khi xóa dữ liệu.');
      setIsClearConfirmOpen(false);
      return;
    }

    try {
      setIsClearing(true);

      const response = await fetch(`${API_BASE_URL}/api/user/data/clear?user_id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Không thể xóa dữ liệu');
      }

      toast.success('Đã xóa toàn bộ dữ liệu thành công.');
      setIsClearConfirmOpen(false);
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa dữ liệu.');
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  const tabs = [
    { id: 'ai', label: 'Cấu hình AI', icon: <BrainCircuit size={18} /> },
    { id: 'notifications', label: 'Thông báo', icon: <Bell size={18} /> },
    { id: 'billing', label: 'Gói & Thanh toán', icon: <CreditCard size={18} /> },
    { id: 'data', label: 'Quản lý Dữ liệu', icon: <Database size={18} /> },
  ];

  if (isLoading) {
    return <div className="p-8 text-slate-400">Đang tải cấu hình hệ thống...</div>;
  }

  return (
    <>
      <div className="p-8 h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">Cài đặt hệ thống</h1>
          <p className="text-slate-400 text-sm">
            Quản lý cấu hình trí tuệ nhân tạo, thông báo và tài nguyên của bạn.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 flex-1 min-h-0">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-2 border border-slate-700/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all mb-1 ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 min-h-[500px] h-full flex flex-col">
              {/* ================= TAB 1: CẤU HÌNH AI ================= */}
              {activeTab === 'ai' && (
                <div className="relative flex-1 flex flex-col">
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-white">Tùy chỉnh Trí tuệ nhân tạo</h2>
                  </div>

                  <div
                    className={`space-y-8 flex-1 transition-all duration-300 ${
                      !isVip ? 'opacity-20 blur-[3px] pointer-events-none select-none' : ''
                    }`}
                  >
                    {/* Ngưỡng tin cậy (Slider) */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ngưỡng độ nhạy phân tích ({threshold}%)
                      </label>
                      <div className="px-2 mt-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value))}
                          className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between items-center mt-3 text-xs font-semibold">
                          <span className="text-rose-400">Thiên về Tiêu cực (0%)</span>
                          <span className="text-emerald-400">Thiên về Tích cực (100%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Từ điển nhạy cảm */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Từ điển Cảnh báo đỏ (Crisis Stop-words)
                      </label>
                      <textarea
                        rows="3"
                        value={stopWords}
                        onChange={(e) => setStopWords(e.target.value)}
                        placeholder="Nhập các từ cách nhau bằng dấu phẩy..."
                        className="w-full bg-slate-900/80 border border-slate-700 text-slate-300 text-sm rounded-xl p-4 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Overlay khóa VIP */}
                  {!isVip && (
                    <button
                      type="button"
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900/40 rounded-xl"
                    >
                      <div className="bg-slate-800 border border-slate-600 p-8 rounded-2xl max-w-sm text-center shadow-2xl">
                        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Lock className="text-indigo-400 w-8 h-8" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Tính năng độc quyền VIP</h3>
                        <p className="text-slate-400 text-sm">
                          Nâng cấp VIP để chỉnh ngưỡng AI và từ điển cảnh báo đỏ.
                        </p>
                        <div className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
                          Nâng cấp ngay
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* ================= TAB 2: THÔNG BÁO ================= */}
              {activeTab === 'notifications' && (
                <div className="flex-1 flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-white">Cấu hình Thông báo</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Toggle Cảnh báo khủng hoảng */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div>
                        <div className="text-sm font-medium text-white mb-1 flex items-center gap-2">
                          Cảnh báo khủng hoảng tức thời
                          {!isVip && (
                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] uppercase font-bold rounded">
                              VIP
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isVip) {
                            setIsUpgradeModalOpen(true);
                            return;
                          }
                          setAlertEmail((prev) => !prev);
                        }}
                        className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors relative focus:outline-none ${
                          !isVip
                            ? 'bg-slate-700 opacity-50 cursor-not-allowed'
                            : alertEmail
                              ? 'bg-indigo-500'
                              : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                            alertEmail && isVip ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle Báo cáo tuần */}
                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <div>
                        <div className="text-sm font-medium text-white mb-1">Báo cáo tóm tắt hàng tuần</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeeklyReport((prev) => !prev)}
                        className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors relative focus:outline-none ${
                          weeklyReport ? 'bg-indigo-500' : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                            weeklyReport ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 3: BILLING ================= */}
              {activeTab === 'billing' && (
                <div className="flex-1 flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-white">Gói & Thanh toán</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Trạng thái hiện tại: {isVip ? 'Tài khoản VIP' : 'Tài khoản Free'}.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300">
                        <Crown className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Gói Pro VIP</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Mở khóa từ điển AI, cảnh báo khủng hoảng, lưu dữ liệu dài ngày và các tính năng nâng cao.
                        </p>
                        {!isVip && (
                          <button
                            type="button"
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
                          >
                            Nâng cấp ngay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TAB 4: DATA RETENTION ================= */}
              {activeTab === 'data' && (
                <div className="flex-1 flex flex-col">
                  <div className="mb-8">
                    <h2 className="text-lg font-semibold text-white">Quản lý Dữ liệu</h2>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Thời gian tự động xóa dữ liệu cũ
                      </label>
                      <select
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                        className="w-full max-w-sm bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl py-3 px-4 focus:outline-none cursor-pointer"
                      >
                        <option value={7}>7 ngày (Gói Free)</option>
                        <option value={30} disabled={!isVip}>
                          30 ngày (VIP)
                        </option>
                        <option value={90} disabled={!isVip}>
                          90 ngày (VIP)
                        </option>
                        <option value={9999} disabled={!isVip}>
                          Lưu trữ vĩnh viễn (VIP)
                        </option>
                      </select>

                      {!isVip && (
                        <p className="mt-2 text-xs text-slate-500">
                          Gói Free chỉ được lưu dữ liệu tối đa 7 ngày. Nâng cấp VIP để chọn 30/90 ngày.
                        </p>
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-700/50">
                      <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-2">
                        <AlertTriangle size={16} /> Khu vực nguy hiểm
                      </h3>
                      <button
                        type="button"
                        onClick={handleOpenClearConfirm}
                        disabled={isClearing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} /> {isClearing ? 'Đang xóa...' : 'Xóa toàn bộ dữ liệu'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* NÚT LƯU CẤU HÌNH GỌI HÀM PUT */}
              {(activeTab === 'ai' || activeTab === 'notifications' || activeTab === 'data') && (
                <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSaving || !userId}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-slate-900 shadow-2xl shadow-rose-950/40">
            <div className="relative p-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-orange-400" />

              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/25">
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">Xóa toàn bộ dữ liệu?</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Thao tác này sẽ xóa toàn bộ dữ liệu phân tích và phản hồi của bạn. Dữ liệu đã xóa sẽ không thể khôi phục.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <p className="text-sm font-medium text-rose-200">
                  Hãy chắc chắn bạn đã sao lưu dữ liệu cần thiết trước khi tiếp tục.
                </p>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsClearConfirmOpen(false)}
                  disabled={isClearing}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleConfirmClearAllData}
                  disabled={isClearing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {isClearing ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </>
  );
}
