import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

interface AuthContextType {
  session: typeof authClient.$Infer.Session | null;
  user: typeof authClient.$Infer.Session.user | null;
  isPending: boolean;
  error: any;
  client: typeof authClient;
  signInAsOwner: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error } = authClient.useSession();
  const signInAsOwner = async (email: string, password: string) => {
    const { data: signInData, error: signInError } =
      await authClient.signIn.email({
        email,
        password: password,
      });

    if (signInError || !signInData) {
      throw new Error(signInError?.message || "Falha na autenticação.");
    }

    try {
      const membership = await orpc.tenant.getMyMembership();

      if (!membership || membership.role !== "owner") {
        await authClient.signOut();
        throw new Error(
          "Acesso negado: você não é o proprietário (Owner) deste tenant.",
        );
      }
    } catch (err: any) {
      await authClient.signOut();
      throw new Error(err.message || "Erro ao validar permissões do tenant.");
    }
  };
  return (
    <AuthContext.Provider
      value={{
        session: data,
        user: data?.user ?? null,
        isPending,
        error,
        client: authClient,
        signInAsOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
