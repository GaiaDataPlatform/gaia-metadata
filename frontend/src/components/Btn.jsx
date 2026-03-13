const variants = {
  primary: "bg-ocean-400 hover:bg-ocean-300 text-navy-950 font-semibold",
  secondary: "bg-navy-700 hover:bg-navy-600 text-ocean-100 border border-navy-500",
  danger: "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30",
  ghost: "hover:bg-navy-700 text-ocean-300",
};

export default function Btn({ children, variant = "secondary", size = "md", className = "", ...props }) {
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : size === "lg" ? "px-5 py-3 text-sm" : "px-4 py-2 text-sm";
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sz} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
