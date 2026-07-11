import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Spinner } from "./ui/spinner";

/**
 * Protege as páginas que operam sobre um tenant (Painel, Notificações...).
 * Exige um tenant ativo: o membership do owner, ou a rede que o admin
 * selecionou no seletor. Admin sem rede selecionada volta ao /admin.
 */
export function TenantProtectedRoute({ children }: { children: ReactNode }) {
  const {
    session,
    isPending,
    isAdmin,
    membership,
    membershipPending,
    activeTenant,
    signOut,
  } = useAuth();

  if (isPending || membershipPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (isAdmin) {
    if (!activeTenant) return <Navigate to="/admin" replace />;
    return <>{children}</>;
  }

  if (!membership) {
    // Autenticado mas sem membership de owner — usuário do app mobile
    // que logou no painel. Não há nada para ele aqui.
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sua conta não tem permissão para acessar o painel de gestão. Este
          acesso é exclusivo para proprietários de rede e administradores.
        </p>
        <Button variant="outline" onClick={signOut}>
          Sair
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
