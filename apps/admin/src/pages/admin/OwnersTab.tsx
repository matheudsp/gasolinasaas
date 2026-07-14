import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { orpc } from "@/lib/orpc";
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
import { Spinner } from "@/components/ui/spinner";

export function OwnersTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");

  const { data: tenants = [] } = useQuery(
    orpc.admin.tenant.list.queryOptions({ input: {} }),
  );
  const { data: owners = [], isLoading } = useQuery(
    orpc.admin.tenant.listOwners.queryOptions(),
  );

  const invalidate = () =>
    qc.invalidateQueries(orpc.admin.tenant.listOwners.queryOptions());

  const assign = useMutation({
    ...orpc.admin.tenant.assignOwnerByEmail.mutationOptions(),
    onSuccess: () => {
      toast.success("Dono atribuído.");
      setDialogOpen(false);
      setEmail("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    ...orpc.admin.user.removeFromTenant.mutationOptions(),
    onSuccess: () => {
      toast.success("Dono removido.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ownedTenantIds = new Set(owners.map((o) => o.tenantId));
  const withoutOwner = tenants.filter((t) => !ownedTenantIds.has(t.id));

  function openAssign(preTenantId?: string) {
    setTenantId(preTenantId ?? "");
    setEmail("");
    setDialogOpen(true);
  }

  function handleAssign() {
    if (!tenantId) {
      toast.warning("Selecione um domínio.");
      return;
    }
    if (!email.trim()) {
      toast.warning("Informe o e-mail do dono.");
      return;
    }
    assign.mutate({ tenantId, email: email.trim() });
  }

  return (
    <div className="space-y-4">
      {withoutOwner.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Domínios sem dono ({withoutOwner.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {withoutOwner.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => openAssign(t.id)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Donos {!isLoading && `(${owners.length})`}
          </CardTitle>
          <Button size="sm" onClick={() => openAssign()}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Atribuir dono
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domínio</TableHead>
                <TableHead>Dono</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center">
                    <Spinner className="mx-auto size-8" />
                  </TableCell>
                </TableRow>
              ) : owners.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum dono atribuído ainda.
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((o) => (
                  <TableRow key={`${o.tenantId}-${o.userId}`}>
                    <TableCell className="font-medium">
                      {o.tenantName}
                      {!o.tenantActive && (
                        <Badge variant="secondary" className="ml-2">
                          inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.name}
                      {o.banned && (
                        <Badge variant="destructive" className="ml-2">
                          banido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.email}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={remove.isPending}
                        onClick={() =>
                          remove.mutate({
                            userId: o.userId,
                            tenantId: o.tenantId,
                          })
                        }
                        aria-label={`Remover ${o.name} de ${o.tenantName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir dono</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Domínio</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o domínio" />
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
              <Label htmlFor="owner-email">E-mail do dono</Label>
              <Input
                id="owner-email"
                type="email"
                placeholder="dono@rede.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAssign()}
              />
              <p className="text-xs text-muted-foreground">
                O usuário precisa já ter uma conta no sistema.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={assign.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assign.isPending}
              className="gap-2"
            >
              {assign.isPending && <Spinner className="size-4" />}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
