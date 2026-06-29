import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  List,
  LogOut,
  MapPinned,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  ThumbsUp,
  UploadCloud,
  X,
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { fullName, avatarUrl, initials, role } = useUserProfile();
  const [helpOpen, setHelpOpen] = useState(false);

  const getLinkClass = (path) =>
    location.pathname === path
      ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium transition-colors'
      : 'flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors';

  const handleSignOut = () => {
    toast.success('Đã đăng xuất khỏi hệ thống.');
    signOut();
  };

  return (
    <>
      <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0f172a] border-r border-slate-800">
        <div className="flex items-center gap-3 px-6 py-8">
          <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
          <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <Link to="/dashboard" className={getLinkClass('/dashboard')}>
            <LayoutDashboard className="w-5 h-5" />Bảng điều khiển
          </Link>
          <Link to="/url-analyzer" className={getLinkClass('/url-analyzer')}>
            <LinkIcon className="w-5 h-5" />Trình phân tích URL
          </Link>
          <Link to="/batch-prediction" className={getLinkClass('/batch-prediction')}>
            <List className="w-5 h-5" />Dự đoán hàng loạt
          </Link>
          <Link to="/feedback" className={getLinkClass('/feedback')}>
            <MessageSquare className="w-5 h-5" />Trung tâm phản hồi
          </Link>
          <Link to="/report" className={getLinkClass('/report')}>
            <BarChart2 className="w-5 h-5" />Báo cáo
          </Link>
          <Link to="/settings" className={getLinkClass('/settings')}>
            <Settings className="w-5 h-5" />Cài đặt
          </Link>
        </nav>

        <div className="px-4 pb-4 space-y-1">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />Trợ giúp
          </button>
          <Link
            to="/"
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />Đăng xuất
          </Link>
        </div>

        <Link
          to="/profile"
          className="m-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-3 hover:border-indigo-500/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-white font-semibold">
            {avatarUrl ? <img src={avatarUrl} alt={`Ảnh đại diện của ${fullName}`} className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{fullName}</p>
            <p className="text-slate-500 text-xs">{role}</p>
          </div>
        </Link>
      </aside>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}

