import { useQuery } from "@tanstack/react-query";
import { Coins, Trophy, UserCheck, Users } from "lucide-react";
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

// ── KPI ─────────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fidelidade</h1>
        <p className="text-muted-foreground text-sm">
          Auditoria do programa: pontos creditados e rankings.
        </p>
      </div>

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
    </div>
  );
}
