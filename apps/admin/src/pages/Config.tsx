import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Save, Trash2, UserPlus, Users } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const qc = useQueryClient();
  const { activeTenant } = useAuth();
  const enabled = !!activeTenant;

  const [points, setPoints] = useState("");
  const [email, setEmail] = useState("");

  // Config (pontos por real)
  const { data: config } = useQuery(
    orpc.loyalty.getConfig.queryOptions({ enabled }),
  );

  useEffect(() => {
    if (config) setPoints(String(config.pointsPerReal));
  }, [config]);

  const { data: operators = [], isLoading } = useQuery(
    orpc.loyalty.listOperators.queryOptions({ enabled }),
  );

  const updateConfig = useMutation({
    ...orpc.loyalty.updateConfig.mutationOptions(),
    onSuccess: () => {
      toast.success("Configuração salva.");
      qc.invalidateQueries(orpc.loyalty.getConfig.queryOptions());
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const grant = useMutation({
    ...orpc.loyalty.grantOperator.mutationOptions(),
    onSuccess: () => {
      toast.success("Operador adicionado.");
      setEmail("");
      qc.invalidateQueries(orpc.loyalty.listOperators.queryOptions());
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const revoke = useMutation({
    ...orpc.loyalty.revokeOperator.mutationOptions(),
    onSuccess: () => {
      toast.success("Operador removido.");
      qc.invalidateQueries(orpc.loyalty.listOperators.queryOptions());
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const parsedPoints = Number(points.replace(",", "."));
  const pointsValid =
    Number.isFinite(parsedPoints) && parsedPoints >= 0 && parsedPoints <= 1000;
  const pointsDirty = config ? parsedPoints !== config.pointsPerReal : false;

  const handleSaveConfig = () => {
    if (!pointsValid) {
      toast.warning("Informe um número entre 0 e 1000 (ex.: 2,5).");
      return;
    }
    updateConfig.mutate({ pointsPerReal: parsedPoints });
  };

  const handleGrant = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.warning("Informe o e-mail do operador.");
      return;
    }
    grant.mutate({ email: trimmed });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Regras do programa de fidelidade e quem pode creditar pontos no caixa.
        </p>
      </div>

      {/* ── Multiplicador ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4" />
            Pontos por real
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="points-per-real">
              Pontos que o cliente ganha por real gasto
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="points-per-real"
                type="number"
                min={0}
                max={1000}
                step="0.5"
                inputMode="decimal"
                className="w-32"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                disabled={updateConfig.isPending || !enabled}
              />
              <Button
                onClick={handleSaveConfig}
                disabled={
                  updateConfig.isPending || !pointsValid || !pointsDirty
                }
                className="gap-2"
              >
                {updateConfig.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aceita frações. Ex.: <strong>2,5</strong> → um abastecimento de R$
              100,00 gera 250 pontos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Adicionar operador ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Adicionar operador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="operator-email">E-mail do frentista</Label>
            <div className="flex items-center gap-2">
              <Input
                id="operator-email"
                type="email"
                placeholder="frentista@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGrant()}
                disabled={grant.isPending || !enabled}
              />
              <Button
                onClick={handleGrant}
                disabled={grant.isPending || !email.trim()}
                className="gap-2"
              >
                {grant.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O frentista precisa já ter uma conta no app com esse e-mail.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Lista de operadores ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Operadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : operators.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum operador ainda. Adicione um frentista acima.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op) => (
                  <TableRow key={op.userId}>
                    <TableCell className="font-medium">
                      {op.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {op.email}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDate(op.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate({ userId: op.userId })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
