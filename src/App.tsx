import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import TabLayout from "./components/Tab";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Assistant from "./pages/Assistant";
import PaymentsPage from "./pages/Payment";
import Profile from "./pages/Profile";

// --- Main App Component ---
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes (Accessible without login) */}
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<TabLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback for any protected route that doesn't match above */}
        {/* Redirects any unmatched path inside the protected area back to the dashboard */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
