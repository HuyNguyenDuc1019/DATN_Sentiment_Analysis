export default function AuthSubmitButton({
  loading,
  loadingText = 'Đang xử lý...',
  className = 'mt-4',
  children,
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-bold text-white shadow-xl shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${className}`}
    >
      {loading ? loadingText : children}
    </button>
  );
}
