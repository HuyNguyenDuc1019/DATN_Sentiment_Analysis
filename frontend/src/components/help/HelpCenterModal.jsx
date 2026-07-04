import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Search,
  ThumbsUp,
  X,
} from 'lucide-react';
import { helpQuestions, helpQuickLinks, helpTopics } from './helpCenterData';

const iconMap = {
  alert: AlertCircle,
  dashboard: LayoutDashboard,
  search: Search,
  thumbsUp: ThumbsUp,
};

export default function HelpCenterModal({ onClose }) {
  const [keyword, setKeyword] = useState('');
  const [activeTopic, setActiveTopic] = useState('quick');
  const [activeQuestion, setActiveQuestion] = useState('link');

  const filteredQuestions = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    const questionsByTopic = helpQuestions.filter((item) => item.topic === activeTopic || activeTopic === 'quick');

    if (!value) return questionsByTopic;

    return helpQuestions.filter(
      (item) =>
        item.question.toLowerCase().includes(value) ||
        item.answer.toLowerCase().includes(value)
    );
  }, [activeTopic, keyword]);

  const selected =
    helpQuestions.find((item) => item.id === activeQuestion) ||
    filteredQuestions[0] ||
    helpQuestions[0];

  const chooseTopic = (topicId) => {
    setActiveTopic(topicId);
    const firstQuestion = helpQuestions.find((item) => item.topic === topicId);
    if (firstQuestion) setActiveQuestion(firstQuestion.id);
  };

  return (
    <div className="help-modal-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm">
      <div className="help-modal-shell flex h-[min(860px,calc(100dvh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#111827] shadow-2xl shadow-black/40 sm:h-[min(860px,calc(100dvh-32px))]">
        <div className="help-modal-head flex-shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="help-modal-kicker text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Trung tâm trợ giúp</p>
              <h2 className="help-modal-title mt-2 text-xl font-bold text-white sm:text-2xl">Almotion có thể giúp gì cho bạn?</h2>
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

          <div className="relative mt-4 max-w-2xl sm:mt-5">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm câu hỏi, ví dụ: tỷ lệ hài lòng, cảnh báo, CSV..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950/50 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="help-modal-body min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {helpTopics.map((topic) => {
              const Icon = iconMap[topic.icon] || HelpCircle;
              const active = topic.id === activeTopic;

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => chooseTopic(topic.id)}
                  className={`help-topic-card rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'help-topic-card-active border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-400/40'
                      : 'border-slate-700 bg-slate-900/50 hover:border-indigo-400/70'
                  }`}
                >
                  <div
                    className={`help-topic-icon flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      active
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-indigo-500/15 text-indigo-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="help-modal-card-title mt-3 text-sm font-semibold text-white">{topic.title}</p>
                  <p className="help-modal-card-desc mt-1 text-xs leading-5 text-slate-400">{topic.desc}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="help-modal-section rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="help-modal-section-title font-semibold text-white">Câu hỏi phổ biến</h3>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  {filteredQuestions.length} mục
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {filteredQuestions.length ? (
                  filteredQuestions.map((item) => {
                    const isActiveQuestion = item.id === selected.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveQuestion(item.id)}
                        className={`help-question-row flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                          isActiveQuestion
                            ? 'help-question-row-active border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-950/20 ring-1 ring-indigo-400/40'
                            : 'border-slate-700 bg-slate-950/40 hover:border-indigo-400/70'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span
                            className={`help-question-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition ${
                              isActiveQuestion
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isActiveQuestion ? <CheckCircle2 className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                          </span>
                          <span className="help-modal-card-title min-w-0 text-sm font-medium text-white">{item.question}</span>
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 flex-shrink-0 transition ${
                            isActiveQuestion ? 'text-indigo-200' : 'text-slate-500'
                          }`}
                        />
                      </button>
                    );
                  })
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
              <p className="help-modal-card-desc mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">{selected.answer}</p>
            </section>
          </div>

          <section className="help-modal-section mt-5 rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-300" />
              <h3 className="help-modal-section-title text-sm font-semibold text-white">Đi nhanh đến chức năng</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {helpQuickLinks.map((item) => (
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
