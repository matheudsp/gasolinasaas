import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isAdmin, isPending } = useAuth();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
