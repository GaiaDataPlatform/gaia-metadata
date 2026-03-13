import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCruises, createCruise, updateCruise, deleteCruise, activateCruise, completeCruise,
         importCruisesCSV, exportCruiseCSV, exportCruiseJSON } from "../api/cruises";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Btn from "../components/Btn";
import Spinner from "../components/Spinner";
import { Plus, Upload, Pencil, Trash2, Play, CheckCircle, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";

// Defined at module level — prevents React from unmounting/remounting on every render (focus-loss fix)
function Field({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-display font-medium text-ocean-300 mb-1">
        {label}{required && " *"}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400 font-mono"
      />
    </div>
  );
}

function CruiseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    code: "", name: "", start_date: "", end_date: "",
    port_departure: "", port_arrival: "", chief_scientist: "",
    chief_scientist_email: "", description: "", study_area: "",
    num_participants: "", participants: [],
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    const errs = {};
    if (!form.start_date) errs.start_date = true;
    if (!form.end_date) errs.end_date = true;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.num_participants) delete payload.num_participants;
      else payload.num_participants = parseInt(payload.num_participants);
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cruise code" value={form.code} onChange={set("code")} required />
        <Field label="Cruise name" value={form.name} onChange={set("name")} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Field label="Start date" value={form.start_date} onChange={set("start_date")} type="date" required />
          {errors.start_date && <p className="text-red-400 text-xs mt-0.5">Start date is required</p>}
        </div>
        <div>
          <Field label="End date" value={form.end_date} onChange={set("end_date")} type="date" required />
          {errors.end_date && <p className="text-red-400 text-xs mt-0.5">End date is required</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure port" value={form.port_departure} onChange={set("port_departure")} />
        <Field label="Arrival port" value={form.port_arrival} onChange={set("port_arrival")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Chief Scientist" value={form.chief_scientist} onChange={set("chief_scientist")} />
        <Field label="Chief Scientist email" value={form.chief_scientist_email} onChange={set("chief_scientist_email")} type="email" />
      </div>
      <div>
        <label className="block text-xs font-display font-medium text-ocean-300 mb-1">Study area</label>
        <input
          value={form.study_area || ""} onChange={e => set("study_area")(e.target.value)}
          className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400 font-mono"
        />
      </div>
      <div>
        <label className="block text-xs font-display font-medium text-ocean-300 mb-1">Description</label>
        <textarea
          rows={3} value={form.description || ""} onChange={e => set("description")(e.target.value)}
          className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400 font-mono"
        />
      </div>
      <Field label="Number of participants" value={form.num_participants} onChange={set("num_participants")} type="number" />

      <div className="flex justify-end gap-2 pt-2 border-t border-navy-600">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={saving || !form.code || !form.name}>
          {saving ? "Saving..." : "Save"}
        </Btn>
      </div>
    </div>
  );
}

export default function Cruises() {
  const { isCapo } = useAuth();
  const [cruises, setCruises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCruises(await getCruises()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (data) => { await createCruise(data); setShowCreate(false); load(); };
  const handleUpdate = async (data) => { await updateCruise(editing.id, data); setEditing(null); load(); };

  const handleDelete = async (cruise) => {
    if (!confirm(`Delete cruise ${cruise.code}?`)) return;
    await deleteCruise(cruise.id); load();
  };

  const handleActivate = async (cruise) => {
    if (!confirm(`Activate cruise ${cruise.code}?`)) return;
    await activateCruise(cruise.id); load();
  };

  const handleComplete = async (cruise) => {
    if (!confirm(`Complete cruise ${cruise.code}?`)) return;
    await completeCruise(cruise.id); load();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try { await importCruisesCSV(file); load(); }
    finally { setImporting(false); e.target.value = ""; }
  };

  const statusOrder = { active: 0, planned: 1, completed: 2 };
  const sorted = [...cruises].sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Oceanographic Cruises"
          subtitle="Cruise management and archive — R/V Gaia Blu"
          actions={isCapo && (
            <>
              <label className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-navy-700 hover:bg-navy-600 text-ocean-100
                border border-navy-500 rounded-lg cursor-pointer transition-all">
                <Upload size={14} />
                {importing ? "Importing..." : "Import CSV"}
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
              </label>
              <Btn variant="primary" onClick={() => setShowCreate(true)}>
                <Plus size={14} />New cruise
              </Btn>
            </>
          )}
        />

        {loading ? <Spinner /> : (
          <div className="space-y-2">
            {sorted.length === 0 && (
              <div className="text-center py-16 text-ocean-400/60">No cruises found</div>
            )}
            {sorted.map(cruise => (
              <div key={cruise.id}
                   className={`bg-navy-800 border rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all
                     ${cruise.status === "active" ? "border-emerald-500/40" : "border-navy-600"}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  cruise.status === "active" ? "bg-emerald-400 animate-pulse" :
                  cruise.status === "planned" ? "bg-yellow-400" : "bg-ocean-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-ocean-100">{cruise.code}</span>
                    <span className="font-display text-ocean-200 text-sm">{cruise.name}</span>
                    <Badge value={cruise.status} />
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-ocean-400 font-mono flex-wrap">
                    {cruise.chief_scientist && <span>{cruise.chief_scientist}</span>}
                    {cruise.start_date && (
                      <span>{format(new Date(cruise.start_date), "dd/MM/yyyy")}
                        {cruise.end_date && ` → ${format(new Date(cruise.end_date), "dd/MM/yyyy")}`}
                      </span>
                    )}
                    {cruise.port_departure && <span>{cruise.port_departure} → {cruise.port_arrival || "—"}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link to={`/cruises/${cruise.id}`}
                        className="p-1.5 text-ocean-400 hover:text-ocean-200 transition-colors" title="Details">
                    <ExternalLink size={14} />
                  </Link>
                  <button onClick={() => exportCruiseCSV(cruise.id)}
                          className="p-1.5 text-ocean-400 hover:text-ocean-200 transition-colors" title="Export CSV">
                    <Download size={14} />
                  </button>
                  {isCapo && (
                    <>
                      <button onClick={() => setEditing(cruise)}
                              className="p-1.5 text-ocean-400 hover:text-ocean-200 transition-colors">
                        <Pencil size={14} />
                      </button>
                      {cruise.status === "planned" && (
                        <button onClick={() => handleActivate(cruise)}
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors" title="Activate">
                          <Play size={14} />
                        </button>
                      )}
                      {cruise.status === "active" && (
                        <button onClick={() => handleComplete(cruise)}
                                className="p-1.5 text-ocean-400 hover:text-ocean-200 transition-colors" title="Complete">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {cruise.status !== "active" && (
                        <button onClick={() => handleDelete(cruise)}
                                className="p-1.5 text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New cruise" size="lg">
        <CruiseForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit ${editing?.code}`} size="lg">
        {editing && <CruiseForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}
      </Modal>
    </Layout>
  );
}
