import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  Building2,
  CheckCircle2,
  Cloud,
  CreditCard,
  DollarSign,
  FileText,
  History,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { orpc } from "@/lib/orpc";
import { OwnersTab } from "@/pages/admin/OwnersTab";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  trial: { label: "Trial", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  suspended: { label: "Suspenso", variant: "outline" },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Painel de Administração
        </h1>
        <p className="text-muted-foreground text-sm">
          Gerencie domínios, usuários, planos e assinaturas do sistema.
        </p>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="tenants" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="owners" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Donos
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Assinaturas
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tenants" className="mt-4">
          <TenantsTab />
        </TabsContent>
        <TabsContent value="owners" className="mt-4">
          <OwnersTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansTab />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── TenantsTab ────────────────────────────────────────────────────────────────
function TenantsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { selectTenant } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [form, setForm] = useState({
    name: "",
    slug: "",
    planId: "",
    trialDays: "14",
  });

  const { data: tenants = [], isLoading } = useQuery(
    orpc.admin.tenant.list.queryOptions({ input: {} }),
  );
  const { data: plans = [] } = useQuery(
    orpc.admin.plan.list.queryOptions({ input: {} }),
  );

  const invalidate = () =>
    qc.invalidateQueries(orpc.admin.tenant.list.queryOptions({ input: {} }));

  const createMutation = useMutation({
    ...orpc.admin.tenant.create.mutationOptions(),
    onSuccess: async () => {
      toast.success("Domínio criado!");
      setCreateOpen(false);
      setForm({ name: "", slug: "", planId: "", trialDays: "14" });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    ...orpc.admin.tenant.update.mutationOptions(),
    onSuccess: async () => {
      toast.success("Domínio atualizado!");
      setEditRow(null);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    ...orpc.admin.tenant.update.mutationOptions(),
    onSuccess: async () => {
      toast.success("Status do domínio alterado!");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const appToggleMutation = useMutation({
    ...orpc.admin.tenant.update.mutationOptions(),
    onSuccess: async (t) => {
      toast.success(
        t.hasDedicatedApp
          ? "Rede marcada como app dedicado."
          : "Rede voltou para o app guarda-chuva.",
      );
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          Domínios{!isLoading && ` (${tenants.length})`}
        </CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo domínio
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>App</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  <Spinner className="mx-auto size-10" />
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  Nenhum domínio cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {t.slug}
                  </TableCell>
                  <TableCell>
                    {t.hasDedicatedApp ? (
                      <Badge variant="outline" className="gap-1">
                        <Smartphone className="h-3 w-3" />
                        Dedicado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Cloud className="h-3 w-3" />
                        Guarda-chuva
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "default" : "secondary"}>
                      {t.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            selectTenant({ id: t.id, name: t.name });
                            navigate("/dashboard");
                          }}
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Gerenciar rede
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setEditRow({ id: t.id, name: t.name })}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar nome
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            appToggleMutation.mutate({
                              id: t.id,
                              hasDedicatedApp: !t.hasDedicatedApp,
                            })
                          }
                        >
                          {t.hasDedicatedApp ? (
                            <>
                              <Cloud className="mr-2 h-4 w-4" />
                              Voltar ao guarda-chuva
                            </>
                          ) : (
                            <>
                              <Smartphone className="mr-2 h-4 w-4" />
                              Marcar como app dedicado
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            toggleMutation.mutate({
                              id: t.id,
                              isActive: !t.isActive,
                            })
                          }
                        >
                          {t.isActive ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo domínio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Rede Exemplo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Slug{" "}
                <span className="text-muted-foreground text-xs">
                  (opcional)
                </span>
              </Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="gerado automaticamente"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Plano inicial{" "}
                <span className="text-muted-foreground text-xs">
                  (opcional)
                </span>
              </Label>
              <Select
                value={form.planId}
                onValueChange={(v) => setForm((f) => ({ ...f, planId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem plano" />
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
            {form.planId && (
              <div className="space-y-1.5">
                <Label>Dias de trial</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.trialDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, trialDays: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.name.trim() || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  name: form.name.trim(),
                  slug: form.slug.trim() || undefined,
                  planId: form.planId || undefined,
                  trialDays: Number(form.trialDays),
                })
              }
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar domínio</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={editRow.name}
                onChange={(e) =>
                  setEditRow((r) => (r ? { ...r, name: e.target.value } : r))
                }
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editRow?.name.trim() || updateMutation.isPending}
              onClick={() =>
                editRow &&
                updateMutation.mutate({
                  id: editRow.id,
                  name: editRow.name.trim(),
                })
              }
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── UsersTab ──────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [banDialog, setBanDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [assignDialog, setAssignDialog] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [assignTenantId, setAssignTenantId] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const { data: users = [], isLoading } = useQuery(
    orpc.admin.user.list.queryOptions({
      input: tenantFilter ? { tenantId: tenantFilter } : {},
    }),
  );
  const { data: tenants = [] } = useQuery(
    orpc.admin.tenant.list.queryOptions({ input: {} }),
  );

  const invalidate = () =>
    qc.invalidateQueries(orpc.admin.user.list.queryOptions({ input: {} }));

  const createMutation = useMutation({
    ...orpc.admin.user.create.mutationOptions(),
    onSuccess: async () => {
      toast.success("Usuário criado!");
      setCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", role: "user" });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const banMutation = useMutation({
    ...orpc.admin.user.ban.mutationOptions(),
    onSuccess: async () => {
      toast.success("Usuário banido.");
      setBanDialog(null);
      setBanReason("");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unbanMutation = useMutation({
    ...orpc.admin.user.unban.mutationOptions(),
    onSuccess: async () => {
      toast.success("Ban removido.");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    ...orpc.admin.user.delete.mutationOptions(),
    onSuccess: async () => {
      toast.success("Usuário excluído.");
      setDeleteDialog(null);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMutation = useMutation({
    ...orpc.admin.user.assignToTenant.mutationOptions(),
    onSuccess: async () => {
      toast.success("Usuário associado ao domínio!");
      setAssignDialog(null);
      setAssignTenantId("");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    ...orpc.admin.user.removeFromTenant.mutationOptions(),
    onSuccess: async () => {
      toast.success("Usuário removido do domínio.");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // user.list com tenantId retorna shape diferente (membershipId, userId, etc.)
  const isMembershipView = !!tenantFilter;
  const rows = users as any[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="text-base">
          Usuários{!isLoading && ` (${rows.length})`}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por domínio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os usuários</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo usuário
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              {isMembershipView && <TableHead>Papel</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  <Spinner className="mx-auto size-10" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => {
                const userId = isMembershipView ? u.userId : u.id;
                const name = u.name;
                const banned = u.banned;
                return (
                  <TableRow key={userId}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email}
                    </TableCell>
                    {isMembershipView && (
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {u.membershipRole}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        className={banned && "text-white"}
                        variant={banned ? "destructive" : "secondary"}
                      >
                        {banned ? "Banido" : "Ativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!isMembershipView && (
                            <DropdownMenuItem
                              onClick={() =>
                                setAssignDialog({ id: userId, name })
                              }
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Associar a domínio
                            </DropdownMenuItem>
                          )}
                          {isMembershipView && (
                            <DropdownMenuItem
                              onClick={() =>
                                removeMutation.mutate({
                                  userId,
                                  tenantId: tenantFilter,
                                })
                              }
                              className="text-destructive"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remover do domínio
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {banned ? (
                            <DropdownMenuItem
                              onClick={() => unbanMutation.mutate({ userId })}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Remover ban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setBanDialog({ id: userId, name })}
                              className="text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Banir usuário
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setDeleteDialog({ id: userId, name })
                            }
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Criar usuário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="joao@exemplo.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Senha *{" "}
                <span className="text-muted-foreground text-xs">
                  (mínimo 8 caracteres)
                </span>
              </Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !createForm.name.trim() ||
                !createForm.email.trim() ||
                createForm.password.length < 8 ||
                createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  name: createForm.name.trim(),
                  email: createForm.email.trim(),
                  password: createForm.password,
                  role: createForm.role as "user" | "admin",
                })
              }
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban dialog */}
      <Dialog
        open={!!banDialog}
        onOpenChange={() => {
          setBanDialog(null);
          setBanReason("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Banir {banDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>
              Motivo{" "}
              <span className="text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Violação dos termos de uso..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBanDialog(null);
                setBanReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={banMutation.isPending}
              onClick={() =>
                banDialog &&
                banMutation.mutate({
                  userId: banDialog.id,
                  reason: banReason || undefined,
                })
              }
            >
              {banMutation.isPending ? "Banindo..." : "Banir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir {deleteDialog?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação é irreversível. O usuário, suas sessões e vínculos com
            domínios serão permanentemente removidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteDialog &&
                deleteMutation.mutate({ userId: deleteDialog.id })
              }
            >
              {deleteMutation.isPending
                ? "Excluindo..."
                : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog
        open={!!assignDialog}
        onOpenChange={() => {
          setAssignDialog(null);
          setAssignTenantId("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Associar {assignDialog?.name} a um domínio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Domínio</Label>
            <Select value={assignTenantId} onValueChange={setAssignTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um domínio" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialog(null);
                setAssignTenantId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!assignTenantId || assignMutation.isPending}
              onClick={() =>
                assignDialog &&
                assignMutation.mutate({
                  userId: assignDialog.id,
                  tenantId: assignTenantId,
                  role: "owner",
                })
              }
            >
              {assignMutation.isPending ? "Associando..." : "Associar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── PlansTab ──────────────────────────────────────────────────────────────────
function PlansTab() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    interval: "monthly",
    description: "",
    maxStations: "",
  });

  const { data: plans = [], isLoading } = useQuery(
    orpc.admin.plan.list.queryOptions({ input: {} }),
  );

  const invalidate = () =>
    qc.invalidateQueries(orpc.admin.plan.list.queryOptions({ input: {} }));

  const createMutation = useMutation({
    ...orpc.admin.plan.create.mutationOptions(),
    onSuccess: async () => {
      toast.success("Plano criado!");
      setCreateOpen(false);
      setForm({
        name: "",
        price: "",
        interval: "monthly",
        description: "",
        maxStations: "",
      });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    ...orpc.admin.plan.update.mutationOptions(),
    onSuccess: async () => {
      toast.success("Plano atualizado!");
      setEditRow(null);
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    ...orpc.admin.plan.update.mutationOptions(),
    onSuccess: async () => {
      toast.success("Status alterado!");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">
          Planos{!isLoading && ` (${plans.length})`}
        </CardTitle>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo plano
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Max. postos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  <Spinner className="mx-auto size-10" />
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  Nenhum plano cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.name}
                    {p.description && (
                      <p className="text-xs text-muted-foreground font-normal">
                        {p.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{fmtBRL(p.price)}</TableCell>
                  <TableCell>
                    {p.interval === "monthly" ? "Mensal" : "Anual"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.maxStations ?? "Ilimitado"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.isActive ? "default" : "secondary"}>
                      {p.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditRow(p)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            toggleMutation.mutate({
                              id: p.id,
                              isActive: !p.isActive,
                            })
                          }
                        >
                          {p.isActive ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Básico"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="99.90"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Intervalo</Label>
                <Select
                  value={form.interval}
                  onValueChange={(v) => setForm((f) => ({ ...f, interval: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Máx. postos{" "}
                  <span className="text-muted-foreground text-xs">
                    (opcional)
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxStations}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxStations: e.target.value }))
                  }
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>
                  Descrição{" "}
                  <span className="text-muted-foreground text-xs">
                    (opcional)
                  </span>
                </Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Ideal para pequenas redes"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !form.name.trim() || !form.price || createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  name: form.name.trim(),
                  price: form.price,
                  interval: form.interval as "monthly" | "yearly",
                  description: form.description || undefined,
                  maxStations: form.maxStations
                    ? Number(form.maxStations)
                    : undefined,
                })
              }
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar plano</DialogTitle>
          </DialogHeader>
          {editRow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nome</Label>
                  <Input
                    value={editRow.name}
                    onChange={(e) =>
                      setEditRow((r: any) => ({ ...r, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (R$)</Label>
                  <Input
                    value={editRow.price}
                    onChange={(e) =>
                      setEditRow((r: any) => ({ ...r, price: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Máx. postos</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editRow.maxStations ?? ""}
                    onChange={(e) =>
                      setEditRow((r: any) => ({
                        ...r,
                        maxStations: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="Ilimitado"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Descrição</Label>
                  <Input
                    value={editRow.description ?? ""}
                    onChange={(e) =>
                      setEditRow((r: any) => ({
                        ...r,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!editRow?.name.trim() || updateMutation.isPending}
              onClick={() =>
                editRow &&
                updateMutation.mutate({
                  id: editRow.id,
                  name: editRow.name.trim(),
                  price: editRow.price,
                  description: editRow.description || undefined,
                  maxStations: editRow.maxStations || undefined,
                })
              }
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── SubscriptionsTab ──────────────────────────────────────────────────────────
function SubscriptionsTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tenantFilter, setTenantFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [changePlanRow, setChangePlanRow] = useState<any>(null);
  const [paymentRow, setPaymentRow] = useState<any>(null);
  const [historyRow, setHistoryRow] = useState<any>(null);
  const [createForm, setCreateForm] = useState({
    tenantId: "",
    planId: "",
    status: "active",
    trialDays: "0",
  });
  const [changePlanId, setChangePlanId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    status: "paid",
    notes: "",
  });

  const { data: subs = [], isLoading } = useQuery(
    orpc.subscription.list.queryOptions({
      input: tenantFilter ? { tenantId: tenantFilter } : {},
    }),
  );
  const { data: tenants = [] } = useQuery(
    orpc.admin.tenant.list.queryOptions({ input: {} }),
  );
  const { data: plans = [] } = useQuery(
    orpc.admin.plan.list.queryOptions({ input: {} }),
  );

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    ...orpc.subscription.payments.queryOptions({
      input: { subscriptionId: historyRow?.id ?? "" },
    }),
    enabled: !!historyRow,
  });

  const invalidate = () =>
    qc.invalidateQueries(
      orpc.subscription.list.queryOptions({ input: {} }),
    );

  const createMutation = useMutation({
    ...orpc.subscription.create.mutationOptions(),
    onSuccess: async () => {
      toast.success("Assinatura criada!");
      setCreateOpen(false);
      setCreateForm({
        tenantId: "",
        planId: "",
        status: "active",
        trialDays: "0",
      });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePlanMutation = useMutation({
    ...orpc.subscription.changePlan.mutationOptions(),
    onSuccess: async () => {
      toast.success("Plano alterado!");
      setChangePlanRow(null);
      setChangePlanId("");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    ...orpc.subscription.cancel.mutationOptions(),
    onSuccess: async () => {
      toast.success("Assinatura cancelada.");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewMutation = useMutation({
    ...orpc.subscription.renew.mutationOptions(),
    onSuccess: async () => {
      toast.success("Assinatura renovada!");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const paymentMutation = useMutation({
    ...orpc.subscription.recordPayment.mutationOptions(),
    onSuccess: async () => {
      toast.success("Pagamento registrado!");
      setPaymentRow(null);
      setPaymentForm({ amount: "", status: "paid", notes: "" });
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const suspendMutation = useMutation({
    ...orpc.subscription.suspend.mutationOptions(),
    onSuccess: async () => {
      toast.success("Assinatura suspensa.");
      await invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
        <CardTitle className="text-base">
          Assinaturas{!isLoading && ` (${subs.length})`}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Filtrar por domínio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domínio</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Último pagamento</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  <Spinner className="mx-auto size-10" />
                </TableCell>
              </TableRow>
            ) : subs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground text-sm"
                >
                  Nenhuma assinatura encontrada.
                </TableCell>
              </TableRow>
            ) : (
              subs.map((s) => {
                const st = subStatusMap[s.status] ?? {
                  label: s.status,
                  variant: "outline" as const,
                };
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => navigate(`/assinaturas/${s.id}`)}
                      >
                        {s.tenantName}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span>{s.planName}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {fmtBRL(s.planPrice)}/
                        {s.planInterval === "monthly" ? "mês" : "ano"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        {s.isOverdue && (
                          <Badge variant="destructive">Vencida</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(s.currentPeriodStart)} –{" "}
                      {fmtDate(s.currentPeriodEnd)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.lastPaidAt ? fmtDate(s.lastPaidAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/assinaturas/${s.id}`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Gerenciar assinatura
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setChangePlanRow(s);
                              setChangePlanId(s.planId);
                            }}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            Mudar plano
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPaymentRow(s);
                              setPaymentForm({
                                amount: s.planPrice,
                                status: "paid",
                                notes: "",
                              });
                            }}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Registrar pagamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHistoryRow(s)}>
                            <History className="mr-2 h-4 w-4" />
                            Ver histórico
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(s.status !== "active" || s.isOverdue) && (
                            <DropdownMenuItem
                              onClick={() =>
                                renewMutation.mutate({ subscriptionId: s.id })
                              }
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Renovar (cortesia)
                            </DropdownMenuItem>
                          )}
                          {(s.status === "active" || s.status === "trial") && (
                            <DropdownMenuItem
                              onClick={() =>
                                suspendMutation.mutate({ subscriptionId: s.id })
                              }
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspender
                            </DropdownMenuItem>
                          )}
                          {s.status !== "cancelled" && (
                            <DropdownMenuItem
                              onClick={() =>
                                cancelMutation.mutate({ subscriptionId: s.id })
                              }
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Criar assinatura */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Domínio *</Label>
              <Select
                value={createForm.tenantId}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, tenantId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <Select
                value={createForm.planId}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, planId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {plans
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {fmtBRL(p.price)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status inicial</Label>
                <Select
                  value={createForm.status}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {createForm.status === "trial" && (
                <div className="space-y-1.5">
                  <Label>Dias de trial</Label>
                  <Input
                    type="number"
                    min="1"
                    value={createForm.trialDays}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        trialDays: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !createForm.tenantId ||
                !createForm.planId ||
                createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  tenantId: createForm.tenantId,
                  planId: createForm.planId,
                  status: createForm.status as "trial" | "active",
                  trialDays: Number(createForm.trialDays),
                })
              }
            >
              {createMutation.isPending ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mudar plano */}
      <Dialog
        open={!!changePlanRow}
        onOpenChange={() => {
          setChangePlanRow(null);
          setChangePlanId("");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mudar plano — {changePlanRow?.tenantName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Novo plano</Label>
            <Select value={changePlanId} onValueChange={setChangePlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {plans
                  .filter((p) => p.isActive)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {fmtBRL(p.price)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePlanRow(null);
                setChangePlanId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!changePlanId || changePlanMutation.isPending}
              onClick={() =>
                changePlanRow &&
                changePlanMutation.mutate({
                  subscriptionId: changePlanRow.id,
                  planId: changePlanId,
                })
              }
            >
              {changePlanMutation.isPending ? "Salvando..." : "Alterar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar pagamento */}
      <Dialog
        open={!!paymentRow}
        onOpenChange={() => {
          setPaymentRow(null);
          setPaymentForm({ amount: "", status: "paid", notes: "" });
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Registrar pagamento — {paymentRow?.tenantName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input
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
                <span className="text-muted-foreground text-xs">
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
                Pagamento pago renova a assinatura por um ciclo do plano
                (mensal ou anual), emendando no fim do período atual — ou a
                partir de hoje, se estiver vencida.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPaymentRow(null);
                setPaymentForm({ amount: "", status: "paid", notes: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!paymentForm.amount || paymentMutation.isPending}
              onClick={() =>
                paymentRow &&
                paymentMutation.mutate({
                  subscriptionId: paymentRow.id,
                  amount: paymentForm.amount,
                  status: paymentForm.status as "paid" | "failed" | "refunded",
                  notes: paymentForm.notes || undefined,
                })
              }
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico de pagamentos */}
      <Dialog open={!!historyRow} onOpenChange={() => setHistoryRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Histórico de pagamentos — {historyRow?.tenantName}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground text-sm"
                    >
                      <Spinner className="mx-auto size-10" />
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground text-sm"
                    >
                      Nenhum pagamento registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((pay: any) => {
                    const payStatusMap: Record<
                      string,
                      {
                        label: string;
                        variant: "default" | "destructive" | "secondary";
                      }
                    > = {
                      paid: { label: "Pago", variant: "default" },
                      failed: { label: "Falhou", variant: "destructive" },
                      refunded: { label: "Reembolsado", variant: "secondary" },
                    };
                    const st = payStatusMap[pay.status] ?? {
                      label: pay.status,
                      variant: "secondary" as const,
                    };
                    return (
                      <TableRow key={pay.id}>
                        <TableCell className="text-sm">
                          {fmtDate(pay.paidAt ?? pay.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {fmtBRL(pay.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pay.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryRow(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
