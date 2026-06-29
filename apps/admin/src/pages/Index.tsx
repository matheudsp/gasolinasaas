import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

const TITLE_TEXT = `
 ██████╗  █████╗ ███████╗██████╗ ██╗     ██╗███╗   ██╗ █████╗ 
██╔════╝ ██╔══██╗██╔════╝██╔═══██╗██║     ██║████╗  ██║██╔══██╗
██║  ███╗███████║███████╗██║   ██║██║     ██║██╔██╗ ██║███████║
██║   ██║██╔══██║╚════██║██║   ██║██║     ██║██║╚██╗██║██╔══██║
╚██████╔╝██║  ██║███████║╚██████╔╝███████╗██║██║ ╚████║██║  ██║
 ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
`;

export default function Register() {
  const { session } = useAuth();
  const navigate = useNavigate();

  // Redireciona caso já exista sessão ativa
  if (session) return <Navigate to="/dashboard" replace />;

  const { data: healthCheck = [], isLoading: healthCheckLoading } = useQuery(
    orpc.healthCheck.queryOptions({ input: {} }),
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="flex w-full max-w-3xl flex-col items-center space-y-12 text-center">
        {/* Arte ASCII centralizada e usando a cor primária do tema */}
        <div className="flex justify-center w-full">
          <pre className="overflow-x-auto font-mono text-[10px] font-bold text-primary sm:text-xs md:text-sm">
            {TITLE_TEXT}
          </pre>
        </div>

        {/* Botão de Acesso padronizado com shadcn/ui */}
        <div>
          <button
            onClick={() => navigate("/login")}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Acessar Sistema
          </button>
        </div>

        {/* Card de Status alinhado e padronizado com as variáveis do seu CSS */}
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-left text-card-foreground shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">
            Status da API
          </h2>
          <div className="flex items-center gap-3">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                healthCheckLoading
                  ? "animate-pulse bg-yellow-500"
                  : healthCheck
                    ? "bg-green-500"
                    : "bg-destructive"
              }`}
            />
            <span className="text-sm font-medium text-muted-foreground">
              {healthCheckLoading
                ? "Checando sistema..."
                : healthCheck
                  ? "Conectado"
                  : "Desconectado"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
