import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, Gift, Pencil, Plus, RotateCcw } from "lucide-react";
import { orpc } from "@/lib/orpc";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

type RewardRow = {
  id: string;
  name: string;
  description: string | null;
  costPoints: number;
  imageUrl: string | null;
  stock: number | null;
  isActive: boolean;
};

type FormState = {
  id: string | null;
  name: string;
  description: string;
  costPoints: string;
  imageUrl: string;
  stock: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  description: "",
  costPoints: "",
  imageUrl: "",
  stock: "",
};

// Fotos vêm como caminho relativo do server; URLs externas (coladas) já são absolutas.
function resolveImageUrl(url: string) {
  return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
}

async function uploadImage(rewardId: string, image: File) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/rewards/${rewardId}/image`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": image.type },
      body: image,
    },
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Falha no upload da imagem");
  }
}

export function RewardsManager() {
  const qc = useQueryClient();
  const { activeTenant } = useAuth();
  const enabled = !!activeTenant;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: rewards = [], isLoading } = useQuery(
    orpc.loyalty.listRewardsAdmin.queryOptions({ enabled }),
  );

  const invalidate = () =>
    qc.invalidateQueries(orpc.loyalty.listRewardsAdmin.queryOptions());

  const createReward = useMutation(orpc.loyalty.createReward.mutationOptions());
  const updateReward = useMutation(orpc.loyalty.updateReward.mutationOptions());

  const deleteReward = useMutation({
    ...orpc.loyalty.deleteReward.mutationOptions(),
    onSuccess: () => {
      toast.success("Recompensa arquivada.");
      invalidate();
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setFile(null);
    setOpen(true);
  }

  function openEdit(r: RewardRow) {
    setForm({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      costPoints: String(r.costPoints),
      imageUrl: r.imageUrl ?? "",
      stock: r.stock === null ? "" : String(r.stock),
    });
    setFile(null);
    setOpen(true);
  }

  async function reactivate(id: string) {
    try {
      await updateReward.mutateAsync({ id, isActive: true });
      toast.success("Recompensa reativada.");
      invalidate();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    }
  }

  async function handleSave() {
    const cost = Number(form.costPoints);
    if (!form.name.trim() || !Number.isInteger(cost) || cost < 1) {
      toast.warning("Informe um nome e um custo (inteiro ≥ 1).");
      return;
    }
    const stock = form.stock.trim() === "" ? null : Number(form.stock);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      toast.warning("Estoque deve ser um inteiro ≥ 0 (ou vazio para ilimitado).");
      return;
    }
    const imageUrl = form.imageUrl.trim() || null;
    const description = form.description.trim() || null;

    setSaving(true);
    try {
      let rewardId = form.id;
      if (form.id) {
        await updateReward.mutateAsync({
          id: form.id,
          name: form.name.trim(),
          description,
          costPoints: cost,
          imageUrl,
          stock,
        });
      } else {
        const created = await createReward.mutateAsync({
          name: form.name.trim(),
          description,
          costPoints: cost,
          imageUrl,
          stock,
        });
        rewardId = created.id;
      }

      if (file && rewardId) {
        await uploadImage(rewardId, file);
      }

      toast.success(form.id ? "Recompensa atualizada." : "Recompensa criada.");
      setOpen(false);
      setFile(null);
      invalidate();
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          O catálogo que os clientes resgatam com pontos.
        </p>
        <Button onClick={openCreate} className="gap-2" disabled={!enabled}>
          <Plus className="h-4 w-4" />
          Nova recompensa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4" />
            Catálogo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : rewards.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma recompensa. Crie a primeira acima.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recompensa</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rewards as RewardRow[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {r.imageUrl ? (
                          <img
                            src={resolveImageUrl(r.imageUrl)}
                            alt={r.name}
                            className="h-10 w-10 rounded-md object-cover border border-border"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[220px]">
                            {r.name}
                          </p>
                          {r.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                              {r.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {r.costPoints.toLocaleString("pt-BR")} pts
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {r.stock === null ? "∞" : r.stock}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? "default" : "secondary"}>
                        {r.isActive ? "Ativa" : "Arquivada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        {r.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                            disabled={deleteReward.isPending}
                            onClick={() => deleteReward.mutate({ id: r.id })}
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Arquivar
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            disabled={updateReward.isPending}
                            onClick={() => reactivate(r.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reativar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog criar/editar ─────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar recompensa" : "Nova recompensa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Nome</Label>
              <Input
                id="r-name"
                placeholder="Ex: Lavagem completa"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-cost">Custo (pontos)</Label>
                <Input
                  id="r-cost"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="500"
                  value={form.costPoints}
                  onChange={(e) =>
                    setForm({ ...form, costPoints: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-stock">Estoque</Label>
                <Input
                  id="r-stock"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  placeholder="ilimitado"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-file">Foto</Label>
              <Input
                id="r-file"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Envie um arquivo (até 2 MB) — vai pro R2. Ou cole uma URL abaixo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-image">URL da foto (alternativa)</Label>
              <Input
                id="r-image"
                type="url"
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Descrição (opcional)</Label>
              <Textarea
                id="r-desc"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Spinner className="size-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
