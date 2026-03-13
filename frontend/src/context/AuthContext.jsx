import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("gaia_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem("gaia_token", data.access_token);
      localStorage.setItem("gaia_user", JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("gaia_token");
    localStorage.removeItem("gaia_user");
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  const isCapo = user?.role === "admin" || user?.role === "capo_missione";

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin, isCapo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
