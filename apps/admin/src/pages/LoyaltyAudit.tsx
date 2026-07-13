import { useQuery } from "@tanstack/react-query";
import { Coins, History, Trophy, UserCheck, Users } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="rounded-md bg-primary/5 p-2 text-primary">{icon}</div>
        <div>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
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

  return (
    <div className="space-y-6">
      {/* ── Totais ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
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
      </div>

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
                  <TableHead className="text-center">Créditos</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op, i) => (
                  <TableRow key={op.userId ?? i}>
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
    </div>
  );
}
