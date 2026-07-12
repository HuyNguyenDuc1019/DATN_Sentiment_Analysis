import { BarChart3, BrainCircuit, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: MessageSquareText, label: 'Thu thập phản hồi' },
  { icon: BrainCircuit, label: 'Phân tích cảm xúc bằng AI' },
  { icon: BarChart3, label: 'Báo cáo và hỗ trợ quyết định' },
];

export default function AuthPageShell({ children, eyebrow, title, description }) {
  return (
    <main className="auth-blue-shell relative min-h-screen overflow-y-auto bg-[#031b4e] px-4 py-6 font-sans text-white sm:px-6 lg:grid lg:place-items-center lg:py-6 xl:py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.48),transparent_45%),linear-gradient(135deg,#03183f_0%,#075bb8_52%,#03183f_100%)]">
        <div className="absolute -left-20 top-8 h-80 w-80 rounded-[45%] border-[34px] border-blue-500/25 blur-[1px] rotate-[-24deg]" />
        <div className="absolute -right-16 -top-20 h-96 w-96 rounded-[42%] border-[38px] border-cyan-400/20 rotate-[28deg]" />
        <div className="absolute -bottom-28 left-[8%] h-72 w-72 rounded-full border-[30px] border-indigo-400/20" />
        <div className="absolute -bottom-28 right-[4%] h-80 w-80 rounded-[42%] border-[36px] border-blue-400/25 rotate-[24deg]" />
      </div>

      <div className="auth-panel relative mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-cyan-200/35 bg-[#062456]/75 shadow-[0_30px_100px_rgba(0,14,48,0.55)] backdrop-blur-2xl lg:grid-cols-2">
        <section className="auth-form-pane flex items-center justify-center border-b border-cyan-100/15 p-5 sm:p-8 lg:border-b-0 lg:border-r lg:p-10 xl:p-14">
          {children}
        </section>

        <section className="auth-info-pane relative flex flex-col justify-center overflow-hidden p-7 sm:p-10 lg:p-12 xl:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="auth-info-inner relative z-10">
            <div className="auth-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-200">
              <Sparkles className="h-4 w-4" />
              {eyebrow}
            </div>
            <h2 className="auth-title max-w-xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl xl:text-5xl">
              {title}
            </h2>
            <p className="auth-description mt-5 max-w-xl text-sm leading-7 text-blue-100/75 sm:text-base">
              {description}
            </p>

            <div className="auth-feature-list mt-8 space-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="auth-feature-card flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3.5 backdrop-blur-xl">
                  <div className="auth-feature-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400/30 to-indigo-500/30 text-cyan-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-white/90">{label}</span>
                </div>
              ))}
            </div>

            <div className="auth-flow mt-8 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 rounded-2xl border border-white/10 bg-[#03183f]/35 p-4">
              <FlowNode icon={MessageSquareText} label="Phản hồi" />
              <span className="text-cyan-300">→</span>
              <FlowNode icon={BrainCircuit} label="AI" accent />
              <span className="text-cyan-300">→</span>
              <div className="space-y-2 text-[11px] font-semibold">
                <div className="rounded-lg bg-emerald-400/15 px-2 py-1.5 text-center text-emerald-200">Hài lòng</div>
                <div className="rounded-lg bg-rose-400/15 px-2 py-1.5 text-center text-rose-200">Chưa hài lòng</div>
              </div>
            </div>

            <div className="auth-security mt-6 flex items-center gap-2 text-xs text-blue-200/65">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Dữ liệu được bảo vệ và đồng bộ an toàn
            </div>
          </div>
        </section>
      </div>
      <style>{`
        html.light .auth-blue-shell,
        html.light .auth-blue-shell section { color: #f8fafc !important; }
        html.light .auth-blue-shell [class*="text-white"] { color: #ffffff !important; }
        html.light .auth-blue-shell [class*="text-slate-300"] { color: #cbd5e1 !important; }
        html.light .auth-blue-shell [class*="text-slate-400"] { color: #94a3b8 !important; }
        html.light .auth-blue-shell [class*="text-slate-500"] { color: #64748b !important; }
        html.light .auth-blue-shell input {
          background: rgba(2, 20, 58, 0.62) !important;
          border-color: rgba(125, 211, 252, 0.28) !important;
          color: #f8fafc !important;
          box-shadow: none !important;
        }
        html.light .auth-blue-shell input::placeholder { color: #64748b !important; }

        @media (min-width: 1024px) {
          .auth-blue-shell { height: 100dvh; min-height: 0; }
          .auth-panel { min-height: min(720px, calc(100dvh - 3rem)); }
        }

        @media (min-width: 1024px) and (max-height: 820px) {
          .auth-blue-shell { padding: 12px 20px !important; }
          .auth-panel { min-height: calc(100dvh - 24px); }
          .auth-form-pane { padding: 18px 28px !important; }
          .auth-info-pane { padding: 22px 34px !important; }
          .auth-eyebrow { margin-bottom: 12px !important; padding-top: 6px; padding-bottom: 6px; }
          .auth-title { font-size: 2rem !important; line-height: 1.08 !important; }
          .auth-description { margin-top: 10px !important; line-height: 1.55 !important; }
          .auth-feature-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px !important; }
          .auth-feature-list > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }
          .auth-feature-card { padding: 8px 12px !important; border-radius: 12px !important; }
          .auth-feature-icon { width: 36px !important; height: 36px !important; }
          .auth-flow { margin-top: 14px !important; padding: 10px !important; }
          .auth-security { margin-top: 12px !important; }
          .auth-form-card { padding: 18px 22px !important; border-radius: 22px !important; }
          .auth-form-card form { gap: 12px !important; }
          .auth-form-card form > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }
        }

        @media (min-width: 1024px) and (max-height: 680px) {
          .auth-info-pane { padding-top: 16px !important; padding-bottom: 16px !important; }
          .auth-feature-list { display: grid; grid-template-columns: 1fr 1fr 1fr; }
          .auth-feature-card { flex-direction: column; align-items: flex-start; gap: 6px; }
          .auth-feature-card span { font-size: 11px; line-height: 1.3; }
          .auth-flow, .auth-security { display: none !important; }
        }
      `}</style>
    </main>
  );
}

function FlowNode({ icon: Icon, label, accent = false }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl border p-3 ${accent ? 'border-cyan-300/30 bg-blue-500/20 text-cyan-100' : 'border-white/10 bg-white/5 text-blue-100'}`}>
      <Icon className="h-6 w-6" />
      <span className="text-[11px] font-semibold">{label}</span>
    </div>
  );
}
