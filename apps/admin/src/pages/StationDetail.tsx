import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { useAuth } from "@/context/AuthContext";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  MapPin,
  Pencil,
  Plus,
  Check,
  Trash2,
  X,
  Fuel,
  Wifi,
  Accessibility,
  ShoppingBag,
  Utensils,
  Zap,
  Car,
  Clock,
  Gauge,
  Bath,
} from "lucide-react";
import { toast } from "sonner";

const PRICE_REGEX = /^\d+(\.\d{1,3})?$/;

interface AmenityItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const amenityConfig: AmenityItem[] = [
  { key: "wifi", label: "Wi-Fi", icon: Wifi },
  { key: "accessibility", label: "Accessibility", icon: Accessibility },
  { key: "convenienceStore", label: "Convenience Store", icon: ShoppingBag },
  { key: "restaurant", label: "Restaurant", icon: Utensils },
  { key: "electricCharging", label: "EV Charging", icon: Zap },
  { key: "carWash", label: "Car Wash", icon: Car },
  { key: "open24h", label: "Open 24h", icon: Clock },
  { key: "tirePressure", label: "Tire Pressure", icon: Gauge },
  { key: "bathroom", label: "Bathroom", icon: Bath },
];

export default function StationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeTenant } = useAuth();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addFuelId, setAddFuelId] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    stationFuelId: string;
    fuelName: string;
  } | null>(null);

  const { data: stations = [], isLoading: stationsLoading } = useQuery(
    orpc.station.search.queryOptions({ input: {}, enabled: !!activeTenant }),
  );

  const { data: prices = [], isLoading: pricesLoading } = useQuery(
    orpc.fuel.listPrices.queryOptions({
      input: { stationId: id },
      enabled: !!activeTenant && !!id,
    }),
  );

  const { data: fuelCatalog = [] } = useQuery(
    orpc.fuel.listCatalog.queryOptions({
      input: {},
      enabled: !!activeTenant,
    }),
  );

  const { mutate: updatePrice, isPending: isUpdating } = useMutation(
    orpc.fuel.updatePrice.mutationOptions(),
  );

  const invalidatePrices = () => {
    queryClient.invalidateQueries({
      queryKey: orpc.fuel.listPrices.queryOptions({
        input: { stationId: id },
      }).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: orpc.fuel.listPrices.queryOptions({ input: {} }).queryKey,
    });
  };

  const addFuelMutation = useMutation({
    ...orpc.fuel.addToStation.mutationOptions(),
    onSuccess: () => {
      toast.success("Combustível adicionado!");
      setAddOpen(false);
      setAddFuelId("");
      setAddPrice("");
      invalidatePrices();
    },
    onError: (e: Error) =>
      toast.error(`Erro ao adicionar combustível: ${e.message}`),
  });

  const removeFuelMutation = useMutation({
    ...orpc.fuel.removeFromStation.mutationOptions(),
    onSuccess: () => {
      toast.success("Combustível removido.");
      setRemoveTarget(null);
      invalidatePrices();
    },
    onError: (e: Error) =>
      toast.error(`Erro ao remover combustível: ${e.message}`),
  });

  // Só oferece no select o que o posto ainda não tem
  const availableFuels = fuelCatalog.filter(
    (f) => !prices.some((p) => p.fuelId === f.id),
  );

  const station = stations.find((s) => s.id === id);
  const isLoading = stationsLoading || pricesLoading;

  const activeAmenities = station
    ? amenityConfig.filter(({ key }) => {
        return (station as Record<string, unknown>)[key] === true;
      })
    : [];

  const startEdit = (stationFuelId: string, currentPrice: string) => {
    setEditingId(stationFuelId);
    setEditValue(currentPrice);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = (stationFuelId: string) => {
    if (!PRICE_REGEX.test(editValue)) {
      toast.error("Invalid price: Use format 5.999 — up to 3 decimal places.");
      return;
    }

    updatePrice(
      { stationFuelId, newPrice: editValue },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: orpc.fuel.listPrices.queryOptions({
              input: { stationId: id },
            }).queryKey,
          });
          setEditingId(null);
          setEditValue("");
          toast.success("Price updated");
        },
        onError: (error) => {
          toast.error("Failed to update price: " + error.message);
        },
      },
    );
  };

  if (!isLoading && !station) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Station not found.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          {isLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">
              {station?.name}
            </h1>
          )}
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {station?.address}, {station?.city}
            </p>
          )}
        </div>
      </div>

      {!isLoading && activeAmenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeAmenities.map(({ key, label, icon: Icon }) => (
            <Badge key={key} variant="secondary" className="gap-1.5">
              <Icon className="h-3 w-3" />
              {label}
            </Badge>
          ))}
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Combustíveis e preços</h2>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar combustível
          </Button>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fuel</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-36" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : prices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhum combustível configurado para este posto. Use
                    &quot;Adicionar combustível&quot; acima.
                  </TableCell>
                </TableRow>
              ) : (
                prices.map((price) => (
                  <TableRow key={price.stationFuelId}>
                    <TableCell className="font-medium">
                      {price.fuelName}
                    </TableCell>
                    <TableCell>
                      {editingId === price.stationFuelId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            R$
                          </span>
                          <Input
                            className="h-8 w-28 font-mono"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleSave(price.stationFuelId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span className="font-mono">
                          R$ {price.currentPrice}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(price.updatedAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {editingId === price.stationFuelId ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            disabled={isUpdating}
                            onClick={() => handleSave(price.stationFuelId)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={isUpdating}
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() =>
                              startEdit(price.stationFuelId, price.currentPrice)
                            }
                          >
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              setRemoveTarget({
                                stationFuelId: price.stationFuelId,
                                fuelName: price.fuelName,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Adicionar combustível */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar combustível</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Combustível *</Label>
              <Select value={addFuelId} onValueChange={setAddFuelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um combustível" />
                </SelectTrigger>
                <SelectContent>
                  {availableFuels.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Todos os combustíveis do catálogo já estão neste posto.
                    </div>
                  ) : (
                    availableFuels.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preço (R$) *</Label>
              <Input
                className="font-mono"
                value={addPrice}
                onChange={(e) => setAddPrice(e.target.value)}
                placeholder="5.999"
              />
              <p className="text-xs text-muted-foreground">
                Use ponto como separador, até 3 casas decimais.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !addFuelId ||
                !PRICE_REGEX.test(addPrice) ||
                addFuelMutation.isPending
              }
              onClick={() =>
                id &&
                addFuelMutation.mutate({
                  stationId: id,
                  fuelId: addFuelId,
                  price: addPrice,
                })
              }
            >
              {addFuelMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remover combustível */}
      <Dialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover combustível</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remover{" "}
            <span className="font-medium text-foreground">
              {removeTarget?.fuelName}
            </span>{" "}
            deste posto? O histórico de preços é preservado e o combustível pode
            ser adicionado novamente depois.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={removeFuelMutation.isPending}
              onClick={() =>
                removeTarget &&
                removeFuelMutation.mutate({
                  stationFuelId: removeTarget.stationFuelId,
                })
              }
            >
              {removeFuelMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
