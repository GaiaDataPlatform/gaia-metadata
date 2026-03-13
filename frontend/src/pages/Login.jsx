import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Anchor, AlertCircle } from "lucide-react";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch {
      setError("Credenziali non valide");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5"
           style={{ backgroundImage: "linear-gradient(#00b4d8 1px, transparent 1px), linear-gradient(90deg, #00b4d8 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-ocean-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-ocean-400/20 border border-ocean-400/30 mb-4 pulse-glow">
            <Anchor size={24} className="text-ocean-300" />
          </div>
          <h1 className="font-display font-bold text-2xl text-ocean-100">Gaia Metadata</h1>
          <p className="text-ocean-400 text-sm mt-1 font-mono">R/V Gaia Blu · CNR</p>
        </div>

        {/* Form */}
        <div className="bg-navy-800 border border-navy-600 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-display font-medium text-ocean-300 mb-1">Username</label>
              <input
                type="text" autoFocus required
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-sm text-ocean-100
                  placeholder-ocean-400/50 focus:outline-none focus:border-ocean-400 transition-colors font-mono"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-xs font-display font-medium text-ocean-300 mb-1">Password</label>
              <input
                type="password" required
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-sm text-ocean-100
                  placeholder-ocean-400/50 focus:outline-none focus:border-ocean-400 transition-colors font-mono"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-ocean-400 hover:bg-ocean-300 text-navy-950 font-display font-semibold
                rounded-lg py-2.5 text-sm transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ocean-400/60 mt-4 font-mono">v2.1.0 · gaia-metadata</p>
      </div>
    </div>
  );
}
