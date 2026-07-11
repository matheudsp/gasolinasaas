import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarClock,
  CreditCard,
  DollarSign,
  Pencil,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { orpc } from "@/lib/orpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

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
/** Valor para <input type="date"> no fuso local. */
function toDateInput(d: Date | string) {
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** Meio-dia local evita o período "andar" um dia por fuso/UTC. */
function fromDateInput(value: string) {
  return new Date(`${value}T12:00:00`);
}

const subStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  trial: { label: "Trial", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  suspended: { label: "Suspenso", variant: "outline" },
};

const paymentStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  paid: { label: "Pago", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "outline" },
};

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [periodOpen, setPeriodOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({ start: "", end: "" });
  const [planOpen, setPlanOpen] = useState(false);
  const [planId, setPlanId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    status: "paid",
    notes: "",
  });

  const { data: sub, isLoading } = useQuery(
    orpc.subscription.getById.queryOptions({
      input: { id: id ?? "" },
      enabled: !!id,
    }),
  );

  const { data: plans = [] } = useQuery(
    orpc.admin.plan.list.queryOptions({ input: {} }),
  );

  const invalidate = () => {
    qc.invalidateQueries(
      orpc.subscription.getById.queryOptions({ input: { id: id ?? "" } }),
    );
    qc.invalidateQueries(orpc.subscription.list.queryOptions({ input: {} }));
  };

  const onError = (e: Error) => toast.error(e.message);

  const periodMutation = useMutation({
    ...orpc.subscription.updatePeriod.mutationOptions(),
    onSuccess: () => {
      toast.success("Período atualizado!");
      setPeriodOpen(false);
      invalidate();
    },
    onError,
  });

  const planMutation = useMutation({
    ...orpc.subscription.changePlan.mutationOptions(),
    onSuccess: () => {
      toast.success("Plano alterado!");
      setPlanOpen(false);
      invalidate();
    },
    onError,
  });

  const paymentMutation = useMutation({
    ...orpc.subscription.recordPayment.mutationOptions(),
    onSuccess: () => {
      toast.success("Pagamento registrado!");
      setPaymentOpen(false);
      setPaymentForm({ amount: "", status: "paid", notes: "" });
      invalidate();
    },
    onError,
  });

  const renewMutation = useMutation({
    ...orpc.subscription.renew.mutationOptions(),
    onSuccess: () => {
      toast.success("Assinatura renovada!");
      invalidate();
    },
    onError,
  });

  const suspendMutation = useMutation({
    ...orpc.subscription.suspend.mutationOptions(),
    onSuccess: () => {
      toast.success("Assinatura suspensa.");
      invalidate();
    },
    onError,
  });

  const cancelMutation = useMutation({
    ...orpc.subscription.cancel.mutationOptions(),
    onSuccess: () => {
      toast.success("Assinatura cancelada.");
      invalidate();
    },
    onError,
  });

  if (!isLoading && !sub) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Assinatura não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/admin")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  const st = sub
    ? (subStatusMap[sub.status] ?? { label: sub.status, variant: "outline" as const })
    : null;

  const totalPaid = (sub?.payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isLoading || !sub ? (
              <Skeleton className="h-7 w-56" />
            ) : (
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                {sub.tenantName}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              Assinatura {sub ? `criada em ${fmtDate(sub.createdAt)}` : ""}
            </p>
          </div>
          {sub && st && (
            <div className="flex items-center gap-1.5">
              <Badge variant={st.variant}>{st.label}</Badge>
              {sub.isOverdue && <Badge variant="destructive">Vencida</Badge>}
            </div>
          )}
        </div>

        {sub && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => {
              setPaymentForm({ amount: sub.planPrice, status: "paid", notes: "" });
              setPaymentOpen(true);
            }}>
              <DollarSign className="mr-1.5 h-4 w-4" />
              Registrar pagamento
            </Button>
            {(sub.status !== "active" || sub.isOverdue) && (
              <Button
                size="sm"
                variant="outline"
                disabled={renewMutation.isPending}
                onClick={() => renewMutation.mutate({ subscriptionId: sub.id })}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Renovar (cortesia)
              </Button>
            )}
            {(sub.status === "active" || sub.status === "trial") && (
              <Button
                size="sm"
                variant="outline"
                disabled={suspendMutation.isPending}
                onClick={() => suspendMutation.mutate({ subscriptionId: sub.id })}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                Suspender
              </Button>
            )}
            {sub.status !== "cancelled" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ subscriptionId: sub.id })}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Cards de resumo */}
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
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setPlanId(sub.planId);
                    setPlanOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Mudar plano
                </Button>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setPeriodForm({
                      start: toDateInput(sub.currentPeriodStart),
                      end: toDateInput(sub.currentPeriodEnd),
                    });
                    setPeriodOpen(true);
                  }}
                >
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar período
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            {isLoading || !sub ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold">{fmtBRL(totalPaid)}</div>
                <p className="text-sm text-muted-foreground">
                  {sub.payments.filter((p) => p.status === "paid").length}{" "}
                  pagamento(s) confirmados
                </p>
                <p className="text-sm text-muted-foreground">
                  Último: {fmtDate(sub.lastPaidAt)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Histórico de pagamentos */}
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
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center">
                    <Skeleton className="mx-auto h-4 w-40" />
                  </TableCell>
                </TableRow>
              ) : !sub || sub.payments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
                      <TableCell className="max-w-64 truncate text-sm text-muted-foreground">
                        {p.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editar período */}
      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar período</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Início *</Label>
              <Input
                type="date"
                value={periodForm.start}
                onChange={(e) =>
                  setPeriodForm((f) => ({ ...f, start: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim *</Label>
              <Input
                type="date"
                value={periodForm.end}
                onChange={(e) =>
                  setPeriodForm((f) => ({ ...f, end: e.target.value }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ajuste manual — pagamentos e renovações futuras continuam
            emendando no fim deste período.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !periodForm.start || !periodForm.end || periodMutation.isPending
              }
              onClick={() =>
                sub &&
                periodMutation.mutate({
                  subscriptionId: sub.id,
                  currentPeriodStart: fromDateInput(periodForm.start),
                  currentPeriodEnd: fromDateInput(periodForm.end),
                })
              }
            >
              {periodMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mudar plano */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mudar plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Novo plano</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {fmtBRL(p.price)}/
                      {p.interval === "monthly" ? "mês" : "ano"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            O período vigente não muda; o novo plano vale a partir do próximo
            ciclo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!planId || planMutation.isPending}
              onClick={() =>
                sub &&
                planMutation.mutate({ subscriptionId: sub.id, planId })
              }
            >
              {planMutation.isPending ? "Salvando..." : "Alterar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar pagamento */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input
                  className="font-mono"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="99.90"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={paymentForm.status}
                  onValueChange={(v) =>
                    setPaymentForm((f) => ({ ...f, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                Observações{" "}
                <span className="text-xs text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Textarea
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
                placeholder="PIX, boleto, etc."
              />
            </div>
            {paymentForm.status === "paid" && (
              <p className="text-xs text-muted-foreground">
                Pagamento pago renova a assinatura por um ciclo do plano,
                emendando no fim do período atual — ou a partir de hoje, se
                estiver vencida.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!paymentForm.amount || paymentMutation.isPending}
              onClick={() =>
                sub &&
                paymentMutation.mutate({
                  subscriptionId: sub.id,
                  amount: paymentForm.amount,
                  status: paymentForm.status as "paid" | "failed" | "refunded",
                  notes: paymentForm.notes || undefined,
                })
              }
            >
              {paymentMutation.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
