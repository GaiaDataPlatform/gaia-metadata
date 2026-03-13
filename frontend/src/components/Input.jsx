export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs font-medium text-ocean-300 font-display">{label}</label>}
      <input
        className={`w-full bg-navy-900 border rounded-lg px-3 py-2 text-sm text-ocean-100
          placeholder-ocean-400/50 focus:outline-none focus:border-ocean-400 transition-colors
          ${error ? "border-red-500" : "border-navy-600"} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
