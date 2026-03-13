import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Anchor, Radio, Users, LogOut, Activity, ChevronRight, Palette } from "lucide-react";
import { version } from "../../package.json";

const navItems = [
  { to: "/",            label: "Dashboard",   icon: Activity, roles: ["admin", "capo_missione", "operatore"] },
  { to: "/cruises",     label: "Cruises",     icon: Anchor,   roles: ["admin", "capo_missione", "operatore"] },
  { to: "/instruments", label: "Instruments", icon: Radio,    roles: ["admin"] },
  { to: "/users",       label: "Users",       icon: Users,    roles: ["admin"] },
];

const THEME_LABELS = { blue: "Blue", light: "Light", green: "Green", impact: "Impact" };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, setTheme, themes } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };
  const filteredNav = navItems.filter(n => n.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-navy-950">
      <aside className="w-56 flex flex-col border-r border-navy-700 bg-navy-900 shrink-0">

        {/* Logo / version */}
        <div className="px-4 py-5 border-b border-navy-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-ocean-400 flex items-center justify-center">
              <Anchor size={16} className="text-navy-950" />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-ocean-200 leading-tight">Gaia Metadata</p>
              <p className="text-xs text-ocean-400 font-mono">v{version}</p>
            </div>
          </div>
          <p className="text-xs text-ocean-400 mt-2 font-mono">R/V Gaia Blu</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {filteredNav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-ocean-400/20 text-ocean-200 border border-ocean-400/30"
                    : "text-ocean-100/60 hover:text-ocean-100 hover:bg-navy-700"
                }`}
              >
                <Icon size={16} className={active ? "text-ocean-300" : ""} />
                <span className="font-display font-medium">{label}</span>
                {active && <ChevronRight size={12} className="ml-auto text-ocean-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Theme switcher */}
        <div className="px-3 py-2 border-t border-navy-700">
          <p className="text-xs text-ocean-400/60 font-display mb-1.5 px-1">Theme</p>
          <div className="grid grid-cols-4 gap-1">
            {themes.map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                title={THEME_LABELS[t]}
                className={`py-1 rounded text-xs font-mono transition-all ${
                  theme === t
                    ? "bg-ocean-400/20 text-ocean-200 border border-ocean-400/30"
                    : "text-ocean-400/60 hover:text-ocean-300 hover:bg-navy-700"
                }`}
              >
                {THEME_LABELS[t][0]}
              </button>
            ))}
          </div>
        </div>

        {/* User / logout */}
        <div className="px-3 py-3 border-t border-navy-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-ocean-500 flex items-center justify-center text-xs font-bold font-mono text-white">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ocean-100 truncate">{user?.username}</p>
              <p className="text-xs text-ocean-400 font-mono">
                {user?.role === "capo_missione" ? "Chief Scientist" : user?.role}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-red-400 hover:bg-red-900/20 transition-colors">
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
