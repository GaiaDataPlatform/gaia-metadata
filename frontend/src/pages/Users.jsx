import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../api/users";
import Layout from "../components/Layout";
import PageHeader from "../components/PageHeader";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Btn from "../components/Btn";
import Spinner from "../components/Spinner";
import { Plus, Trash2, Pencil } from "lucide-react";

// Defined at module level to prevent remount/focus-loss on re-render
function UserForm({ form, setForm, editing, saving, onSave, onCancel }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-display text-ocean-300 mb-1">Username</label>
          <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                 disabled={!!editing}
                 className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 font-mono focus:outline-none focus:border-ocean-400 disabled:opacity-60" />
        </div>
        <div>
          <label className="block text-xs font-display text-ocean-300 mb-1">Full name</label>
          <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                 className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-display text-ocean-300 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                 className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 font-mono focus:outline-none focus:border-ocean-400" />
        </div>
        <div>
          <label className="block text-xs font-display text-ocean-300 mb-1">Role</label>
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 focus:outline-none focus:border-ocean-400">
            <option value="admin">Admin</option>
            <option value="capo_missione">Chief Scientist</option>
            <option value="operatore">Operator</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-display text-ocean-300 mb-1">
          Password {editing && "(leave blank to keep current)"}
        </label>
        <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
               className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-ocean-100 font-mono focus:outline-none focus:border-ocean-400" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={onSave}
             disabled={saving || !form.username || (!editing && !form.password)}>
          {saving ? "Saving..." : editing ? "Update" : "Create user"}
        </Btn>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: "", email: "", full_name: "", role: "operatore", password: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setUsers(await getUsers()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await updateUser(editing.id, payload);
        setEditing(null);
      } else {
        await createUser(form);
        setShowCreate(false);
      }
      setForm({ username: "", email: "", full_name: "", role: "operatore", password: "" });
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user ${u.username}?`)) return;
    await deleteUser(u.id);
    load();
  };

  const openEdit = (u) => {
    setForm({ username: u.username, email: u.email || "", full_name: u.full_name || "", role: u.role, password: "" });
    setEditing(u);
  };

  const handleCancel = () => {
    setShowCreate(false);
    setEditing(null);
    setForm({ username: "", email: "", full_name: "", role: "operatore", password: "" });
  };

  return (
    <Layout>
      <div className="p-6">
        <PageHeader
          title="User Management"
          subtitle="Access and role administration"
          actions={<Btn variant="primary" onClick={() => setShowCreate(true)}><Plus size={14} />New user</Btn>}
        />
        {loading ? <Spinner /> : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-ocean-500 flex items-center justify-center text-sm font-bold font-mono text-white shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-ocean-100">{u.username}</span>
                    {u.full_name && <span className="text-ocean-300 text-sm">{u.full_name}</span>}
                    <Badge value={u.role} />
                    {!u.is_active && <Badge value="disabled" custom="Inactive" />}
                  </div>
                  {u.email && <p className="text-xs text-ocean-400 font-mono">{u.email}</p>}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(u)} className="p-1.5 text-ocean-400 hover:text-ocean-200 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(u)} className="p-1.5 text-red-400/60 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={handleCancel} title="New user">
        <UserForm form={form} setForm={setForm} editing={null} saving={saving} onSave={handleSave} onCancel={handleCancel} />
      </Modal>
      <Modal open={!!editing} onClose={handleCancel} title={`Edit user: ${editing?.username}`}>
        <UserForm form={form} setForm={setForm} editing={editing} saving={saving} onSave={handleSave} onCancel={handleCancel} />
      </Modal>
    </Layout>
  );
}
