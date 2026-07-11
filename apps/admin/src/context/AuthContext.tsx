import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";
import { client, queryClient, setActiveTenant } from "@/lib/orpc";

type Session = typeof authClient.$Infer.Session;
type User = typeof authClient.$Infer.Session.user;
type Membership = NonNullable<
  Awaited<ReturnType<typeof client.tenant.getMyMembership>>
>;

/**
 * Tenant que o painel está operando no momento.
 * - tenantOwner: fixo, derivado do próprio membership.
 * - admin da plataforma: escolhido no seletor de redes (persistido em
 *   localStorage) — o servidor autoriza admins em qualquer tenant.
 */
interface ActiveTenant {
  id: string;
  name: string;
}

type SignInRole = "admin" | "owner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isPending: boolean;
  error: unknown;
  membership: Membership | null;
  membershipPending: boolean;
  isAdmin: boolean;
  activeTenant: ActiveTenant | null;
  selectTenant: (tenant: ActiveTenant | null) => void;
  signIn: (email: string, password: string) => Promise<SignInRole>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_TENANT_STORAGE_KEY = "gasolina.admin.activeTenant";

function getUserRole(user: User | null | undefined): string | undefined {
  return (user as Record<string, unknown> | null | undefined)?.role as
    | string
    | undefined;
}

function loadStoredAdminTenant(): ActiveTenant | null {
  try {
    const raw = localStorage.getItem(ADMIN_TENANT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ActiveTenant>;
    if (typeof parsed.id === "string" && typeof parsed.name === "string") {
      return { id: parsed.id, name: parsed.name };
    }
  } catch {
    // valor corrompido — ignora e recomeça sem tenant selecionado
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending, error } = authClient.useSession();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipPending, setMembershipPending] = useState(false);
  const [adminTenant, setAdminTenant] = useState<ActiveTenant | null>(null);

  const isAdmin = getUserRole(data?.user) === "admin";

  // Tenant ativo unificado: owner usa o do membership; admin usa o selecionado.
  const activeTenant: ActiveTenant | null = isAdmin
    ? adminTenant
    : membership
      ? { id: membership.tenantId, name: membership.tenant.name }
      : null;

  useEffect(() => {
    if (!data?.user) {
      setMembership(null);
      setAdminTenant(null);
      setActiveTenant(undefined);
      return;
    }

    if (isAdmin) {
      const stored = loadStoredAdminTenant();
      setAdminTenant(stored);
      setActiveTenant(stored?.id);
      return;
    }

    setMembershipPending(true);
    client.tenant
      .getMyMembership()
      .then((result) => {
        setMembership(result ?? null);
        setActiveTenant(result?.tenantId ?? undefined);
      })
      .catch(() => {
        setMembership(null);
        setActiveTenant(undefined);
      })
      .finally(() => setMembershipPending(false));
  }, [data?.user?.id, isAdmin]);

  const selectTenant = (tenant: ActiveTenant | null) => {
    if (!isAdmin) return;
    setAdminTenant(tenant);
    setActiveTenant(tenant?.id);
    if (tenant) {
      localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, JSON.stringify(tenant));
    } else {
      localStorage.removeItem(ADMIN_TENANT_STORAGE_KEY);
    }
    // As queryKeys não incluem o tenant (ele viaja no header x-tenant-id),
    // então tudo que está em cache pertence à rede anterior — descarta para
    // as telas montadas refazerem as buscas contra a rede recém-selecionada.
    queryClient.removeQueries();
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<SignInRole> => {
    const { data: signInData, error: signInError } =
      await authClient.signIn.email({ email, password });

    if (signInError || !signInData) {
      throw new Error(signInError?.message || "Falha na autenticação.");
    }

    const role = getUserRole(signInData.user);

    if (role === "admin") return "admin";

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
    setActiveTenant(membershipData.tenantId);
    return "owner";
  };

  const signOut = async () => {
    await authClient.signOut();
    setMembership(null);
    setAdminTenant(null);
    setActiveTenant(undefined);
    localStorage.removeItem(ADMIN_TENANT_STORAGE_KEY);
    // Não deixa dados do tenant anterior vazarem para o próximo login.
    queryClient.removeQueries();
  };

  return (
    <AuthContext.Provider
      value={{
        session: data ?? null,
        user: data?.user ?? null,
        isPending,
        error,
        membership,
        membershipPending,
        isAdmin,
        activeTenant,
        selectTenant,
        signIn,
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
