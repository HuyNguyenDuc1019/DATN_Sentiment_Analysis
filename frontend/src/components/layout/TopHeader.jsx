import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Link2,
  Search,
  X,
} from 'lucide-react';
import { useTasks } from '../../contexts/TaskContext';
import { useUserProfile } from '../../hooks/useUserProfile';

export default function TopHeader() {
  const { fullName, avatarUrl, initials } = useUserProfile();
  const { batch, urlAnalyzer } = useTasks();
  const [keyword, setKeyword] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [darkMode] = useState(() => localStorage.getItem('almotion-theme') !== 'light');

  const batchCount = batch.results?.length || 0;
  const urlCount = urlAnalyzer.count || urlAnalyzer.results?.length || 0;
  const isWorking = batch.loading || urlAnalyzer.loading;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
    localStorage.setItem('almotion-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const activityItems = useMemo(() => {
    const items = [];

    if (urlAnalyzer.loading) {
      items.push({
        icon: Link2,
        title: 'Đang thu thập phản hồi từ đường dẫn',
        desc: 'Bạn có thể chuyển trang, hệ thống vẫn xử lý ngầm.',
        tone: 'info',
      });
    }

    if (batch.loading) {
      items.push({
        icon: FileText,
        title: 'Đang xử lý file phản hồi',
        desc: 'Kết quả sẽ được cập nhật sau khi hệ thống hoàn tất.',
        tone: 'info',
      });
    }

    if (urlCount > 0) {
      items.push({
        icon: CheckCircle2,
        title: `Đã tiếp nhận ${urlCount} phản hồi từ đường dẫn`,
        desc: 'Xem thống kê mới nhất tại trang Bảng điều khiển.',
        tone: 'success',
      });
    }

    if (batchCount > 0) {
      items.push({
        icon: CheckCircle2,
        title: `Đã xử lý ${batchCount} phản hồi từ file`,
        desc: 'Kết quả đã sẵn sàng để xem lại và đối chiếu.',
        tone: 'success',
      });
    }

    if (!items.length) {
      items.push({
        icon: Clock3,
        title: 'Chưa có hoạt động mới',
        desc: 'Khi bạn nhập file hoặc thu thập dữ liệu từ đường dẫn, lịch sử sẽ hiện tại đây.',
        tone: 'muted',
      });
    }

    return items.slice(0, 5);
  }, [batch.loading, batchCount, urlAnalyzer.loading, urlCount]);

  const notifications = useMemo(() => {
    const items = [];

    if (isWorking) {
      items.push({
        icon: Clock3,
        title: 'Hệ thống đang xử lý ngầm',
        desc: 'Bạn có thể tiếp tục thao tác, kết quả sẽ xuất hiện trên Dashboard sau ít phút.',
        tone: 'info',
      });
    }

    if (urlCount > 0) {
      items.push({
        icon: CheckCircle2,
        title: 'Dữ liệu đường dẫn đã được ghi nhận',
        desc: `${urlCount} phản hồi mới đã được gửi vào hệ thống.`,
        tone: 'success',
      });
    }

    if (batchCount > 0) {
      items.push({
        icon: FileText,
        title: 'File phản hồi đã được xử lý',
        desc: `${batchCount} phản hồi đã có kết quả ghi nhận.`,
        tone: 'success',
      });
    }

    if (!items.length) {
      items.push({
        icon: AlertCircle,
        title: 'Không có thông báo mới',
        desc: 'Các cảnh báo hoặc kết quả xử lý mới sẽ được hiển thị tại đây.',
        tone: 'muted',
      });
    }

    return items.slice(0, 5);
  }, [batchCount, isWorking, urlCount]);

  const handleSearch = (event) => {
    if (event.key !== 'Enter') return;
    const value = keyword.trim();
    if (!value) {
      toast('Nhập nội dung cần tìm rồi nhấn Enter.');
      return;
    }
    toast(`Đã ghi nhận từ khóa tìm kiếm: "${value}".`);
  };

  const togglePanel = (panel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  return (
    <header className="relative h-20 flex-shrink-0 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-8">
      <div className="relative w-[480px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={handleSearch}
          placeholder="Tìm kiếm tài liệu, phân tích..."
          className="w-full bg-[#1e293b] border-none text-sm text-slate-200 placeholder-slate-500 rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          title="Hoạt động gần đây"
          onClick={() => togglePanel('history')}
          className={`text-slate-400 hover:text-white transition-colors ${activePanel === 'history' ? 'text-indigo-300' : ''}`}
        >
          <History className="w-5 h-5" />
        </button>
        <button
          type="button"
          title="Thông báo"
          onClick={() => togglePanel('notifications')}
          className={`relative text-slate-400 hover:text-white transition-colors ${activePanel === 'notifications' ? 'text-indigo-300' : ''}`}
        >
          <Bell className="w-5 h-5" />
          {(isWorking || urlCount > 0 || batchCount > 0) && (
            <span className="absolute right-0.5 top-0 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-[#0f172a]" />
          )}
        </button>
        <Link
          to="/profile"
          title={`Mở hồ sơ của ${fullName}`}
          className="w-8 h-8 ml-2 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-slate-300 font-semibold text-xs cursor-pointer hover:border-indigo-400 transition-colors"
        >
          {avatarUrl ? <img src={avatarUrl} alt={`Ảnh đại diện của ${fullName}`} className="w-full h-full object-cover" /> : initials}
        </Link>
      </div>

      {activePanel === 'history' && (
        <HeaderPanel title="Hoạt động gần đây" onClose={() => setActivePanel(null)} items={activityItems} />
      )}

      {activePanel === 'notifications' && (
        <HeaderPanel title="Thông báo hệ thống" onClose={() => setActivePanel(null)} items={notifications} />
      )}
    </header>
  );
}

function HeaderPanel({ title, items, onClose }) {
  return (
    <div className="header-popover absolute right-8 top-[72px] z-50 w-[380px] rounded-2xl border border-slate-700 bg-[#111827]/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="header-popover-head flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h3 className="header-popover-title text-sm font-semibold text-white">{title}</h3>
          <p className="header-popover-desc mt-1 text-xs text-slate-400">Theo dõi trạng thái xử lý và cập nhật mới nhất.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="header-popover-close rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const toneClass = {
            info: 'header-popover-item-info border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
            success: 'header-popover-item-success border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
            muted: 'header-popover-item-muted border-slate-700 bg-slate-900/60 text-slate-300',
          }[item.tone || 'muted'];

          return (
            <div key={`${item.title}-${index}`} className={`header-popover-item rounded-xl border p-4 ${toneClass}`}>
              <div className="flex gap-3">
                <Icon className="header-popover-icon mt-0.5 h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="header-popover-item-title text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="header-popover-item-desc mt-1 text-xs leading-5 text-slate-400">{item.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
