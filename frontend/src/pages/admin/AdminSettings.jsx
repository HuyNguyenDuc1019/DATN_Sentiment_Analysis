import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Sliders, HardDrive, BrainCircuit } from 'lucide-react';
import toast from 'react-hot-toast';
import { ADMIN_API_BASE, buildAdminUrl, getStoredAdminId } from './adminHelpers';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    ai_threshold: 0.75,
    max_upload_size_free: 5,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const adminId = getStoredAdminId();

        if (!adminId) {
          throw new Error('Không tìm thấy tài khoản quản trị đang đăng nhập.');
        }

        const res = await fetch(buildAdminUrl('/api/admin/settings', { admin_id: adminId }));

        if (!res.ok) throw new Error('Lỗi từ phía máy chủ.');

        const data = await res.json();

        if (data) {
          setSettings({
            ai_threshold: data.ai_threshold ?? 0.75,
            max_upload_size_free: data.max_upload_size_free ?? 5,
          });
        }
      } catch (error) {
        console.error('Lỗi tải settings:', error);
        toast.error('Không thể tải cấu hình hiện tại từ máy chủ.', {
          id: 'admin-settings-load-error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSettings((prev) => ({
      ...prev,
      [name]: parseFloat(value) || value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (settings.ai_threshold < 0 || settings.ai_threshold > 1) {
      toast.error('Ngưỡng tự tin phải nằm trong khoảng 0.0 - 1.0', {
        id: 'admin-settings-threshold-error',
      });
      return;
    }

    if (settings.max_upload_size_free < 1) {
      toast.error('Giới hạn dung lượng phải lớn hơn 0 MB', {
        id: 'admin-settings-size-error',
      });
      return;
    }

    try {
      setIsSaving(true);
      const adminId = getStoredAdminId();

      if (!adminId) {
        throw new Error('Không tìm thấy tài khoản quản trị đang đăng nhập.');
      }

      const res = await fetch(`${ADMIN_API_BASE}/api/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, admin_id: adminId }),
      });

      if (!res.ok) throw new Error('Lỗi cập nhật API');

      toast.success('Lưu cấu hình hệ thống thành công!', {
        id: 'admin-settings-save-success',
      });
    } catch (error) {
      console.error('Lỗi lưu settings:', error);
      toast.error('Có lỗi xảy ra khi lưu thay đổi lên máy chủ.', {
        id: 'admin-settings-save-error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Cài đặt lõi</h1>
        <p className="text-sm text-slate-400">Cấu hình tham số hệ thống và giới hạn tài nguyên của nền tảng.</p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-900/30 flex items-center gap-2">
          <Sliders className="text-indigo-400" size={18} />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Thông số hệ thống</h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="w-48 h-4 bg-slate-700/50 rounded animate-pulse" />
              <div className="w-full h-11 bg-slate-700/50 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="w-48 h-4 bg-slate-700/50 rounded animate-pulse" />
              <div className="w-full h-11 bg-slate-700/50 rounded-lg animate-pulse" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label htmlFor="ai_threshold" className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <BrainCircuit size={16} className="text-indigo-400" />
                  Ngưỡng tự tin hệ thống
                </label>
                <p className="text-xs text-slate-500">
                  Ngưỡng từ 0.00 - 1.00 để AI tự động đánh nhãn mà không cần duyệt.
                </p>
                <div className="relative">
                  <input
                    id="ai_threshold"
                    name="ai_threshold"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={settings.ai_threshold}
                    onChange={handleChange}
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono pointer-events-none">
                    FLOAT
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="max_upload_size_free" className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <HardDrive size={16} className="text-indigo-400" />
                  Giới hạn dung lượng tải lên miễn phí
                </label>
                <p className="text-xs text-slate-500">
                  Dung lượng tối đa cho mỗi file được upload bởi tài khoản Free.
                </p>
                <div className="relative">
                  <input
                    id="max_upload_size_free"
                    name="max_upload_size_free"
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={settings.max_upload_size_free}
                    onChange={handleChange}
                    className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono pointer-events-none">
                    MB
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-700/50 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Lưu cấu hình</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
