import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CreditCard,
  DollarSign,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmtBRL(v: string | number) {
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const subStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  trial: { label: "Trial", variant: "secondary" },
  active: { label: "Ativa", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  suspended: { label: "Suspensa", variant: "outline" },
};

const paymentStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  paid: { label: "Pago", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "outline" },
};

/**
 * Visão do tenantOwner sobre a própria assinatura: plano, status,
 * período e histórico de pagamentos. Somente leitura — a gestão é
 * feita pela equipe da plataforma.
 */
export default function MySubscription() {
  const { activeTenant } = useAuth();

  const { data: sub, isLoading } = useQuery(
    orpc.subscription.getMine.queryOptions({
      input: {},
      enabled: !!activeTenant,
    }),
  );

  if (!isLoading && !sub) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Nenhuma assinatura encontrada</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Sua rede ainda não tem uma assinatura registrada. Fale com a
            equipe da Gasolina Cloud para ativar seu plano.
          </p>
        </div>
      </div>
    );
  }

  const st = sub
    ? (subStatusMap[sub.status] ?? { label: sub.status, variant: "outline" as const })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Minha Assinatura
          </h1>
          <p className="text-sm text-muted-foreground">
            Plano e pagamentos da rede {activeTenant?.name}
          </p>
        </div>
        {sub && st && (
          <div className="flex items-center gap-1.5">
            <Badge variant={st.variant}>{st.label}</Badge>
            {sub.isOverdue && <Badge variant="destructive">Vencida</Badge>}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Plano</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading || !sub ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-xl font-bold">{sub.planName}</div>
                <p className="text-sm text-muted-foreground">
                  {fmtBRL(sub.planPrice)}/
                  {sub.planInterval === "monthly" ? "mês" : "ano"}
                  {sub.planMaxStations
                    ? ` · até ${sub.planMaxStations} postos`
                    : ""}
                </p>
                {sub.planDescription && (
                  <p className="text-xs text-muted-foreground">
                    {sub.planDescription}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Período vigente
            </CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading || !sub ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <>
                <div className="text-xl font-bold">
                  {fmtDate(sub.currentPeriodStart)} –{" "}
                  {fmtDate(sub.currentPeriodEnd)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {sub.trialEndsAt && `Trial até ${fmtDate(sub.trialEndsAt)}`}
                  {sub.cancelledAt &&
                    ` · Cancelada em ${fmtDate(sub.cancelledAt)}`}
                </p>
                {sub.isOverdue && (
                  <p className="text-sm font-medium text-destructive">
                    Pagamento em atraso — regularize com a equipe da
                    plataforma.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Último pagamento
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading || !sub ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold">
                  {fmtDate(sub.lastPaidAt)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {sub.payments.filter((p) => p.status === "paid").length}{" "}
                  pagamento(s) no histórico
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registrado em</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <Skeleton className="mx-auto h-4 w-40" />
                  </TableCell>
                </TableRow>
              ) : !sub || sub.payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum pagamento registrado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                sub.payments.map((p) => {
                  const pst = paymentStatusMap[p.status] ?? {
                    label: p.status,
                    variant: "outline" as const,
                  };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {fmtDate(p.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {fmtBRL(p.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={pst.variant}>{pst.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDate(p.paidAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
