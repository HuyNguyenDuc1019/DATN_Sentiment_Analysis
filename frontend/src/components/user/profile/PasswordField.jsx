export default function PasswordField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-2">{label}</label>
      <input
        type="password"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full bg-white border border-transparent rounded-lg py-2 px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      />
    </div>
  );
}
