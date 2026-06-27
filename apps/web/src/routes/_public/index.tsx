import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_public/")({
  component: HomeComponent,
});

const TITLE_TEXT = `
  ██████╗  █████╗ ███████╗ ██████╗ ██╗     ██╗███╗   ██╗ █████╗
 ██╔════╝ ██╔══██╗██╔════╝██╔═══██╗██║     ██║████╗  ██║██╔══██╗
 ██║  ███╗███████║███████╗██║   ██║██║     ██║██╔██╗ ██║███████║
 ██║   ██║██╔══██║╚════██║██║   ██║██║     ██║██║╚██╗██║██╔══██║
 ╚██████╔╝██║  ██║███████║╚██████╔╝███████╗██║██║ ╚████║██║  ██║
  ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝

                      Sistema Gasolina
`;
function HomeComponent() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">Status da API</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {healthCheck.isLoading
                ? "Verificando sistemas..."
                : healthCheck.data
                  ? "Funcionando normalmente"
                  : "Sistema fora do ar"}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
