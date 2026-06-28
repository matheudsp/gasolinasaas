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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Check,
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
  const { membership } = useAuth();


  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: stations = [], isLoading: stationsLoading } = useQuery(
    orpc.station.search.queryOptions({ input: {}, enabled: !!membership }),
  );

  const { data: prices = [], isLoading: pricesLoading } = useQuery(
    orpc.fuel.listPrices.queryOptions({
      input: { stationId: id },
      enabled: !!membership && !!id,
    }),
  );

  const { mutate: updatePrice, isPending: isUpdating } = useMutation(
    orpc.fuel.updatePrice.mutationOptions(),
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
        <div className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Fuel Prices</h2>
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
                    No fuel types configured for this station.
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() =>
                            startEdit(price.stationFuelId, price.currentPrice)
                          }
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}