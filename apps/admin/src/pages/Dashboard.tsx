import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Fuel,
  MoreHorizontal,
  Phone,
  Plus,
  Trash2,
  TowerControl,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const amenityFields = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "accessibility", label: "Acessibilidade" },
  { key: "convenienceStore", label: "Conveniência" },
  { key: "restaurant", label: "Restaurante" },
  { key: "electricCharging", label: "Carregador elétrico" },
  { key: "carWash", label: "Lava-jato" },
  { key: "open24h", label: "Aberto 24h" },
  { key: "tirePressure", label: "Calibragem" },
  { key: "bathroom", label: "Banheiro" },
] as const;

type AmenityKey = (typeof amenityFields)[number]["key"];

const emptyStationForm = {
  name: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  amenities: {} as Partial<Record<AmenityKey, boolean>>,
};

export default function Dashboard() {
  const { user, isAdmin, activeTenant } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyStationForm);
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: stations = [], isLoading: stationsLoading } = useQuery(
    orpc.station.search.queryOptions({ input: {}, enabled: !!activeTenant }),
  );

  const { data: prices = [], isLoading: pricesLoading } = useQuery(
    orpc.fuel.listPrices.queryOptions({ input: {}, enabled: !!activeTenant }),
  );

  const invalidateStations = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.station.search.queryOptions({ input: {} }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: orpc.fuel.listPrices.queryOptions({ input: {} }).queryKey,
    });
  };

  const createMutation = useMutation({
    ...orpc.station.create.mutationOptions(),
    onSuccess: () => {
      toast.success("Posto criado!");
      setCreateOpen(false);
      setForm(emptyStationForm);
      invalidateStations();
    },
    onError: (e: Error) => toast.error(`Erro ao criar posto: ${e.message}`),
  });

  const removeMutation = useMutation({
    ...orpc.station.remove.mutationOptions(),
    onSuccess: () => {
      toast.success("Posto removido.");
      setRemoveTarget(null);
      invalidateStations();
    },
    onError: (e: Error) => toast.error(`Erro ao remover posto: ${e.message}`),
  });

  const isLoading = stationsLoading || pricesLoading;

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const formValid =
    form.name.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.latitude.trim() &&
    form.longitude.trim() &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const handleCreate = () => {
    createMutation.mutate({
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      latitude,
      longitude,
      ...form.amenities,
    });
  };

  // Admin geral ainda não escolheu qual tenant vai gerenciar
  if (isAdmin && !activeTenant) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <TowerControl className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Nenhum domínio selecionado</p>
          <p className="text-sm text-muted-foreground">
            Escolha um domínio no painel Admin (menu &quot;Gerenciar
            postos&quot;) para administrar seus postos e combustíveis.
          </p>
        </div>
        <Button onClick={() => navigate("/admin")}>Ir para o Admin</Button>
      </div>
    );
  }

  const pricesByStation = prices.reduce<Record<string, typeof prices>>(
    (acc, price) => {
      if (!acc[price.stationId]) acc[price.stationId] = [];
      acc[price.stationId].push(price);
      return acc;
    },
    {},
  );

  const uniqueFuelCount = new Set(prices.map((p) => p.fuelName)).size;

  const allFuels = Array.from(new Set(prices.map((p) => p.fuelName))).sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {user?.name}
          </h1>
          <p className="text-muted-foreground text-xs">
            {isAdmin ? "Gerenciando domínio: " : ""}
            {activeTenant?.name}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo posto
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Postos cadastrados
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{stations.length}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tipos de Combustível
            </CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{uniqueFuelCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Suporte via WhatsApp
            </CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">(89) 9 94176493</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Listagem</h2>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posto</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Preço Combustível</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : stations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhum posto ainda. Clique em &quot;Novo posto&quot; para
                    adicionar o primeiro.
                  </TableCell>
                </TableRow>
              ) : (
                stations.map((s) => {
                  const stationPrices = pricesByStation[s.id] ?? [];
                  const stationPricesMap = new Map(
                    stationPrices.map(
                      (p) => [p.fuelName, p.currentPrice] as const,
                    ),
                  );
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/stations/${s.id}`}
                          className="hover:underline"
                        >
                          {s.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.city} - {s.address}
                      </TableCell>
                      <TableCell className="py-2.5">
                        {allFuels.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1 text-[13px] leading-tight">
                            {allFuels.map((fuelName) => {
                              const currentPrice =
                                stationPricesMap.get(fuelName);
                              return (
                                <Badge
                                  key={fuelName}
                                  variant={
                                    currentPrice != null
                                      ? "outline"
                                      : "secondary"
                                  }
                                  className="flex items-baseline justify-between gap-2"
                                >
                                  <span className=" truncate ">
                                    {fuelName}
                                  </span>
                                  <span className="font-mono font-medium tabular-nums whitespace-nowrap min-w-[4.5ch] text-right">
                                    {currentPrice != null
                                      ? `R$ ${currentPrice}`
                                      : "-"}
                                  </span>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
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
                              onClick={() => navigate(`/stations/${s.id}`)}
                            >
                              <Fuel className="mr-2 h-4 w-4" />
                              Combustíveis e preços
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setRemoveTarget({ id: s.id, name: s.name })
                              }
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remover posto
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
        </Card>
      </div>

      {/* Criar posto */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo posto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Posto Exemplo - Centro"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Endereço *</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Av. Principal, 100"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade *</Label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="Teresina"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Latitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, latitude: e.target.value }))
                  }
                  placeholder="-5.08921"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Longitude *</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, longitude: e.target.value }))
                  }
                  placeholder="-42.80194"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comodidades</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {amenityFields.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={!!form.amenities[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          amenities: {
                            ...f.amenities,
                            [key]: e.target.checked,
                          },
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!formValid || createMutation.isPending}
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Criando..." : "Criar posto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover posto */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover posto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover o posto{" "}
            <span className="font-medium text-foreground">
              {removeTarget?.name}
            </span>
            ? Ele deixará de aparecer no aplicativo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() =>
                removeTarget && removeMutation.mutate({ id: removeTarget.id })
              }
            >
              {removeMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
