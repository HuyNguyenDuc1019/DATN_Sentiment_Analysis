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
      className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60 ${className}`}
    >
      {loading ? loadingText : children}
    </button>
  );
}
