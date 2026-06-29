import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  UserCheck,
  CreditCard,
  Users,
  Building2,
  Package,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";


const tenantFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().optional(),
  planId: z.string().optional(),
  trialDays: z.number().int().min(0),
  isActive: z.boolean().optional(),
});
type TenantForm = z.infer<typeof tenantFormSchema>;

const planFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Preço inválido (ex: 29.90)"),
  interval: z.enum(["monthly", "yearly"]),
  description: z.string().optional(),
  maxStations: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});
type PlanForm = z.infer<typeof planFormSchema>;

const subscriptionFormSchema = z.object({
  tenantId: z.string().min(1, "Selecione um domínio"),
  planId: z.string().min(1, "Selecione um plano"),
  status: z.enum(["trial", "active"]),
  trialDays: z.number().int().min(0),
});
type SubscriptionForm = z.infer<typeof subscriptionFormSchema>;

const assignUserSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
});
type AssignUserForm = z.infer<typeof assignUserSchema>;

const paymentFormSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor inválido"),
  status: z.enum(["paid", "failed", "refunded"]),
  notes: z.string().optional(),
  externalId: z.string().optional(),
});
type PaymentForm = z.infer<typeof paymentFormSchema>;


export default function AdminDashboard() {
  const {isAdmin} = useAuth();
    if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"tenants" | "users" | "plans" | "subscriptions">("tenants");

  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedSubForPayment, setSelectedSubForPayment] = useState<any>(null);

  const [paymentsDialogOpen, setPaymentsDialogOpen] = useState(false);
  const [selectedSubForPayments, setSelectedSubForPayments] = useState<string | null>(null);

  // QUERIES
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery(
    orpc.admin.tenant.list.queryOptions({ input: {} })
  );

  const { data: plans = [], isLoading: plansLoading } = useQuery(
    orpc.admin.plan.list.queryOptions({ input: {} })
  );

  const { data: users = [], isLoading: usersLoading } = useQuery(
    orpc.admin.user.list.queryOptions({ input: {}  })
  );

  const { data: subscriptions = [], isLoading: subsLoading } = useQuery(
    orpc.admin.subscription.list.queryOptions({ input: {} })
  );

  const { data: payments = [], isLoading: paymentsLoading } = useQuery(
    orpc.admin.subscription.payments.queryOptions({
      input: { subscriptionId: selectedSubForPayments || "" },
      enabled: !!selectedSubForPayments && paymentsDialogOpen,
    })
  );

  // FORMS
  const tenantForm = useForm<TenantForm>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: { name: "", slug: "", planId: "", trialDays: 14, isActive: true },
  });

  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planFormSchema),
    defaultValues: { name: "", slug: "", price: "", interval: "monthly", description: "", maxStations: undefined, isActive: true },
  });

  const subscriptionForm = useForm<SubscriptionForm>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: { tenantId: "", planId: "", status: "active", trialDays: 0 },
  });

  const assignForm = useForm<AssignUserForm>({
    resolver: zodResolver(assignUserSchema),
    defaultValues: { userId: "", tenantId: "" },
  });

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { amount: "", status: "paid", notes: "", externalId: "" },
  });

  // MUTATIONS (mesmo padrão anterior)
  const createTenantMutation = useMutation(
    orpc.admin.tenant.create.mutationOptions({
      onSuccess: () => {
        toast.success("Domínio criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.tenant.list.queryKey({ input: {} }) });
        setTenantDialogOpen(false);
        tenantForm.reset();
        setEditingTenant(null);
      },
      onError: (error: any) => toast.error(error.message || "Erro ao criar domínio"),
    })
  );

  const updateTenantMutation = useMutation(
    orpc.admin.tenant.update.mutationOptions({
      onSuccess: () => {
        toast.success("Domínio atualizado!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.tenant.list.queryKey({ input: {} }) });
        setTenantDialogOpen(false);
        tenantForm.reset();
        setEditingTenant(null);
      },
      onError: (error: any) => toast.error(error.message || "Erro ao atualizar"),
    })
  );

  const deleteTenantMutation = useMutation(
    orpc.admin.tenant.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Domínio desativado");
        queryClient.invalidateQueries({ queryKey: orpc.admin.tenant.list.queryKey({ input: {} }) });
      },
      onError: (error: any) => toast.error(error.message || "Erro ao desativar"),
    })
  );

  const createPlanMutation = useMutation(
    orpc.admin.plan.create.mutationOptions({
      onSuccess: () => {
        toast.success("Plano criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.plan.list.queryKey({ input: {} }) });
        setPlanDialogOpen(false);
        planForm.reset();
        setEditingPlan(null);
      },
      onError: (error: any) => toast.error(error.message || "Erro ao criar plano"),
    })
  );

  const updatePlanMutation = useMutation(
    orpc.admin.plan.update.mutationOptions({
      onSuccess: () => {
        toast.success("Plano atualizado!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.plan.list.queryKey({ input: {} }) });
        setPlanDialogOpen(false);
        planForm.reset();
        setEditingPlan(null);
      },
      onError: (error: any) => toast.error(error.message || "Erro ao atualizar plano"),
    })
  );

  const banUserMutation = useMutation(
    orpc.admin.user.ban.mutationOptions({
      onSuccess: () => {
        toast.success("Usuário banido");
        queryClient.invalidateQueries({ queryKey: orpc.admin.user.list.queryKey({ input: {} }) });
      },
      onError: (error: any) => toast.error(error.message || "Erro ao banir"),
    })
  );

  const unbanUserMutation = useMutation(
    orpc.admin.user.unban.mutationOptions({
      onSuccess: () => {
        toast.success("Usuário desbanido");
        queryClient.invalidateQueries({ queryKey: orpc.admin.user.list.queryKey({ input: {} }) });
      },
      onError: (error: any) => toast.error(error.message || "Erro ao desbanir"),
    })
  );

  const assignUserMutation = useMutation(
    orpc.admin.user.assignToTenant.mutationOptions({
      onSuccess: () => {
        toast.success("Usuário associado ao domínio!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.user.list.queryKey({ input: {} }) });
        setAssignDialogOpen(false);
        assignForm.reset();
      },
      onError: (error: any) => toast.error(error.message || "Erro ao associar"),
    })
  );

  const createSubscriptionMutation = useMutation(
    orpc.admin.subscription.create.mutationOptions({
      onSuccess: () => {
        toast.success("Assinatura criada!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.subscription.list.queryKey({ input: {} }) });
        setSubscriptionDialogOpen(false);
        subscriptionForm.reset();
      },
      onError: (error: any) => toast.error(error.message || "Erro ao criar assinatura"),
    })
  );

  const changePlanMutation = useMutation(
    orpc.admin.subscription.changePlan.mutationOptions({
      onSuccess: () => {
        toast.success("Plano alterado com sucesso!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.subscription.list.queryKey({ input: {} }) });
      },
      onError: (error: any) => toast.error(error.message || "Erro ao alterar plano"),
    })
  );

  const cancelSubscriptionMutation = useMutation(
    orpc.admin.subscription.cancel.mutationOptions({
      onSuccess: () => {
        toast.success("Assinatura cancelada");
        queryClient.invalidateQueries({ queryKey: orpc.admin.subscription.list.queryKey({ input: {} }) });
      },
      onError: (error: any) => toast.error(error.message || "Erro ao cancelar"),
    })
  );

  const renewSubscriptionMutation = useMutation(
    orpc.admin.subscription.renew.mutationOptions({
      onSuccess: () => {
        toast.success("Assinatura renovada!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.subscription.list.queryKey({ input: {} }) });
      },
      onError: (error: any) => toast.error(error.message || "Erro ao renovar"),
    })
  );

  const recordPaymentMutation = useMutation(
    orpc.admin.subscription.recordPayment.mutationOptions({
      onSuccess: () => {
        toast.success("Pagamento registrado!");
        queryClient.invalidateQueries({ queryKey: orpc.admin.subscription.list.queryKey({ input: {} }) });
        if (selectedSubForPayment) {
          queryClient.invalidateQueries({
            queryKey: orpc.admin.subscription.payments.queryKey({ input: { subscriptionId: selectedSubForPayment.id } }),
          });
        }
        setPaymentDialogOpen(false);
        paymentForm.reset();
      },
      onError: (error: any) => toast.error(error.message || "Erro ao registrar pagamento"),
    })
  );

  // HANDLERS
  const openCreateTenant = () => {
    setEditingTenant(null);
    tenantForm.reset({ name: "", slug: "", planId: "", trialDays: 14, isActive: true });
    setTenantDialogOpen(true);
  };

  const openEditTenant = (tenant: any) => {
    setEditingTenant(tenant);
    tenantForm.reset({
      name: tenant.name,
      slug: tenant.slug,
      planId: "",
      trialDays: 0,
      isActive: tenant.isActive,
    });
    setTenantDialogOpen(true);
  };

  const onTenantSubmit = (data: TenantForm) => {
    if (editingTenant) {
      updateTenantMutation.mutate({ id: editingTenant.id, name: data.name, isActive: data.isActive });
    } else {
      createTenantMutation.mutate(data);
    }
  };

  const openCreatePlan = () => {
    setEditingPlan(null);
    planForm.reset({ name: "", slug: "", price: "", interval: "monthly", description: "", maxStations: undefined, isActive: true });
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    planForm.reset({
      name: plan.name,
      slug: plan.slug,
      price: plan.price,
      interval: plan.interval,
      description: plan.description || "",
      maxStations: plan.maxStations || undefined,
      isActive: plan.isActive,
    });
    setPlanDialogOpen(true);
  };

  const onPlanSubmit = (data: PlanForm) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, ...data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleBan = (userId: string, name: string) => {
    if (!confirm(`Banir o usuário "${name}"?`)) return;
    const reason = prompt("Motivo do banimento (opcional):") || undefined;
    banUserMutation.mutate({ userId, reason });
  };

  const openAssignDialog = () => {
    assignForm.reset();
    setAssignDialogOpen(true);
  };

  const onAssignSubmit = (data: AssignUserForm) => {
    assignUserMutation.mutate(data);
  };

  const openCreateSubscription = () => {
    subscriptionForm.reset({ tenantId: "", planId: "", status: "active", trialDays: 0 });
    setSubscriptionDialogOpen(true);
  };

  const openRecordPayment = (sub: any) => {
    setSelectedSubForPayment(sub);
    paymentForm.reset({ amount: "", status: "paid", notes: "", externalId: "" });
    setPaymentDialogOpen(true);
  };

  const openPaymentsDialog = (subscriptionId: string) => {
    setSelectedSubForPayments(subscriptionId);
    setPaymentsDialogOpen(true);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "bg-green-600 text-white",
      trial: "bg-blue-600 text-white",
      cancelled: "bg-red-600 text-white",
    };
    return <Badge className={map[status] || "bg-gray-500"}>{status}</Badge>;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Administração</h1>
        <p className="text-muted-foreground">Gerencie domínios, usuários, planos e assinaturas do sistema.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tenants" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Domínios</TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2"><Package className="h-4 w-4" /> Planos</TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Assinaturas</TabsTrigger>
        </TabsList>

        {/* TENANTS TAB */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Domínios / Empresas</CardTitle>
              <Button onClick={openCreateTenant}><Plus className="mr-2 h-4 w-4" /> Novo Domínio</Button>
            </CardHeader>
            <CardContent>
              {tenantsLoading ?  <Spinner className="size-8 mx-auto" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Criado em</TableHead><TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.length === 0 && <TableRow><TableCell colSpan={5}>Nenhum domínio encontrado.</TableCell></TableRow>}
                    {tenants.map((tenant: any) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="font-mono text-sm">{tenant.slug}</TableCell>
                        <TableCell>{tenant.isActive ? <Badge>Ativo</Badge> : <Badge variant="destructive">Inativo</Badge>}</TableCell>
                        <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditTenant(tenant)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="sm" className="text-accent" onClick={() => deleteTenantMutation.mutate(tenant.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* USERS TAB */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Usuários</CardTitle>
              <Button onClick={openAssignDialog}><UserCheck className="mr-2 h-4 w-4" /> Associar a Domínio</Button>
            </CardHeader>
            <CardContent>
              {usersLoading ? <Spinner className="size-8 mx-auto" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Status</TableHead><TableHead>Criado em</TableHead><TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user: any) => (
                      <TableRow key={user.id || user.userId}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.banned ? <Badge variant="destructive" className="text-accent">Banido</Badge> : <Badge>Ativo</Badge>}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {user.banned ? (
                            <Button size="sm" className="" variant="default" onClick={() => unbanUserMutation.mutate(user.id || user.userId)}>Desbanir</Button>
                          ) : (
                            <Button size="sm" className="text-accent" variant="destructive" onClick={() => handleBan(user.id || user.userId, user.name)}>Banir</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Planos</CardTitle>
              <Button onClick={openCreatePlan}><Plus className="mr-2 h-4 w-4" /> Novo Plano</Button>
            </CardHeader>
            <CardContent>
              {plansLoading ? <Spinner className="size-8 mx-auto" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead><TableHead>Preço</TableHead><TableHead>Intervalo</TableHead><TableHead>Max. Estações</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan: any) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>R$ {plan.price}</TableCell>
                        <TableCell className="capitalize">{plan.interval}</TableCell>
                        <TableCell>{plan.maxStations ?? "—"}</TableCell>
                        <TableCell>{plan.isActive ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}><Edit className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Assinaturas</CardTitle>
              <Button onClick={openCreateSubscription}><Plus className="mr-2 h-4 w-4" /> Nova Assinatura</Button>
            </CardHeader>
            <CardContent>
              {subsLoading ? <Spinner className="size-8 mx-auto" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domínio</TableHead><TableHead>Plano</TableHead><TableHead>Status</TableHead><TableHead>Período</TableHead><TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell>{sub.tenantName}</TableCell>
                        <TableCell>{sub.planName} <span className="text-xs text-muted-foreground">({sub.planInterval})</span></TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-sm">{formatDate(sub.currentPeriodStart)} → {formatDate(sub.currentPeriodEnd)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" onClick={() => {
                            const newPlanId = prompt("ID do novo plano:");
                            if (newPlanId) changePlanMutation.mutate({ subscriptionId: sub.id, planId: newPlanId });
                          }}>Mudar Plano</Button>
                          <Button size="sm" variant="outline" onClick={() => openRecordPayment(sub)}><CreditCard className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => openPaymentsDialog(sub.id)}>Pagamentos</Button>
                          {sub.status !== "cancelled" && <Button size="sm" variant="destructive" onClick={() => cancelSubscriptionMutation.mutate(sub.id)}>Cancelar</Button>}
                          {sub.status === "cancelled" && <Button size="sm" onClick={() => renewSubscriptionMutation.mutate(sub.id)}>Renovar</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOGS */}

      {/* Tenant Dialog */}
      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingTenant ? "Editar Domínio" : "Novo Domínio"}</DialogTitle></DialogHeader>
          <Form {...tenantForm}>
            <form onSubmit={tenantForm.handleSubmit(onTenantSubmit)} className="space-y-4">
              <FormField control={tenantForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={tenantForm.control} name="slug" render={({ field }) => (
                <FormItem><FormLabel>Slug (opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {!editingTenant && (
                <>
                  <FormField control={tenantForm.control} name="planId" render={({ field }) => (
                    <FormItem><FormLabel>Plano inicial (opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger></FormControl>
                        <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} - R$ {p.price}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={tenantForm.control} name="trialDays" render={({ field }) => (
                    <FormItem><FormLabel>Dias de trial</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}
              {editingTenant && (
                <FormField control={tenantForm.control} name="isActive" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="true">Ativo</SelectItem>
                        <SelectItem value="false">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}
              <DialogFooter>
                <Button type="submit" disabled={createTenantMutation.isPending || updateTenantMutation.isPending}>
                  {editingTenant ? "Salvar alterações" : "Criar Domínio"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onPlanSubmit)} className="space-y-4">
              <FormField control={planForm.control} name="name" render={({ field }) => <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={planForm.control} name="price" render={({ field }) => <FormItem><FormLabel>Preço</FormLabel><FormControl><Input placeholder="29.90" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={planForm.control} name="interval" render={({ field }) => (
                  <FormItem><FormLabel>Intervalo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={planForm.control} name="maxStations" render={({ field }) => (
                <FormItem><FormLabel>Máx. Estações</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={planForm.control} name="description" render={({ field }) => <FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              {editingPlan && (
                <FormField control={planForm.control} name="isActive" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="true">Ativo</SelectItem><SelectItem value="false">Inativo</SelectItem></SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}
              <DialogFooter>
                <Button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending}>
                  {editingPlan ? "Salvar" : "Criar Plano"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Associar Usuário a um Domínio</DialogTitle></DialogHeader>
          <Form {...assignForm}>
            <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
              <FormField control={assignForm.control} name="userId" render={({ field }) => (
                <FormItem><FormLabel>Usuário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o usuário" /></SelectTrigger></FormControl>
                    <SelectContent>{users.map((u: any) => <SelectItem key={u.id || u.userId} value={u.id || u.userId}>{u.name} ({u.email})</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={assignForm.control} name="tenantId" render={({ field }) => (
                <FormItem><FormLabel>Domínio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o domínio" /></SelectTrigger></FormControl>
                    <SelectContent>{tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <DialogFooter><Button type="submit" disabled={assignUserMutation.isPending}>Associar</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Assinatura</DialogTitle></DialogHeader>
          <Form {...subscriptionForm}>
            <form onSubmit={subscriptionForm.handleSubmit((data) => createSubscriptionMutation.mutate(data))} className="space-y-4">
              <FormField control={subscriptionForm.control} name="tenantId" render={({ field }) => (
                <FormItem><FormLabel>Domínio</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={subscriptionForm.control} name="planId" render={({ field }) => (
                <FormItem><FormLabel>Plano</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} - R$ {p.price}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={subscriptionForm.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="trial">Trial</SelectItem><SelectItem value="active">Ativo</SelectItem></SelectContent></Select></FormItem>
                )} />
                <FormField control={subscriptionForm.control} name="trialDays" render={({ field }) => (
                  <FormItem><FormLabel>Dias de Trial</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter><Button type="submit" disabled={createSubscriptionMutation.isPending}>Criar Assinatura</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento - {selectedSubForPayment?.tenantName}</DialogTitle></DialogHeader>
          <Form {...paymentForm}>
            <form 
              onSubmit={paymentForm.handleSubmit((data) => {
                if (!selectedSubForPayment) return;
                recordPaymentMutation.mutate({
                  ...data,
                  subscriptionId: selectedSubForPayment.id,
                });
              })} 
              className="space-y-4"
            >
              <FormField control={paymentForm.control} name="amount" render={({ field }) => <FormItem><FormLabel>Valor</FormLabel><FormControl><Input placeholder="29.90" {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={paymentForm.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="paid">Pago</SelectItem><SelectItem value="failed">Falhou</SelectItem><SelectItem value="refunded">Reembolsado</SelectItem></SelectContent></Select></FormItem>
              )} />
              <FormField control={paymentForm.control} name="externalId" render={({ field }) => <FormItem><FormLabel>ID Externo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={paymentForm.control} name="notes" render={({ field }) => <FormItem><FormLabel>Observações</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
              <DialogFooter><Button type="submit" disabled={recordPaymentMutation.isPending}>Registrar Pagamento</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payments History Dialog */}
      <Dialog open={paymentsDialogOpen} onOpenChange={setPaymentsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Histórico de Pagamentos</DialogTitle></DialogHeader>
          {paymentsLoading ? <Spinner className="size-8 mx-auto" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead><TableHead>Observação</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.length === 0 && <TableRow><TableCell colSpan={4}>Nenhum pagamento registrado.</TableCell></TableRow>}
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paidAt || p.createdAt)}</TableCell>
                    <TableCell>R$ {p.amount}</TableCell>
                    <TableCell><Badge>{p.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.notes || p.externalId || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}