function HelpModal({ onClose }) {
  const [keyword, setKeyword] = useState('');
  const [activeTopic, setActiveTopic] = useState('quick');
  const [activeQuestion, setActiveQuestion] = useState('worth');

  const topics = [
    {
      id: 'quick',
      icon: Search,
      title: 'Bắt đầu kiểm tra quán',
      desc: 'Dán link hoặc tải file bình luận để xem quán được khen chê gì.',
    },
    {
      id: 'read',
      icon: LayoutDashboard,
      title: 'Cách đọc kết quả',
      desc: 'Hiểu tỷ lệ hài lòng, cảnh báo, xu hướng và từ khóa nổi bật.',
    },
    {
      id: 'decision',
      icon: ThumbsUp,
      title: 'Quyết định có nên đi',
      desc: 'Nhìn nhanh dấu hiệu nên thử hoặc nên cân nhắc trước khi đến.',
    },
    {
      id: 'problem',
      icon: AlertCircle,
      title: 'Khi kết quả bất thường',
      desc: 'Giải thích trường hợp không có dữ liệu hoặc phản hồi chưa cập nhật.',
    },
  ];

  const questions = [
    {
      id: 'worth',
      topic: 'decision',
      question: 'Làm sao biết quán này có đáng ăn không?',
      answer:
        'Bạn nên xem cùng lúc tỷ lệ hài lòng, các cảnh báo tiêu cực và từ khóa nổi bật. Nếu nhiều người khen món ăn, phục vụ, không gian và ít cảnh báo lặp lại thì quán đáng thử hơn.',
    },
    {
      id: 'link',
      topic: 'quick',
      question: 'Tôi kiểm tra một quán bằng link như thế nào?',
      answer:
        'Vào Trình phân tích URL, dán link quán Foody hoặc Shopee rồi bấm Thu thập. Sau khi hệ thống đọc bình luận xong, bạn xem kết quả ở Bảng điều khiển hoặc Báo cáo.',
    },
    {
      id: 'csv',
      topic: 'quick',
      question: 'Nếu tôi có file bình luận thì làm sao?',
      answer:
        'Vào Dự đoán hàng loạt, chọn file CSV có cột nội dung bình luận như content, comment, review hoặc bình luận. Hệ thống sẽ phân tích nhiều dòng cùng lúc.',
    },
    {
      id: 'satisfaction',
      topic: 'read',
      question: 'Tỷ lệ hài lòng nên hiểu như thế nào?',
      answer:
        'Tỷ lệ hài lòng là phần trăm bình luận có xu hướng tích cực. Tỷ lệ cao cho thấy nhiều khách có trải nghiệm tốt, nhưng bạn vẫn nên đọc cảnh báo để biết điểm yếu của quán.',
    },
    {
      id: 'warning',
      topic: 'read',
      question: 'Cảnh báo cần xử lý có ý nghĩa gì?',
      answer:
        'Đó là các bình luận có dấu hiệu khiến bạn nên cân nhắc, ví dụ chờ lâu, món không ngon, phục vụ chưa tốt, giá cao, vệ sinh hoặc không gian chưa ổn.',
    },
    {
      id: 'keywords',
      topic: 'read',
      question: 'Bản đồ từ khóa giúp gì cho tôi?',
      answer:
        'Từ khóa càng lớn nghĩa là càng được nhắc nhiều. Màu xanh là điểm được khen, màu đỏ là vấn đề bị chê. Nhìn phần này bạn biết khách nhớ nhất điều gì về quán.',
    },
    {
      id: 'zero',
      topic: 'problem',
      question: 'Vì sao phân tích URL trả về 0 phản hồi?',
      answer:
        'Có thể link đó đã được kiểm tra trước và chưa có bình luận mới, hoặc trang hiện không có bình luận phù hợp để thu thập. Bạn có thể thử link khác hoặc kiểm tra lại sau.',
    },
    {
      id: 'late',
      topic: 'problem',
      question: 'Vì sao Bảng điều khiển chưa cập nhật ngay?',
      answer:
        'Một số tác vụ chạy ngầm nên kết quả có thể cập nhật chậm vài phút. Bạn có thể bấm làm mới dữ liệu ở Dashboard hoặc Báo cáo.',
    },
  ];

  const quickLinks = [
    { to: '/url-analyzer', label: 'Kiểm tra bằng link quán', desc: 'Dán đường dẫn để thu thập bình luận.' },
    { to: '/batch-prediction', label: 'Kiểm tra bằng file CSV', desc: 'Tải file bình luận để phân tích hàng loạt.' },
    { to: '/dashboard', label: 'Xem kết luận nhanh', desc: 'Xem tỷ lệ hài lòng và cảnh báo.' },
    { to: '/report', label: 'Xem báo cáo chi tiết', desc: 'Xem biểu đồ và bản đồ từ khóa.' },
  ];

  const filteredQuestions = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    const byTopic = questions.filter((item) => item.topic === activeTopic || activeTopic === 'quick');
    if (!value) return byTopic;
    return questions.filter(
      (item) =>
        item.question.toLowerCase().includes(value) ||
        item.answer.toLowerCase().includes(value)
    );
  }, [activeTopic, keyword, questions]);

  const selected = questions.find((item) => item.id === activeQuestion) || filteredQuestions[0] || questions[0];

  const chooseTopic = (topicId) => {
    setActiveTopic(topicId);
    const first = questions.find((item) => item.topic === topicId);
    if (first) setActiveQuestion(first.id);
  };

  return (
    <div className="help-modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 py-4 backdrop-blur-sm">
      <div className="help-modal-shell flex h-[calc(100dvh-48px)] max-h-[860px] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl shadow-black/40">
        <div className="help-modal-head flex-shrink-0 border-b border-slate-800 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="help-modal-kicker text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Trung tâm trợ giúp</p>
              <h2 className="help-modal-title mt-2 text-2xl font-bold text-white">Almotion có thể giúp gì cho bạn?</h2>
              <p className="help-modal-subtitle mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Tìm nhanh cách đọc bình luận để biết một quán ăn có đáng thử, nên cân nhắc điểm nào và nên xem kết quả ở đâu.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="help-modal-close rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-5 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm câu hỏi, ví dụ: tỷ lệ hài lòng, cảnh báo, CSV..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="help-modal-body min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-28">
          <div className="grid gap-4 md:grid-cols-4">
            {topics.map((topic) => {
              const Icon = topic.icon;
              const active = topic.id === activeTopic;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => chooseTopic(topic.id)}
                  className={`help-topic-card rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-indigo-500 bg-indigo-500/15'
                      : 'border-slate-700 bg-slate-900/50 hover:border-indigo-400/70'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="help-modal-card-title mt-3 text-sm font-semibold text-white">{topic.title}</p>
                  <p className="help-modal-card-desc mt-1 text-xs leading-5 text-slate-400">{topic.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <section className="help-modal-section rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="help-modal-section-title font-semibold text-white">Câu hỏi phổ biến</h3>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  {filteredQuestions.length} mục
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {filteredQuestions.length ? (
                  filteredQuestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveQuestion(item.id)}
                      className={`help-question-row flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                        item.id === selected.id
                          ? 'border-indigo-500 bg-indigo-500/15'
                          : 'border-slate-700 bg-slate-950/40 hover:border-indigo-400/70'
                      }`}
                    >
                      <span className="help-modal-card-title text-sm font-medium text-white">{item.question}</span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-500" />
                    </button>
                  ))
                ) : (
                  <div className="help-modal-card rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                    <p className="help-modal-card-title text-sm font-semibold text-white">Không tìm thấy câu hỏi phù hợp</p>
                    <p className="help-modal-card-desc mt-1 text-xs leading-5 text-slate-400">
                      Hãy thử tìm bằng từ khóa khác như quán, cảnh báo, tỷ lệ hài lòng hoặc báo cáo.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="help-modal-section rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h3 className="help-modal-section-title font-semibold text-white">{selected.question}</h3>
              </div>
              <p className="help-modal-card-desc mt-4 text-sm leading-7 text-slate-300">{selected.answer}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <HelpPoint
                  icon={ThumbsUp}
                  title="Dấu hiệu nên thử"
                  desc="Nhiều bình luận khen món ăn, phục vụ, không gian và tỷ lệ hài lòng cao."
                />
                <HelpPoint
                  icon={AlertCircle}
                  title="Dấu hiệu nên cân nhắc"
                  desc="Nhiều bình luận lặp lại vấn đề như chờ lâu, món không ngon, giá cao hoặc phục vụ kém."
                />
                <HelpPoint
                  icon={MapPinned}
                  title="Xem từ khóa"
                  desc="Từ khóa lớn cho biết điều khách nhắc nhiều nhất về quán."
                />
                <HelpPoint
                  icon={BarChart2}
                  title="Xem xu hướng"
                  desc="Xu hướng giúp biết phản hồi gần đây đang tốt lên hay xấu đi."
                />
              </div>
            </section>
          </div>

          <section className="help-modal-section mt-5 rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-300" />
              <h3 className="help-modal-section-title text-sm font-semibold text-white">Đi nhanh đến chức năng</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className="help-modal-card rounded-xl border border-slate-700 bg-slate-950/40 p-4 hover:border-indigo-500/60 hover:bg-slate-800/70 transition-colors"
                >
                  <p className="help-modal-card-title text-sm font-semibold text-white">{item.label}</p>
                  <p className="help-modal-card-desc mt-1 text-xs leading-5 text-slate-400">{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function HelpPoint({ icon: Icon, title, desc }) {
  return (
    <div className="help-modal-card rounded-xl border border-slate-700 bg-slate-950/40 p-4">
      <div className="flex gap-3">
        <div className="help-modal-icon flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="help-modal-card-title text-sm font-semibold text-white">{title}</p>
          <p className="help-modal-card-desc mt-1 text-xs leading-5 text-slate-400">{desc}</p>
        </div>
      </div>
    </div>
  );
}
