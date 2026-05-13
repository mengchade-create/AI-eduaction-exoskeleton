import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import { AuthProvider } from "./components/AuthContext";
import { useAuth } from "./components/authState";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

function ProtectedDashboard() {
  const { user } = useAuth();

  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  return <DashboardPage />;
}

function RootRedirect() {
  const { user } = useAuth();

  return <Navigate to={user === null ? "/login" : `/dashboard/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard/:role" element={<ProtectedDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
