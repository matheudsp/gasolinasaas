import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  CheckCircle2,
  Send,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Destino do deep link ao tocar na notificação (espelha a união do server).
type NotificationKind = "generic" | "promotion" | "points";

const kindLabels: Record<NotificationKind, string> = {
  generic: "Genérica (abre as notificações)",
  promotion: "Promoção (abre um posto)",
  points: "Pontos (abre a tela de pontos)",
};

/** Rótulo do destino para o histórico, a partir do dataJson persistido. */
function destinationLabel(dataJson: string | null): string {
  if (!dataJson) return "—";
  try {
    const data = JSON.parse(dataJson) as { type?: string };
    if (data.type === "promotion") return "Posto";
    if (data.type === "points") return "Pontos";
    return "—";
  } catch {
    return "—";
  }
}

/** Reconstrói o destino (kind + posto) do dataJson para reenviar no formulário. */
function parseDestination(dataJson: string | null): {
  kind: NotificationKind;
  stationId: string;
} {
  if (!dataJson) return { kind: "generic", stationId: "" };
  try {
    const d = JSON.parse(dataJson) as { type?: string; stationId?: string };
    if (d.type === "promotion") {
      return { kind: "promotion", stationId: d.stationId ?? "" };
    }
    if (d.type === "points") return { kind: "points", stationId: "" };
    return { kind: "generic", stationId: "" };
  } catch {
    return { kind: "generic", stationId: "" };
  }
}

const statusMap: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  sent: {
    label: "Enviado",
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  partial: {
    label: "Parcial",
    variant: "secondary",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  failed: {
    label: "Falhou",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PushNotificationsPage() {
  const qc = useQueryClient();
  const { activeTenant } = useAuth();

  // Aguarda o tenant ativo (membership do owner ou rede selecionada pelo
  // admin) antes de disparar as queries, assim o x-tenant-id já vai no header.
  const enabled = !!activeTenant;

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<NotificationKind>("generic");
  const [stationId, setStationId] = useState("");

  // Queries
  const { data: tokens = [], isLoading: tokensLoading } = useQuery(
    orpc.push.listTokens.queryOptions({ enabled }),
  );

  const { data: stations = [] } = useQuery(
    orpc.station.search.queryOptions({ input: {}, enabled }),
  );

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery(
      orpc.push.listNotifications.queryOptions({
        input: { limit: 50 },
        enabled,
      }),
    );

  // Envio selecionado no histórico → detalhes + reenviar.
  const [selected, setSelected] = useState<
    (typeof notifications)[number] | null
  >(null);

  // Reenviar = pré-preenche o formulário com o conteúdo do envio e deixa o
  // owner revisar antes de disparar (evita re-blast acidental para todos).
  const handleResend = (n: (typeof notifications)[number]) => {
    const dest = parseDestination(n.dataJson);
    setTitle(n.title);
    setBody(n.body);
    setKind(dest.kind);
    setStationId(dest.stationId);
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("Conteúdo carregado no formulário. Revise e envie novamente.");
  };

  // Send mutation
  const sendMutation = useMutation({
    ...orpc.push.send.mutationOptions(),
    onSuccess: (result) => {
      toast.success(
        `Notificação enviada! ${result.successCount}/${result.recipientCount} dispositivos alcançados.`,
      );
      setTitle("");
      setBody("");
      setKind("generic");
      setStationId("");
      qc.invalidateQueries(
        orpc.push.listNotifications.queryOptions({ input: { limit: 50 } }),
      );
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar: ${err.message}`);
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.warning("Preencha o título e a mensagem antes de enviar.");
      return;
    }
    if (kind === "promotion" && !stationId) {
      toast.warning("Escolha o posto da promoção antes de enviar.");
      return;
    }
    sendMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      data:
        kind === "promotion"
          ? { type: "promotion", stationId }
          : kind === "points"
            ? { type: "points" }
            : undefined,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Push Notifications
        </h1>
        <p className="text-muted-foreground text-sm">
          Envie promoções e mensagens personalizadas para os usuários do seu
          app.
        </p>
      </div>

      {/* ── Compose ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Nova Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="notif-title">Título</Label>
            <Input
              id="notif-title"
              placeholder="Ex: 🔥 Promoção especial hoje!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={sendMutation.isPending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notif-body">Mensagem</Label>
            <Textarea
              id="notif-body"
              placeholder="Ex: Gasolina comum a R$ 5,49 até hoje às 20h no Posto Martinez!"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={300}
              disabled={sendMutation.isPending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length}/300
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ao tocar, abrir</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as NotificationKind)}
                disabled={sendMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(kindLabels) as NotificationKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {kindLabels[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kind === "promotion" && (
              <div className="space-y-1.5">
                <Label>Posto da promoção</Label>
                <Select
                  value={stationId}
                  onValueChange={setStationId}
                  disabled={sendMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o posto" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              {tokensLoading ? (
                <span className="flex items-center gap-1">
                  <Spinner className="size-3" /> carregando...
                </span>
              ) : (
                <span>
                  <strong className="text-foreground">{tokens.length}</strong>{" "}
                  dispositivo
                  {tokens.length !== 1 ? "s" : ""} registrado
                  {tokens.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={
                sendMutation.isPending ||
                tokens.length === 0 ||
                !title.trim() ||
                !body.trim()
              }
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar para todos
                </>
              )}
            </Button>
          </div>

          {tokens.length === 0 && !tokensLoading && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Nenhum dispositivo registrado ainda. Os usuários precisam abrir o
              app e aceitar as notificações.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── History ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Histórico de Envios
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Clique em um envio para ver os detalhes e reenviar.
          </p>
        </CardHeader>
        <CardContent>
          {notificationsLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação enviada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => {
                  const s = statusMap[n.status] ?? statusMap.sent;
                  return (
                    <TableRow
                      key={n.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(n)}
                    >
                      <TableCell className="font-medium max-w-[160px] truncate">
                        {n.title}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground text-sm">
                        {n.body}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {destinationLabel(n.dataJson)}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {n.successCount}/{n.recipientCount}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {n.failureCount > 0 ? (
                          <span className="text-destructive">
                            {n.failureCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.variant} className="gap-1 text-xs">
                          {s.icon}
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDateTime(n.sentAt ?? n.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Detalhe de um envio + reenviar ──────────────────────────────── */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do envio</DialogTitle>
            <DialogDescription>
              {selected ? fmtDateTime(selected.sentAt ?? selected.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {selected &&
            (() => {
              const s = statusMap[selected.status] ?? statusMap.sent;
              const dest = parseDestination(selected.dataJson);
              const stationName =
                dest.kind === "promotion"
                  ? (stations.find((st) => st.id === dest.stationId)?.name ??
                    "posto removido")
                  : null;
              return (
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-4">
                    <p className="font-semibold">{selected.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.body}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant={s.variant} className="mt-1 gap-1 text-xs">
                        {s.icon}
                        {s.label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Ao tocar, abre
                      </p>
                      <p className="mt-1 font-medium">
                        {kindLabels[dest.kind]}
                        {stationName ? ` — ${stationName}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Dispositivos alcançados
                      </p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {selected.successCount}/{selected.recipientCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                      <p className="mt-1 font-semibold tabular-nums">
                        {selected.failureCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end border-t pt-4">
                    <Button
                      className="gap-2"
                      onClick={() => handleResend(selected)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Reenviar
                    </Button>
                  </div>
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
