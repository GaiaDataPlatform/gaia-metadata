import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getActiveCruise } from "../api/cruises";
import { getActiveTasks, getTasks, startTask, addOperation, abortTask } from "../api/tasks";
import { getInstruments } from "../api/instruments";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Btn from "../components/Btn";
import Spinner from "../components/Spinner";
import { formatDistanceToNow, format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Plus, Zap, XCircle, Clock, MapPin, ChevronDown, ChevronUp, Radio } from "lucide-react";

function CoordDisplay({ lat, lon }) {
  if (!lat && !lon) return <span className="text-ocean-400/60 font-mono text-xs">—</span>;
  const fmtCoord = (v, pos, neg) => {
    if (v == null) return "—";
    return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
  };
  return (
    <span className="font-mono text-xs text-ocean-300">
      {fmtCoord(lat, "N", "S")} {fmtCoord(lon, "E", "W")}
    </span>
  );
}

function DurationBadge({ startedAt }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt) return null;
  return (
    <span className="text-ocean-400 font-mono text-xs flex items-center gap-1">
      <Clock size={10} />
      {formatDistanceToNow(new Date(startedAt), { locale: enUS, addSuffix: false })}
    </span>
  );
}

function ExtraFieldsForm({ fields, values, onChange }) {
  if (!fields?.length) return null;
  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-navy-600">
      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-xs text-ocean-400 mb-0.5">
            {f.label}{f.required && " *"}{f.unit && ` (${f.unit})`}
          </label>
          {f.type === "textarea" ? (
            <textarea
              className="w-full bg-navy-900 border border-navy-600 rounded px-2 py-1.5 text-xs text-ocean-100 font-mono focus:outline-none focus:border-ocean-400"
              rows={2}
              value={values?.[f.name] || ""}
              onChange={e => onChange({ ...values, [f.name]: e.target.value })}
            />
          ) : (
            <input
              type={f.type === "number" ? "number" : "text"}
              step="any"
              className="w-full bg-navy-900 border border-navy-600 rounded px-2 py-1.5 text-xs text-ocean-100 font-mono focus:outline-none focus:border-ocean-400"
              value={values?.[f.name] || ""}
              onChange={e => onChange({ ...values, [f.name]: f.type === "number" ? parseFloat(e.target.value) || "" : e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function OperationButton({ op, taskId, onDone, loading, setLoading }) {
  const [extraData, setExtraData] = useState({});
  const [showFields, setShowFields] = useState(false);
  const hasFields = op.extra_fields?.length > 0;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addOperation(taskId, {
        operation_template_id: op.id,
        extra_data: Object.keys(extraData).length ? extraData : undefined
      });
      onDone();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-navy-600 overflow-hidden">
      <div className="flex items-center gap-2">
        <button
          onClick={hasFields && !showFields ? () => setShowFields(true) : handleSubmit}
          disabled={loading}
          className={`flex-1 flex items-center gap-2 px-3 py-2 text-xs font-display font-medium transition-all
            ${op.is_final
              ? "bg-ocean-400/20 hover:bg-ocean-400/30 text-ocean-200 border-r border-navy-600"
              : "bg-navy-700 hover:bg-navy-600 text-ocean-100"
            } disabled:opacity-50`}
        >
          {op.is_final && <Zap size={11} className="text-ocean-300" />}
          {op.display_name}
        </button>
        {hasFields && (
          <button onClick={() => setShowFields(s => !s)}
                  className="px-2 py-2 text-ocean-400 hover:text-ocean-200 transition-colors">
            {showFields ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>
      {showFields && (
        <div className="px-3 pb-3 bg-navy-800/50">
          <ExtraFieldsForm fields={op.extra_fields} values={extraData} onChange={setExtraData} />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-2 w-full bg-ocean-400/20 hover:bg-ocean-400/30 text-ocean-200 text-xs font-display font-medium px-3 py-1.5 rounded transition-all disabled:opacity-50"
          >
            Confirm {op.display_name}
          </button>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, onRefresh }) {
  const [expanded, setExpanded] = useState(true);
  const [aborting, setAborting] = useState(false);
  const [abortNotes, setAbortNotes] = useState("");
  const [showAbort, setShowAbort] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  const doneOpIds = new Set(task.operations.map(o => o.operation_template_id));
  const remainingOps = task.category.operations.filter(op => !doneOpIds.has(op.id));

  const colors = {
    active: "border-emerald-500/40 bg-emerald-500/5",
    completed: "border-ocean-500/30 bg-ocean-500/5",
    aborted: "border-red-500/30 bg-red-500/5",
  };

  const handleAbort = async () => {
    setAborting(true);
    try {
      await abortTask(task.id, abortNotes);
      setShowAbort(false);
      onRefresh();
    } finally {
      setAborting(false);
    }
  };

  return (
    <div className={`rounded-xl border ${colors[task.status]} transition-all fade-slide-in`}>
      <div className="flex items-start gap-3 p-4">
        <div
          className="w-3 h-3 rounded-full mt-1 shrink-0 ring-2 ring-offset-2 ring-offset-navy-800"
          style={{ backgroundColor: task.category.color,
                   boxShadow: task.status === "active" ? `0 0 8px ${task.category.color}60` : "none",
                   ringColor: task.category.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-sm text-ocean-100">
              {task.category.display_name}
            </span>
            <Badge value={task.status} />
            <Badge value={task.category.task_type} />
          </div>
          <div className="flex items-center gap-4 mt-1">
            <DurationBadge startedAt={task.started_at} />
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-ocean-400" />
              <CoordDisplay lat={task.lat_start} lon={task.lon_start} />
            </div>
          </div>
          {task.notes && (
            <p className="text-xs text-ocean-400/70 mt-1 italic">{task.notes}</p>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-ocean-400 hover:text-ocean-200 mt-0.5">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-navy-700/50 pt-3">
          {task.operations.length > 0 && (
            <div className="mb-3 space-y-1">
              {task.operations.map(op => (
                <div key={op.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-ocean-400 shrink-0" />
                  <span className="text-ocean-300 font-display">{op.operation_template?.display_name}</span>
                  <span className="text-ocean-400 font-mono ml-auto">
                    {format(new Date(op.event_time), "HH:mm:ss")}
                  </span>
                  {(op.lat || op.lon) && (
                    <CoordDisplay lat={op.lat} lon={op.lon} />
                  )}
                  {op.extra_data && Object.keys(op.extra_data).length > 0 && (
                    <span className="text-ocean-400/60 font-mono">
                      {Object.entries(op.extra_data).map(([k,v]) => `${k}=${v}`).join(" ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {task.status === "active" && remainingOps.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ocean-400/60 font-display mb-2">Available operations:</p>
              {remainingOps.map(op => (
                <OperationButton
                  key={op.id}
                  op={op}
                  taskId={task.id}
                  onDone={onRefresh}
                  loading={opLoading}
                  setLoading={setOpLoading}
                />
              ))}
            </div>
          )}

          {task.status === "active" && (
            <div className="mt-3 pt-3 border-t border-navy-700/50">
              {!showAbort ? (
                <button
                  onClick={() => setShowAbort(true)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <XCircle size={12} />
                  Abort task
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    className="w-full bg-navy-900 border border-red-500/30 rounded px-2 py-1.5 text-xs text-ocean-100 font-mono focus:outline-none"
                    value={abortNotes}
                    onChange={e => setAbortNotes(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAbort} disabled={aborting}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs px-3 py-1.5 rounded border border-red-500/30 transition-all"
                    >
                      Confirm abort
                    </button>
                    <button onClick={() => setShowAbort(false)}
                            className="text-xs text-ocean-400 hover:text-ocean-200 px-2">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cruise, setCruise] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ category_id: "", extra_data: {}, notes: "" });
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const c = await getActiveCruise().catch(() => null);
      setCruise(c);
      if (c) {
        const [active, all, inst] = await Promise.all([
          getActiveTasks(c.id),
          getTasks(c.id),
          getInstruments(),
        ]);
        setActiveTasks(active);
        setRecentTasks(all.filter(t => t.status !== "active").slice(0, 5));
        setInstruments(inst);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  const handleStartTask = async () => {
    if (!newTaskForm.category_id) return;
    setCreating(true);
    try {
      await startTask({
        cruise_id: cruise.id,
        category_id: parseInt(newTaskForm.category_id),
        notes: newTaskForm.notes || undefined,
        extra_data: Object.keys(newTaskForm.extra_data).length ? newTaskForm.extra_data : undefined,
      });
      setShowNewTask(false);
      setNewTaskForm({ category_id: "", extra_data: {}, notes: "" });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const selectedCat = instruments.find(i => i.id === parseInt(newTaskForm.category_id));

  if (loading) return <Layout><Spinner /></Layout>;

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-mono text-xs text-ocean-400 mb-1">
              {format(now, "EEEE dd MMMM yyyy · HH:mm:ss", { locale: enUS })}
            </p>
            <h1 className="font-display font-bold text-2xl text-ocean-100">Campaign Dashboard</h1>
          </div>
          {cruise && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-xs text-ocean-400">Active cruise</p>
                <p className="font-display font-bold text-ocean-200">{cruise.code}</p>
              </div>
              <Btn variant="primary" onClick={() => setShowNewTask(true)}>
                <Plus size={14} />
                New task
              </Btn>
            </div>
          )}
        </div>

        {!cruise && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center mb-4">
              <Radio size={28} className="text-ocean-400/50" />
            </div>
            <p className="font-display font-semibold text-ocean-300 text-lg mb-1">No active cruise</p>
            <p className="text-ocean-400/70 text-sm mb-4">Activate a cruise from the Cruises section to start logging tasks.</p>
            <Btn onClick={() => navigate("/cruises")}>Go to cruises</Btn>
          </div>
        )}

        {cruise && (
          <div className="bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Code", value: cruise.code },
              { label: "Name", value: cruise.name },
              { label: "Chief Scientist", value: cruise.chief_scientist || "—" },
              { label: "Active tasks", value: activeTasks.length.toString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-ocean-400 font-display">{label}</p>
                <p className="font-mono text-sm text-ocean-100 font-medium">{value}</p>
              </div>
            ))}
          </div>
        )}

        {cruise && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="font-display font-semibold text-ocean-100">
                Active tasks ({activeTasks.length})
              </h2>
            </div>

            {activeTasks.length === 0 ? (
              <div className="bg-navy-800/50 border border-dashed border-navy-600 rounded-xl p-6 text-center mb-6">
                <p className="text-ocean-400/60 text-sm">No active tasks — start a new task using the button above</p>
              </div>
            ) : (
              <div className="grid gap-3 mb-6">
                {activeTasks.map(task => (
                  <TaskCard key={task.id} task={task} onRefresh={loadData} />
                ))}
              </div>
            )}

            {recentTasks.length > 0 && (
              <>
                <h2 className="font-display font-semibold text-ocean-300 mb-3">Recently completed tasks</h2>
                <div className="grid gap-2">
                  {recentTasks.map(task => (
                    <TaskCard key={task.id} task={task} onRefresh={loadData} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Modal open={showNewTask} onClose={() => setShowNewTask(false)} title="Start new task" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-display font-medium text-ocean-300 mb-1">Instrument / Activity</label>
            <select
              value={newTaskForm.category_id}
              onChange={e => setNewTaskForm(p => ({ ...p, category_id: e.target.value, extra_data: {} }))}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400"
            >
              <option value="">— Select instrument —</option>
              {instruments.map(i => (
                <option key={i.id} value={i.id}>
                  {i.display_name} ({i.task_type === "point" ? "point" : "transect"})
                </option>
              ))}
            </select>
          </div>

          {selectedCat?.extra_fields?.length > 0 && (
            <ExtraFieldsForm
              fields={selectedCat.extra_fields}
              values={newTaskForm.extra_data}
              onChange={v => setNewTaskForm(p => ({ ...p, extra_data: v }))}
            />
          )}

          <div>
            <label className="block text-xs font-display font-medium text-ocean-300 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={newTaskForm.notes}
              onChange={e => setNewTaskForm(p => ({ ...p, notes: e.target.value }))}
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-ocean-400/70 bg-navy-900/50 rounded-lg px-3 py-2">
            <MapPin size={11} />
            Position automatically retrieved from gaia-acquisition
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={() => setShowNewTask(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleStartTask}
                 disabled={!newTaskForm.category_id || creating}>
              {creating ? "Starting..." : "Start task"}
            </Btn>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
