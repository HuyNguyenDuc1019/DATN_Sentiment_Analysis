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

function readThemeMode() {
  if (typeof window === 'undefined') return true;

  const savedTheme = localStorage.getItem('almotion-theme');
  if (savedTheme === 'light') return false;
  if (savedTheme === 'dark') return true;

  return document.documentElement.classList.contains('dark');
}

export default function TopHeader() {
  const { fullName, avatarUrl, initials } = useUserProfile();
  const { batch, urlAnalyzer } = useTasks();
  const [keyword, setKeyword] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [darkMode, setDarkMode] = useState(readThemeMode);

  const batchCount = batch.results?.length || 0;
  const urlCount = urlAnalyzer.count || urlAnalyzer.results?.length || 0;
  const isWorking = batch.loading || urlAnalyzer.loading;

  useEffect(() => {
    const syncTheme = () => setDarkMode(readThemeMode());

    syncTheme();
    window.addEventListener('storage', syncTheme);
    window.addEventListener('almotion-theme-change', syncTheme);

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(syncTheme)
        : null;

    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener('storage', syncTheme);
      window.removeEventListener('almotion-theme-change', syncTheme);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  const activityItems = useMemo(() => {
    const items = [];

    if (urlAnalyzer.loading) {
      items.push({
        icon: Link2,
        title: 'Đang thu thập phản hồi từ đường dẫn',
        desc: 'Bạn có thể chuyển trang, hệ thống vẫn tiếp tục xử lý ngầm.',
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
        desc: 'Bạn có thể tiếp tục thao tác, kết quả sẽ xuất hiện trên Bảng điều khiển sau ít phút.',
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

  const headerTheme = darkMode
    ? 'bg-[#0b1220] border-slate-800/90 shadow-[0_1px_0_rgba(148,163,184,0.08)]'
    : 'bg-white/90 border-slate-200 shadow-sm shadow-slate-300/40 backdrop-blur-xl';

  const inputTheme = darkMode
    ? 'border-slate-700/70 bg-[#162033] text-slate-100 placeholder-slate-500 focus:border-indigo-400 focus:ring-indigo-400'
    : 'border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-400 focus:ring-indigo-400';

  const iconTheme = darkMode
    ? 'text-slate-400 hover:text-indigo-200'
    : 'text-slate-500 hover:text-indigo-600';

  return (
    <header className={`relative z-[120] h-20 flex-shrink-0 overflow-visible border-b flex items-center justify-between px-8 ${headerTheme}`}>
      <div className="relative w-[480px] max-w-[52vw]">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={handleSearch}
          placeholder="Tìm kiếm tài liệu, phân tích..."
          className={`w-full rounded-full border py-2.5 pl-11 pr-4 text-sm transition-all focus:outline-none focus:ring-1 ${inputTheme}`}
        />
      </div>

      <div className="flex items-center gap-5">
        <button
          type="button"
          title="Hoạt động gần đây"
          onClick={() => togglePanel('history')}
          className={`transition-colors ${iconTheme} ${activePanel === 'history' ? 'text-indigo-500' : ''}`}
        >
          <History className="h-5 w-5" />
        </button>

        <button
          type="button"
          title="Thông báo"
          onClick={() => togglePanel('notifications')}
          className={`relative transition-colors ${iconTheme} ${activePanel === 'notifications' ? 'text-indigo-500' : ''}`}
        >
          <Bell className="h-5 w-5" />
          {(isWorking || urlCount > 0 || batchCount > 0) && (
            <span className={`absolute right-0.5 top-0 h-2 w-2 rounded-full bg-indigo-500 ring-2 ${darkMode ? 'ring-[#0f172a]' : 'ring-white'}`} />
          )}
        </button>

        <Link
          to="/profile"
          title={`Mở hồ sơ của ${fullName}`}
          className={`relative ml-2 flex h-8 w-8 cursor-pointer items-center justify-center overflow-visible rounded-full border text-xs font-semibold transition-colors ${
            darkMode
              ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-indigo-400'
              : 'border-slate-300 bg-slate-100 text-slate-700 hover:border-indigo-500'
          }`}
        >
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
            {avatarUrl ? <img src={avatarUrl} alt={`Ảnh đại diện của ${fullName}`} className="h-full w-full object-cover" /> : initials}
          </span>
        </Link>
      </div>

      {activePanel === 'history' && (
        <HeaderPanel darkMode={darkMode} title="Hoạt động gần đây" onClose={() => setActivePanel(null)} items={activityItems} />
      )}

      {activePanel === 'notifications' && (
        <HeaderPanel darkMode={darkMode} title="Thông báo hệ thống" onClose={() => setActivePanel(null)} items={notifications} />
      )}
    </header>
  );
}

function HeaderPanel({ title, items, onClose, darkMode }) {
  const panelTheme = darkMode
    ? 'border-slate-700/80 bg-[#111827]/98 text-slate-100 shadow-black/45'
    : 'border-slate-200 bg-white text-slate-900 shadow-slate-400/25';

  const dividerTheme = darkMode ? 'border-slate-700/80' : 'border-slate-200';
  const descTheme = darkMode ? 'text-slate-400' : 'text-slate-500';
  const closeTheme = darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <div
      className={`fixed right-6 top-24 z-[9999] w-[min(380px,calc(100vw-32px))] rounded-2xl border shadow-2xl backdrop-blur-xl ${panelTheme}`}
    >
      <div className={`flex items-start justify-between border-b px-5 py-4 ${dividerTheme}`}>
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className={`mt-1 text-xs leading-5 ${descTheme}`}>Theo dõi trạng thái xử lý và cập nhật mới nhất.</p>
        </div>
        <button type="button" onClick={onClose} className={`rounded-lg p-1 transition-colors ${closeTheme}`} title="Đóng">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[min(420px,calc(100vh-160px))] space-y-3 overflow-y-auto p-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const toneClass = getToneClass(item.tone, darkMode);

          return (
            <div key={`${item.title}-${index}`} className={`rounded-xl border p-4 ${toneClass.card}`}>
              <div className="flex gap-3">
                <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${toneClass.icon}`} />
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.title}</p>
                  <p className={`mt-1 text-xs leading-5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getToneClass(tone, darkMode) {
  const tones = {
    info: darkMode
      ? { card: 'border-indigo-500/30 bg-indigo-500/10', icon: 'text-indigo-300' }
      : { card: 'border-indigo-200 bg-indigo-50', icon: 'text-indigo-600' },
    success: darkMode
      ? { card: 'border-emerald-500/30 bg-emerald-500/10', icon: 'text-emerald-300' }
      : { card: 'border-emerald-200 bg-emerald-50', icon: 'text-emerald-600' },
    muted: darkMode
      ? { card: 'border-slate-700 bg-slate-900/60', icon: 'text-slate-300' }
      : { card: 'border-slate-200 bg-slate-50', icon: 'text-slate-600' },
  };

  return tones[tone] || tones.muted;
}
