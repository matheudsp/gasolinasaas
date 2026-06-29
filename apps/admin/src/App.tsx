import { Routes, Route } from "react-router-dom";
import { TenantProtectedRoute } from "@/components/TenantProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import StationDetail from "./pages/StationDetail";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Index />} />
      <Route
        element={
          <TenantProtectedRoute>
            <Layout />
          </TenantProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/stations/:id" element={<StationDetail />} />
      </Route>
      <Route
        element={
          <AdminProtectedRoute>
            <Layout />
          </AdminProtectedRoute>
        }
      >
        <Route path="/tenants" element={<div>Tenants</div>} />
      </Route>
    </Routes>
  );
}
