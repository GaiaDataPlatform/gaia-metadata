import { useState, useEffect } from "react";
import { getAllInstruments, createInstrument, updateInstrument, deleteInstrument,
         addOperation, updateOperation, deleteOperation } from "../api/instruments";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Btn from "../components/Btn";
import Spinner from "../components/Spinner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Zap } from "lucide-react";

function OperationsList({ category, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newOp, setNewOp] = useState({ name: "", display_name: "", sort_order: 0, is_final: false });

  const handleAdd = async () => {
    await addOperation(category.id, newOp);
    setShowAdd(false);
    setNewOp({ name: "", display_name: "", sort_order: 0, is_final: false });
    onRefresh();
  };

  return (
    <div className="space-y-1.5">
      {category.operations.map(op => (
        <div key={op.id} className="flex items-center gap-2 bg-navy-900 rounded-lg px-3 py-2">
          <span className="font-mono text-xs text-ocean-400">{op.sort_order}.</span>
          <span className="font-display text-xs text-ocean-200 flex-1">{op.display_name}</span>
          <span className="font-mono text-xs text-ocean-400/60">{op.name}</span>
          {op.is_final && <Zap size={11} className="text-ocean-300" title="Final operation" />}
          <button onClick={async () => { await deleteOperation(category.id, op.id); onRefresh(); }}
                  className="text-red-400/60 hover:text-red-400 transition-colors">
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      {showAdd ? (
        <div className="bg-navy-900 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={newOp.name}
                   onChange={e => setNewOp(p => ({ ...p, name: e.target.value }))}
                   className="bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-ocean-100 font-mono focus:outline-none focus:border-ocean-400" />
            <input value={newOp.display_name}
                   onChange={e => setNewOp(p => ({ ...p, display_name: e.target.value }))}
                   className="bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-ocean-100 focus:outline-none focus:border-ocean-400" />
          </div>
          <div className="flex items-center gap-3">
            <input type="number" value={newOp.sort_order}
                   onChange={e => setNewOp(p => ({ ...p, sort_order: parseInt(e.target.value) }))}
                   className="w-20 bg-navy-800 border border-navy-600 rounded px-2 py-1.5 text-xs text-ocean-100 font-mono focus:outline-none focus:border-ocean-400" />
            <label className="flex items-center gap-1.5 text-xs text-ocean-300 cursor-pointer">
              <input type="checkbox" checked={newOp.is_final}
                     onChange={e => setNewOp(p => ({ ...p, is_final: e.target.checked }))}
                     className="accent-ocean-400" />
              Final operation (closes the task)
            </label>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="primary" onClick={handleAdd} disabled={!newOp.name || !newOp.display_name}>
              Aggiungi
            </Btn>
            <Btn size="sm" onClick={() => setShowAdd(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
                className="w-full text-xs text-ocean-400 hover:text-ocean-200 text-left px-3 py-1.5 rounded-lg border border-dashed border-navy-600 hover:border-ocean-400 transition-colors">
          + Add operation
        </button>
      )}
    </div>
  );
}

export default function Instruments() {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", display_name: "", task_type: "point", color: "#0099CC", sort_order: 0 });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setInstruments(await getAllInstruments()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createInstrument({ ...form, sort_order: parseInt(form.sort_order) });
      setShowCreate(false);
      setForm({ name: "", display_name: "", task_type: "point", color: "#0099CC", sort_order: 0 });
      load();
    } finally { setCreating(false); }
  };

  const handleToggleActive = async (inst) => {
    await updateInstrument(inst.id, { is_active: !inst.is_active });
    load();
  };

  const handleDelete = async (inst) => {
    if (!confirm(`Delete instrument ${inst.name}? All associated tasks will also be deleted.`)) return;
    await deleteInstrument(inst.id);
    load();
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="Instruments & Categories"
          subtitle="Instrument configuration, operations and custom fields"
          actions={
            <Btn variant="primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} />New instrument
            </Btn>
          }
        />

        {loading ? <Spinner /> : (
          <div className="space-y-3">
            {instruments.map(inst => (
              <div key={inst.id} className={`bg-navy-800 border rounded-xl overflow-hidden transition-all
                ${inst.is_active ? "border-navy-600" : "border-navy-700 opacity-60"}`}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: inst.color }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-ocean-100">{inst.name}</span>
                      <span className="font-display text-ocean-300 text-sm">{inst.display_name}</span>
                      <Badge value={inst.task_type} />
                      {!inst.is_active && <Badge value="disabled" custom="Inactive" />}
                    </div>
                    <p className="text-xs text-ocean-400 font-mono mt-0.5">
                      {inst.operations.length} operations ·
                      {inst.extra_fields?.length > 0 ? ` ${inst.extra_fields.length} extra fields` : " no extra fields"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(inst)}
                      className={`text-xs px-2 py-1 rounded font-mono transition-all ${
                        inst.is_active
                          ? "text-emerald-400 hover:bg-emerald-400/10"
                          : "text-ocean-400 hover:bg-ocean-400/10"
                      }`}
                    >
                      {inst.is_active ? "Active" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(inst)}
                            className="p-1.5 text-red-400/60 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => setExpanded(p => ({ ...p, [inst.id]: !p[inst.id] }))}
                      className="p-1.5 text-ocean-400 hover:text-ocean-200 transition-colors"
                    >
                      {expanded[inst.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded operations */}
                {expanded[inst.id] && (
                  <div className="px-4 pb-4 border-t border-navy-700">
                    <p className="text-xs font-display text-ocean-400 mt-3 mb-2">Operations:</p>
                    <OperationsList category={inst} onRefresh={load} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New instrument">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display text-ocean-300 mb-1">Nome interno (es. CTD)</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                     className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 font-mono focus:outline-none focus:border-ocean-400" />
            </div>
            <div>
              <label className="block text-xs font-display text-ocean-300 mb-1">Nome visualizzato</label>
              <input value={form.display_name} onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                     className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-display text-ocean-300 mb-1">Tipo task</label>
              <select value={form.task_type} onChange={e => setForm(p => ({ ...p, task_type: e.target.value }))}
                      className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400">
                <option value="point">Puntuale</option>
                <option value="transect">Transetto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-display text-ocean-300 mb-1">Colore</label>
              <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                     className="w-full h-9 bg-navy-900 border border-navy-600 rounded-lg cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-display text-ocean-300 mb-1">Ordine</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
                     className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 font-mono focus:outline-none focus:border-ocean-400" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowCreate(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleCreate}
                 disabled={creating || !form.name || !form.display_name}>
              {creating ? "Creating..." : "Create instrument"}
            </Btn>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
