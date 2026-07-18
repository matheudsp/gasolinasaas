import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Coins,
  History,
  Percent,
  Search,
  Trophy,
  Undo2,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

const RANK_LIMIT = 20;

function fmtDateTime(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtBRL(cents: number | null) {
  if (cents === null) return "—";
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

/** "12345678909" → "123.456.789-09" (aceita parcial, pra máscara ao digitar). */
function fmtCpf(raw: string | null) {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "").slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  const base = parts.join(".");
  return d.length > 9 ? `${base}-${d.slice(9)}` : base;
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="rounded-md bg-primary/5 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {hint && (
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground/70">
              {hint}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LoyaltyAudit() {
  const { activeTenant } = useAuth();
  const enabled = !!activeTenant;

  const { data: totals } = useQuery(
    orpc.loyalty.auditTotals.queryOptions({ enabled }),
  );

  const { data: customers = [], isLoading: loadingCustomers } = useQuery(
    orpc.loyalty.topCustomers.queryOptions({
      input: { limit: RANK_LIMIT },
      enabled,
    }),
  );

  const { data: operators = [], isLoading: loadingOperators } = useQuery(
    orpc.loyalty.topOperators.queryOptions({
      input: { limit: RANK_LIMIT },
      enabled,
    }),
  );

  const { data: redemptions = [], isLoading: loadingRedemptions } = useQuery(
    orpc.loyalty.listRedemptions.queryOptions({
      input: { limit: 50 },
      enabled,
    }),
  );

  // Operador selecionado no ranking → drill-down das transações dele.
  const [selectedOperator, setSelectedOperator] = useState<{
    userId: string;
    name: string | null;
  } | null>(null);

  const operatorTxOptions = orpc.loyalty.operatorTransactions.queryOptions({
    input: { operatorUserId: selectedOperator?.userId ?? "", limit: 100 },
    enabled: !!selectedOperator,
  });
  const { data: operatorTx = [], isLoading: loadingOperatorTx } =
    useQuery(operatorTxOptions);

  // Crédito selecionado para estorno (confirmação em Dialog).
  const [reverseTarget, setReverseTarget] = useState<{
    id: string;
    customerName: string | null;
    points: number;
    amountCents: number | null;
  } | null>(null);

  const qc = useQueryClient();
  const reverse = useMutation({
    ...orpc.loyalty.reverseCredit.mutationOptions(),
    onSuccess: (data) => {
      toast.success(
        `Crédito estornado — ${data.reversedPoints} pontos devolvidos.`,
      );
      setReverseTarget(null);
      qc.invalidateQueries({ queryKey: operatorTxOptions.queryKey });
      qc.invalidateQueries(orpc.loyalty.auditTotals.queryOptions());
      qc.invalidateQueries(
        orpc.loyalty.topOperators.queryOptions({
          input: { limit: RANK_LIMIT },
        }),
      );
      qc.invalidateQueries(
        orpc.loyalty.topCustomers.queryOptions({
          input: { limit: RANK_LIMIT },
        }),
      );
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  const redemptionRate =
    totals && totals.totalPoints > 0
      ? totals.redeemedPoints / totals.totalPoints
      : null;

  // Busca de cliente por CPF (imperativa — dispara no submit).
  const [searchCpf, setSearchCpf] = useState("");
  const customerSearch = useMutation(
    orpc.loyalty.customerByCpf.mutationOptions(),
  );

  const handleSearchCpf = () => {
    const digits = searchCpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      toast.warning("Informe o CPF completo (11 dígitos).");
      return;
    }
    customerSearch.mutate(
      { cpf: digits },
      { onError: (err: Error) => toast.error(err.message) },
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Totais ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          icon={<Coins className="h-5 w-5" />}
          label="Pontos creditados"
          value={(totals?.totalPoints ?? 0).toLocaleString("pt-BR")}
        />
        <Stat
          icon={<UserCheck className="h-5 w-5" />}
          label="Créditos realizados"
          value={(totals?.credits ?? 0).toLocaleString("pt-BR")}
        />
        <Stat
          icon={<Users className="h-5 w-5" />}
          label="Clientes com pontos"
          value={(totals?.customers ?? 0).toLocaleString("pt-BR")}
        />
        <Stat
          icon={<Wallet className="h-5 w-5" />}
          label="Pontos em circulação"
          value={(totals?.outstandingPoints ?? 0).toLocaleString("pt-BR")}
          hint="Expirações são consolidadas automaticamente uma vez por dia."
        />
        <Stat
          icon={<Percent className="h-5 w-5" />}
          label="Taxa de resgate"
          value={
            redemptionRate === null
              ? "—"
              : `${(redemptionRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
          }
        />
      </div>

      {/* ── Busca de cliente por CPF ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Buscar cliente por CPF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
              className="w-48"
              value={searchCpf}
              onChange={(e) => setSearchCpf(fmtCpf(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSearchCpf()}
              disabled={customerSearch.isPending}
            />
            <Button
              onClick={handleSearchCpf}
              disabled={customerSearch.isPending}
              className="gap-2"
            >
              {customerSearch.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>

          {customerSearch.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Abastecimentos</TableHead>
                  <TableHead className="text-right">Total gasto</TableHead>
                  <TableHead>Última atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">
                      {customerSearch.data.name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customerSearch.data.email}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {fmtCpf(customerSearch.data.cpf)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {customerSearch.data.balance.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {customerSearch.data.credits.toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {fmtBRL(customerSearch.data.spentCents)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {fmtDateTime(customerSearch.data.lastActivityAt)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Ranking de clientes ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Clientes com mais pontos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCustomers ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum ponto creditado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c, i) => (
                  <TableRow key={c.userId}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm tabular-nums whitespace-nowrap">
                      {fmtCpf(c.cpf)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {c.points.toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Ranking de operadores ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4" />
            Operadores que mais creditaram
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Clique em um operador para ver as transações dele.
          </p>
        </CardHeader>
        <CardContent>
          {loadingOperators ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : operators.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum operador creditou pontos ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="text-center">Transações</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op, i) => (
                  <TableRow
                    key={op.userId ?? i}
                    className={
                      op.userId ? "cursor-pointer hover:bg-muted/50" : ""
                    }
                    onClick={() =>
                      op.userId &&
                      setSelectedOperator({ userId: op.userId, name: op.name })
                    }
                  >
                    <TableCell className="text-muted-foreground tabular-nums">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {op.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {op.email}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {op.credits.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {op.points.toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Histórico de resgates ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Histórico de resgates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRedemptions ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : redemptions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum resgate concluído ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Recompensa</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                    <TableHead>Operador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((rd) => (
                    <TableRow key={rd.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(rd.fulfilledAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{rd.customerName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {rd.customerEmail}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {rd.rewardName}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                        −{rd.costPoints.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {rd.operatorName ? (
                          <>
                            <div className="text-sm">{rd.operatorName}</div>
                            <div className="text-xs text-muted-foreground">
                              {rd.operatorEmail}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Drill-down: transações do operador ──────────────────────────── */}
      <Dialog
        open={selectedOperator !== null}
        onOpenChange={(open) => !open && setSelectedOperator(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Transações de {selectedOperator?.name ?? "operador"}
            </DialogTitle>
          </DialogHeader>

          {loadingOperatorTx ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : operatorTx.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma transação encontrada.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente beneficiado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operatorTx.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(tx.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {tx.customerName ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tx.customerEmail}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {fmtBRL(tx.amountCents)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {tx.points > 0 ? "+" : ""}
                        {tx.points.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.amountCents !== null && tx.amountCents > 0 ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                            onClick={() =>
                              setReverseTarget({
                                id: tx.id,
                                customerName: tx.customerName,
                                points: tx.points,
                                amountCents: tx.amountCents,
                              })
                            }
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Estornar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Estorno
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirmação de estorno ───────────────────────────────────────── */}
      <Dialog
        open={reverseTarget !== null}
        onOpenChange={(open) => !open && setReverseTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar crédito?</DialogTitle>
            <DialogDescription>
              {reverseTarget
                ? `Crédito de ${fmtBRL(reverseTarget.amountCents)} (${reverseTarget.points.toLocaleString("pt-BR")} pontos) para ${reverseTarget.customerName ?? "cliente"}. `
                : ""}
              Serão devolvidos apenas os pontos que o cliente ainda não usou —
              o saldo dele nunca fica negativo. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReverseTarget(null)}
              disabled={reverse.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              disabled={reverse.isPending}
              onClick={() =>
                reverseTarget &&
                reverse.mutate({ transactionId: reverseTarget.id })
              }
            >
              {reverse.isPending && <Spinner className="size-4" />}
              Estornar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
