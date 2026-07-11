import { Routes, Route } from "react-router-dom";
import { TenantProtectedRoute } from "@/components/TenantProtectedRoute";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "@/pages/Login";
import Index from "@/pages/Index";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import StationDetail from "./pages/StationDetail";
import Admin from "./pages/Admin";
import SubscriptionDetail from "./pages/SubscriptionDetail";
import MySubscription from "./pages/MySubscription";
import PushNotifications from "./pages/PushNotifications";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OnPasswordReset from "./pages/OnPasswordReset";
import VerifyEmail from "./pages/VerifyEmail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Index />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/on-password-reset" element={<OnPasswordReset />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
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
        <Route path="/push-notifications" element={<PushNotifications />} />
        <Route path="/minha-assinatura" element={<MySubscription />} />
      </Route>
      <Route
        element={
          <AdminProtectedRoute>
            <Layout />
          </AdminProtectedRoute>
        }
      >
        <Route path="/admin" element={<Admin />} />
        <Route path="/assinaturas/:id" element={<SubscriptionDetail />} />
      </Route>
    </Routes>
  );
}
