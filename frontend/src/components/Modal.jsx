import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${sizes[size]} bg-navy-800 border border-navy-600 rounded-xl shadow-2xl fade-slide-in`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-600">
          <h2 className="font-display font-semibold text-ocean-100">{title}</h2>
          <button onClick={onClose} className="text-ocean-400 hover:text-ocean-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
