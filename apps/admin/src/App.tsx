import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import Tenants from '@/pages/Tenants'
import TenantDetail from '@/pages/TenantDetail'
import TenantUsers from '@/pages/TenantUsers'
import Plans from '@/pages/Plans'
import FeatureFlags from '@/pages/FeatureFlags'
import Profile from '@/pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/tenants/:id" element={<TenantDetail />} />
        <Route path="/tenants/:id/users" element={<TenantUsers />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/feature-flags" element={<FeatureFlags />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
