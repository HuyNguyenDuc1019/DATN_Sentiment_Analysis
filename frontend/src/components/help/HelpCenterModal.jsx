import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Crown,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  X,
} from 'lucide-react';

import { helpQuestions, helpQuickLinks, helpTopics } from './helpCenterData';

const iconMap = {
  alert: AlertCircle,
  crown: Crown,
  dashboard: LayoutDashboard,
  search: Search,
  shield: ShieldCheck,
  thumbsUp: ThumbsUp,
};

export default function HelpCenterModal({ onClose }) {
  const [view, setView] = useState('topics');
  const [keyword, setKeyword] = useState('');
  const [activeTopic, setActiveTopic] = useState(helpTopics?.[0]?.id || 'start');
  const [activeQuestion, setActiveQuestion] = useState('');

  const topic = helpTopics.find((item) => item.id === activeTopic) || helpTopics[0];
  const selected = helpQuestions.find((item) => item.id === activeQuestion);

  const visibleQuestions = useMemo(() => {
    const value = keyword.trim().toLowerCase();

    if (value) {
      return helpQuestions.filter((item) =>
        [item.question, item.summary, item.tip, ...(item.steps || [])]
          .join(' ')
          .toLowerCase()
          .includes(value),
      );
    }

    return helpQuestions.filter((item) => item.topic === activeTopic);
  }, [activeTopic, keyword]);

  const openTopic = (topicId) => {
    setActiveTopic(topicId);
    setActiveQuestion('');
    setKeyword('');
    setView('questions');
  };

  const openQuestion = (questionId) => {
    setActiveQuestion(questionId);
    setView('answer');
  };

  const handleSearch = (value) => {
    setKeyword(value);
    setActiveQuestion('');
    if (value.trim()) setView('questions');
  };

  const goBack = () => {
    if (view === 'answer') {
      setView('questions');
      return;
    }

    setKeyword('');
    setView('topics');
  };

  const pageTitle =
    view === 'topics'
      ? 'Bạn cần hỗ trợ nội dung nào?'
      : view === 'questions'
        ? keyword.trim()
          ? 'Kết quả tìm kiếm'
          : topic?.title
        : selected?.question;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-4">
      <div className="flex h-[min(780px,calc(100dvh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-700/80 bg-[#080f20] shadow-2xl shadow-black/50 sm:h-[min(780px,calc(100dvh-32px))]">
        <header className="shrink-0 border-b border-slate-800 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {view !== 'topics' && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="Quay lại"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Trung tâm trợ giúp
                </div>
                <h2 className="mt-1 truncate text-xl font-extrabold text-white sm:text-2xl">{pageTitle}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:w-[340px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={keyword}
                  onChange={(event) => handleSearch(event.target.value)}
                  placeholder="Tìm CSV, VIP, cảnh báo..."
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/70 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Đóng trung tâm trợ giúp"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {view === 'topics' && <TopicPage onOpen={openTopic} />}

          {view === 'questions' && (
            <QuestionPage
              topic={topic}
              questions={visibleQuestions}
              searching={Boolean(keyword.trim())}
              onOpen={openQuestion}
            />
          )}

          {view === 'answer' && selected && <AnswerPage question={selected} />}
        </main>

        <footer className="shrink-0 border-t border-slate-800 bg-slate-900/40 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="mr-1 shrink-0 text-xs font-bold text-slate-500">Đi nhanh:</span>
            {helpQuickLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-indigo-400/60 hover:text-white"
              >
                {item.label}
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-indigo-300" />
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

function TopicPage({ onOpen }) {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-white">Chọn một chức năng lớn</h3>
        <p className="mt-1 text-sm text-slate-400">Mỗi mục chứa các câu hỏi và hướng dẫn liên quan.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {helpTopics.map((item, index) => {
          const Icon = iconMap[item.icon] || HelpCircle;
          const count = helpQuestions.filter((question) => question.topic === item.id).length;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className={`group min-h-[180px] rounded-3xl border p-5 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl ${
                index === 0
                  ? 'border-indigo-400/60 bg-gradient-to-br from-indigo-500/25 to-violet-500/10 shadow-indigo-950/30'
                  : 'border-slate-700 bg-slate-900/55 hover:border-indigo-400/50 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 transition group-hover:bg-indigo-500 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-slate-700/80 bg-slate-950/50 px-2.5 py-1 text-xs font-bold text-slate-400">{count} câu hỏi</span>
              </div>
              <h4 className="mt-5 text-lg font-extrabold text-white">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.desc}</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-indigo-300">
                Xem câu hỏi <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionPage({ topic, questions, searching, onOpen }) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-white">{searching ? 'Các câu hỏi phù hợp' : `Câu hỏi về ${topic?.title}`}</h3>
        <p className="mt-1 text-sm text-slate-400">Nhấn vào câu hỏi để mở trang hướng dẫn chi tiết.</p>
      </div>

      {questions.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {questions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className="group flex min-h-[130px] items-start gap-4 rounded-2xl border border-slate-700 bg-slate-900/50 p-4 text-left transition hover:border-indigo-400/60 hover:bg-indigo-500/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition group-hover:bg-indigo-500 group-hover:text-white">
                <HelpCircle className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold leading-5 text-white">{item.question}</span>
                <span className="mt-2 line-clamp-2 block text-xs leading-5 text-slate-400">{item.summary}</span>
              </span>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center">
          <HelpCircle className="mx-auto h-8 w-8 text-slate-600" />
          <p className="mt-3 font-bold text-white">Không tìm thấy câu hỏi</p>
          <p className="mt-1 text-sm text-slate-500">Hãy thử từ khóa khác hoặc quay lại chọn danh mục.</p>
        </div>
      )}
    </div>
  );
}

function AnswerPage({ question }) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Trang hướng dẫn</p>
          <h3 className="mt-1 text-xl font-extrabold leading-tight text-white sm:text-2xl">{question.question}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{question.summary}</p>
        </div>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/50 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-300" />
          <h4 className="text-sm font-extrabold text-white">Các bước thực hiện</h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(question.steps || []).map((step, index) => (
            <div key={step} className="flex gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-extrabold text-white">{index + 1}</span>
              <p className="pt-1 text-sm leading-6 text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {question.tip && (
        <section className="mt-4 flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <h4 className="text-sm font-extrabold text-amber-200">Ghi chú</h4>
            <p className="mt-1 text-sm leading-6 text-amber-100/90">{question.tip}</p>
          </div>
        </section>
      )}
    </div>
  );
}
