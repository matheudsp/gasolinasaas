import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Fuel, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user, activeTenant } = useAuth();

  const { data: stations = [], isLoading: stationsLoading } = useQuery(
    orpc.station.search.queryOptions({ input: {}, enabled: !!activeTenant }),
  );

  const { data: prices = [], isLoading: pricesLoading } = useQuery(
    orpc.fuel.listPrices.queryOptions({ input: {}, enabled: !!activeTenant }),
  );

  const isLoading = stationsLoading || pricesLoading;

  const pricesByStation = prices.reduce<Record<string, typeof prices>>(
    (acc, price) => {
      if (!acc[price.stationId]) acc[price.stationId] = [];
      acc[price.stationId].push(price);
      return acc;
    },
    {},
  );

  const uniqueFuelCount = new Set(prices.map((p) => p.fuelName)).size;

  const allFuels = Array.from(new Set(prices.map((p) => p.fuelName))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {user?.name}
          </h1>
          <p className="text-muted-foreground text-xs">
            {activeTenant?.name}
          </p>
        </div>
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
                  </TableRow>
                ))
              ) : stations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhum posto ainda. Adicione um nas configurações do Tenant.
                  </TableCell>
                </TableRow>
              ) : (
                stations.map((s) => {
                  const stationPrices = pricesByStation[s.id] ?? [];
                  const stationPricesMap = new Map(
                    stationPrices.map((p) => [p.fuelName, p.currentPrice] as const)
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
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-1 text-[13px] leading-tight">
                            {allFuels.map((fuelName) => {
                              const currentPrice = stationPricesMap.get(fuelName);
                              return (
                                <Badge
                                  key={fuelName}
                                  variant={currentPrice != null ? "outline" : "secondary"}
                                  className="flex items-baseline justify-between gap-2"
                                >
                                  <span className=" truncate ">
                                    {fuelName}
                                  </span>
                                  <span className="font-mono font-medium tabular-nums whitespace-nowrap min-w-[4.5ch] text-right">
                                    {currentPrice != null ? `R$ ${currentPrice}` : "-"}
                                  </span>
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}