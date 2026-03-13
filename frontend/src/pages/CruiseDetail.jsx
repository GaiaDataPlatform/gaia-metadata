import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCruise, exportCruiseCSV, exportCruiseJSON } from "../api/cruises";
import { getTasks } from "../api/tasks";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import Btn from "../components/Btn";
import Spinner from "../components/Spinner";
import { ArrowLeft, Download, FileJson } from "lucide-react";
import { format } from "date-fns";

export default function CruiseDetail() {
  const { id } = useParams();
  const [cruise, setCruise] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCruise(id), getTasks(id)])
      .then(([c, t]) => { setCruise(c); setTasks(t); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><Spinner /></Layout>;
  if (!cruise) return <Layout><div className="p-6 text-red-400">Cruise not found</div></Layout>;

  const byStatus = {
    active: tasks.filter(t => t.status === "active"),
    completed: tasks.filter(t => t.status === "completed"),
    aborted: tasks.filter(t => t.status === "aborted"),
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/cruises" className="text-ocean-400 hover:text-ocean-200 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <PageHeader
            title={`${cruise.code} — ${cruise.name}`}
            subtitle={cruise.chief_scientist}
            actions={
              <>
                <Btn onClick={() => exportCruiseCSV(cruise.id)} size="sm">
                  <Download size={13} />CSV
                </Btn>
                <Btn onClick={() => exportCruiseJSON(cruise.id)} size="sm">
                  <FileJson size={13} />JSON
                </Btn>
              </>
            }
          />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-navy-800 border border-navy-600 rounded-xl p-4 mb-6">
          {[
            { l: "Status", v: <Badge value={cruise.status} /> },
            { l: "Period", v: cruise.start_date ? `${format(new Date(cruise.start_date), "dd/MM/yy")} → ${cruise.end_date ? format(new Date(cruise.end_date), "dd/MM/yy") : "—"}` : "—" },
            { l: "Departure port", v: cruise.port_departure || "—" },
            { l: "Arrival port", v: cruise.port_arrival || "—" },
            { l: "Study area", v: cruise.study_area || "—" },
            { l: "Participants", v: cruise.num_participants?.toString() || "—" },
            { l: "Total tasks", v: tasks.length.toString() },
            { l: "Completed", v: byStatus.completed.length.toString() },
          ].map(({ l, v }) => (
            <div key={l}>
              <p className="text-xs text-ocean-400 font-display">{l}</p>
              <div className="font-mono text-sm text-ocean-100 mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {cruise.description && (
          <div className="bg-navy-800 border border-navy-600 rounded-xl p-4 mb-6">
            <p className="text-xs font-display text-ocean-400 mb-1">Description</p>
            <p className="text-sm text-ocean-100">{cruise.description}</p>
          </div>
        )}

        {/* Tasks table */}
        <h2 className="font-display font-semibold text-ocean-100 mb-3">
          Task log ({tasks.length})
        </h2>
        <div className="bg-navy-800 border border-navy-600 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-600">
                {["#", "Instrument", "Type", "Status", "Start", "End", "Lat/Lon", "Operations"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-display text-ocean-400 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr key={task.id} className={`border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors ${i % 2 === 1 ? "bg-navy-900/20" : ""}`}>
                  <td className="px-3 py-2 font-mono text-xs text-ocean-400">{task.id}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.category.color }} />
                      <span className="font-display text-ocean-200 text-xs">{task.category.display_name}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2"><Badge value={task.category.task_type} /></td>
                  <td className="px-3 py-2"><Badge value={task.status} /></td>
                  <td className="px-3 py-2 font-mono text-xs text-ocean-300">
                    {task.started_at ? format(new Date(task.started_at), "dd/MM HH:mm") : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-ocean-300">
                    {task.ended_at ? format(new Date(task.ended_at), "dd/MM HH:mm") : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-ocean-400">
                    {task.lat_start ? `${task.lat_start?.toFixed(4)} ${task.lon_start?.toFixed(4)}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-ocean-400 font-mono">{task.operations.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 && (
            <div className="text-center py-8 text-ocean-400/60 text-sm">No tasks recorded</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
