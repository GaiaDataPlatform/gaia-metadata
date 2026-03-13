import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cruises from "./pages/Cruises";
import CruiseDetail from "./pages/CruiseDetail";
import Instruments from "./pages/Instruments";
import Users from "./pages/Users";

function ProtectedRoute({ children, adminOnly }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/cruises" element={<ProtectedRoute><Cruises /></ProtectedRoute>} />
      <Route path="/cruises/:id" element={<ProtectedRoute><CruiseDetail /></ProtectedRoute>} />
      <Route path="/instruments" element={<ProtectedRoute adminOnly><Instruments /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
