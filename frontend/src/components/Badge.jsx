const variants = {
  active:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  completed: "bg-ocean-500/20 text-ocean-300 border-ocean-500/30",
  aborted:   "bg-red-500/20 text-red-300 border-red-500/30",
  planned:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  admin:     "bg-purple-500/20 text-purple-300 border-purple-500/30",
  capo_missione: "bg-ocean-500/20 text-ocean-300 border-ocean-500/30",
  operatore: "bg-navy-600/50 text-ocean-100 border-navy-500",
};

const labels = {
  active: "Active", completed: "Completed", aborted: "Aborted", planned: "Planned",
  admin: "Admin", capo_missione: "Chief Scientist", operatore: "Operator",
  point: "Point", transect: "Transect",
};

export default function Badge({ value, custom }) {
  const cls = variants[value] || "bg-navy-700 text-ocean-100 border-navy-600";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${cls}`}>
      {custom || labels[value] || value}
    </span>
  );
}
