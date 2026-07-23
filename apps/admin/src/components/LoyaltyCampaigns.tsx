import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Rocket, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";

function fmtRange(startsAt: string | Date, endsAt: string | Date) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${new Date(startsAt).toLocaleString("pt-BR", opts)} → ${new Date(
    endsAt,
  ).toLocaleString("pt-BR", opts)}`;
}

type Phase = { label: string; variant: "default" | "secondary" | "outline" };

function phaseOf(
  c: { isActive: boolean; startsAt: string | Date; endsAt: string | Date },
  now: number,
): Phase {
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.endsAt).getTime();
  if (!c.isActive) return { label: "Desligada", variant: "outline" };
  if (now < start) return { label: "Agendada", variant: "secondary" };
  if (now > end) return { label: "Encerrada", variant: "outline" };
  return { label: "No ar", variant: "default" };
}

/** Valor default do input datetime-local (agora, no fuso local). */
function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function LoyaltyCampaigns({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();
  const now = Date.now();

  const { data: campaigns = [], isLoading } = useQuery(
    orpc.loyalty.listCampaigns.queryOptions({ enabled }),
  );

  const invalidate = () =>
    qc.invalidateQueries(orpc.loyalty.listCampaigns.queryOptions());

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [multiplier, setMultiplier] = useState("2");
  const [startsAt, setStartsAt] = useState(toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState(
    toLocalInput(new Date(Date.now() + 2 * 86_400_000)),
  );

  const create = useMutation({
    ...orpc.loyalty.createCampaign.mutationOptions(),
    onSuccess: () => {
      toast.success("Campanha criada.");
      setOpen(false);
      setName("");
      setMultiplier("2");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const toggle = useMutation({
    ...orpc.loyalty.setCampaignActive.mutationOptions(),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const remove = useMutation({
    ...orpc.loyalty.deleteCampaign.mutationOptions(),
    onSuccess: () => {
      toast.success("Campanha removida.");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  function handleCreate() {
    const mult = Number(multiplier.replace(",", "."));
    if (!name.trim()) {
      toast.warning("Dê um nome à campanha.");
      return;
    }
    if (!(mult >= 1 && mult <= 10)) {
      toast.warning("O multiplicador deve ficar entre 1 e 10.");
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      toast.warning("O fim precisa ser depois do início.");
      return;
    }
    create.mutate({
      name: name.trim(),
      multiplier: mult,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="h-4 w-4" />
            Campanhas de pontos
          </CardTitle>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!enabled}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Multiplica os pontos ganhos por um período (ex.: pontos em dobro no
          fim de semana). O multiplicador vale sobre os pontos por real.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner className="size-6" />
          </div>
        ) : campaigns.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma campanha ainda. Crie uma para dar um empurrão nas vendas.
          </p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => {
              const phase = phaseOf(c, now);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <Badge variant="secondary" className="tabular-nums">
                        {c.multiplier}x
                      </Badge>
                      <Badge variant={phase.variant}>{phase.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmtRange(c.startsAt, c.endsAt)}
                    </p>
                  </div>
                  <Switch
                    checked={c.isActive}
                    onCheckedChange={(v) =>
                      toggle.mutate({ id: c.id, isActive: v })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => remove.mutate({ id: c.id })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Criar campanha */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nome</Label>
              <Input
                id="c-name"
                placeholder="Pontos em dobro de fim de semana"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-mult">Multiplicador</Label>
              <Input
                id="c-mult"
                type="number"
                min={1}
                max={10}
                step="0.5"
                inputMode="decimal"
                className="w-28"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                2 = pontos em dobro, 3 = em triplo. Vale sobre os pontos por
                real já configurados.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-start">Início</Label>
                <Input
                  id="c-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-end">Fim</Label>
                <Input
                  id="c-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={create.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={create.isPending}
              className="gap-2"
            >
              {create.isPending && <Spinner className="size-4" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
