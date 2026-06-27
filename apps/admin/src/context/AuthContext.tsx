import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import { client } from "@/lib/orpc";

type Session = typeof authClient.$Infer.Session;
type User = typeof authClient.$Infer.Session.user;
type Membership = NonNullable<Awaited<ReturnType<typeof client.tenant.getMyMembership>>>;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isPending: boolean;
  error: unknown;
  membership: Membership | null;
  signInAsOwner: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error } = authClient.useSession();
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    if (!data?.user) {
      setMembership(null);
      return;
    }
    client.tenant
      .getMyMembership()
      .then((result) => setMembership(result ?? null))
      .catch(() => setMembership(null));
  }, [data?.user?.id]);

  const signInAsOwner = async (email: string, password: string) => {
    const { data: signInData, error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError || !signInData) {
      throw new Error(signInError?.message || "Falha na autenticação.");
    }

    let membershipData: Membership | null = null;

    try {
      membershipData = await client.tenant.getMyMembership();
    } catch {
      await authClient.signOut();
      throw new Error("Erro ao validar permissões do tenant.");
    }

    if (!membershipData || membershipData.role !== "owner") {
      await authClient.signOut();
      throw new Error(
        "Acesso negado: você não é o proprietário (Owner) deste tenant.",
      );
    }

    setMembership(membershipData);
  };

  const signOut = async () => {
    await authClient.signOut();
    setMembership(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session: data ?? null,
        user: data?.user ?? null,
        isPending,
        error,
        membership,
        signInAsOwner,
        signOut,
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