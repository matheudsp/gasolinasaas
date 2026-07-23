import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Save, Trash2, UserPlus, Users } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoyaltyGuideDialog } from "@/components/LoyaltyGuideDialog";
import { LoyaltyCampaigns } from "@/components/LoyaltyCampaigns";
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

export function LoyaltyConfig() {
  const qc = useQueryClient();
  const { activeTenant } = useAuth();
  const enabled = !!activeTenant;

  const [points, setPoints] = useState("");
  const [validityDays, setValidityDays] = useState("");
  const [maxCredit, setMaxCredit] = useState("");
  const [email, setEmail] = useState("");

  // Config (pontos por real + validade dos pontos)
  const { data: config } = useQuery(
    orpc.loyalty.getConfig.queryOptions({ enabled }),
  );

  useEffect(() => {
    if (config) {
      setPoints(String(config.pointsPerReal));
      setValidityDays(
        config.pointsValidityDays ? String(config.pointsValidityDays) : "",
      );
      setMaxCredit(
        config.maxCreditAmountCents
          ? String(config.maxCreditAmountCents / 100).replace(".", ",")
          : "",
      );
    }
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

  // Validade: vazio = pontos nunca expiram (null no server).
  const trimmedValidity = validityDays.trim();
  const parsedValidity =
    trimmedValidity === "" ? null : Number(trimmedValidity);
  const validityValid =
    parsedValidity === null ||
    (Number.isInteger(parsedValidity) &&
      parsedValidity >= 1 &&
      parsedValidity <= 3650);

  // Teto por crédito: vazio = sem teto (null no server). Aceita "500" ou
  // "500,00" em reais; convertido pra centavos.
  const trimmedMaxCredit = maxCredit.trim();
  const parsedMaxCreditCents =
    trimmedMaxCredit === ""
      ? null
      : Math.round(Number(trimmedMaxCredit.replace(",", ".")) * 100);
  const maxCreditValid =
    parsedMaxCreditCents === null ||
    (Number.isFinite(parsedMaxCreditCents) && parsedMaxCreditCents >= 1);

  const configDirty = config
    ? parsedPoints !== config.pointsPerReal ||
      parsedValidity !== (config.pointsValidityDays ?? null) ||
      parsedMaxCreditCents !== (config.maxCreditAmountCents ?? null)
    : false;

  const handleSaveConfig = () => {
    if (!pointsValid) {
      toast.warning("Informe um número entre 0 e 1000 (ex.: 2,5).");
      return;
    }
    if (!validityValid) {
      toast.warning(
        "Validade deve ser um número inteiro de dias entre 1 e 3650 — ou vazio para nunca expirar.",
      );
      return;
    }
    if (!maxCreditValid) {
      toast.warning(
        "Valor máximo por crédito deve ser um valor em reais — ou vazio para não ter teto.",
      );
      return;
    }
    updateConfig.mutate({
      pointsPerReal: parsedPoints,
      pointsValidityDays: parsedValidity,
      maxCreditAmountCents: parsedMaxCreditCents,
    });
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
    <div className="space-y-6">
      {/* ── Programa de pontos ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4" />
              Programa de pontos
            </CardTitle>
            {/* Guia: explica os campos, sugere valores e simula o custo. */}
            <LoyaltyGuideDialog pointsPerReal={pointsValid ? parsedPoints : 1} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="points-per-real">
              Pontos que o cliente ganha por real gasto
            </Label>
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
            <p className="text-xs text-muted-foreground">
              Aceita frações. Ex.: <strong>2,5</strong> → um abastecimento de R$
              100,00 gera 250 pontos.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="points-validity">Validade dos pontos (dias)</Label>
            <Input
              id="points-validity"
              type="number"
              min={1}
              max={3650}
              step={1}
              inputMode="numeric"
              placeholder="Nunca expiram"
              className="w-32"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              disabled={updateConfig.isPending || !enabled}
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para os pontos nunca expirarem. Cada crédito vale esse
              prazo a partir da data em que foi ganho — a mudança vale apenas
              para pontos ganhos daqui em diante.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max-credit">Valor máximo por crédito (R$)</Label>
            <Input
              id="max-credit"
              type="text"
              inputMode="decimal"
              placeholder="Sem teto"
              className="w-32"
              value={maxCredit}
              onChange={(e) => setMaxCredit(e.target.value)}
              disabled={updateConfig.isPending || !enabled}
            />
            <p className="text-xs text-muted-foreground">
              Protege contra erro de digitação do frentista (ex.: R$ 1.500 em
              vez de R$ 150). Créditos acima desse valor são bloqueados no
              caixa. Deixe vazio para não ter teto.
            </p>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={
              updateConfig.isPending ||
              !pointsValid ||
              !validityValid ||
              !maxCreditValid ||
              !configDirty
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
        </CardContent>
      </Card>

      {/* ── Campanhas de pontos ─────────────────────────────────────────── */}
      <LoyaltyCampaigns enabled={enabled} />

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
