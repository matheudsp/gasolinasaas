import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "./ui/spinner";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { session, isAdmin, isPending } = useAuth();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
