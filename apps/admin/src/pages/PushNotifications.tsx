import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Bell, CheckCircle2, Send, XCircle, AlertTriangle, Clock,
} from "lucide-react"
import { orpc } from "@/lib/orpc"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  sent:    { label: "Enviado",   variant: "default",     icon: <CheckCircle2 className="h-3 w-3" /> },
  partial: { label: "Parcial",   variant: "secondary",   icon: <AlertTriangle className="h-3 w-3" /> },
  failed:  { label: "Falhou",    variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PushNotificationsPage() {
  const qc = useQueryClient()
  const { membership } = useAuth()

  // Aguarda o membership estar disponível antes de disparar as queries,
  // assim o activeTenantId já está setado no cliente ORPC.
  const enabled = !!membership?.tenantId

  // Form state
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  // Queries
  const { data: tokens = [], isLoading: tokensLoading } = useQuery(
    orpc.push.listTokens.queryOptions({ enabled }),
  )

  const { data: notifications = [], isLoading: notificationsLoading } = useQuery(
    orpc.push.listNotifications.queryOptions({ input: { limit: 50 }, enabled }),
  )

  // Send mutation
  const sendMutation = useMutation({
    ...orpc.push.send.mutationOptions(),
    onSuccess: (result) => {
      toast.success(
        `Notificação enviada! ${result.successCount}/${result.recipientCount} dispositivos alcançados.`,
      )
      setTitle("")
      setBody("")
      qc.invalidateQueries(orpc.push.listNotifications.queryOptions({ input: { limit: 50 } }))
    },
    onError: (err: Error) => {
      toast.error(`Erro ao enviar: ${err.message}`)
    },
  })

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.warning("Preencha o título e a mensagem antes de enviar.")
      return
    }
    sendMutation.mutate({ title: title.trim(), body: body.trim() })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Push Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Envie promoções e mensagens personalizadas para os usuários do seu app.
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
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
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
            <p className="text-xs text-muted-foreground text-right">{body.length}/300</p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              {tokensLoading ? (
                <span className="flex items-center gap-1"><Spinner className="size-3" /> carregando...</span>
              ) : (
                <span>
                  <strong className="text-foreground">{tokens.length}</strong> dispositivo
                  {tokens.length !== 1 ? "s" : ""} registrado{tokens.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || tokens.length === 0 || !title.trim() || !body.trim()}
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <><Spinner className="size-4" />Enviando...</>
              ) : (
                <><Send className="h-4 w-4" />Enviar para todos</>
              )}
            </Button>
          </div>

          {tokens.length === 0 && !tokensLoading && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Nenhum dispositivo registrado ainda. Os usuários precisam abrir o app e aceitar as notificações.
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
                  <TableHead className="text-center">Enviados</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => {
                  const s = statusMap[n.status] ?? statusMap.sent
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium max-w-[160px] truncate">
                        {n.title}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-muted-foreground text-sm">
                        {n.body}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {n.successCount}/{n.recipientCount}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {n.failureCount > 0 ? (
                          <span className="text-destructive">{n.failureCount}</span>
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
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
