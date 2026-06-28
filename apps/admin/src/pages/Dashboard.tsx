import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { orpc } from "@/lib/orpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Fuel, Settings, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user, membership } = useAuth();

  const { data: stations = [], isLoading: stationsLoading } = useQuery(
    orpc.station.search.queryOptions({ input: {}, enabled: !!membership }),
  );

  const { data: prices = [], isLoading: pricesLoading } = useQuery(
    orpc.fuel.listPrices.queryOptions({ input: {}, enabled: !!membership }),
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.name}
          </h1>
          <p className="text-muted-foreground">{membership?.tenant.name}</p>
        </div>
        {membership?.tenantId && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/tenants/${membership.tenantId}`}>
              <Settings className="mr-1.5 h-4 w-4" />
              Manage Tenant
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Stations
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
            <CardTitle className="text-sm font-medium">Fuel Types</CardTitle>
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
            <CardTitle className="text-sm font-medium">Role</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {membership?.role ?? "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {membership?.tenant.slug}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Stations & Prices</h2>
          {membership?.tenantId && (
            <Button asChild size="sm" variant="ghost">
              <Link to={`/tenants/${membership.tenantId}`}>
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Fuel Prices</TableHead>
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
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
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
                    No stations yet. Add one from the Tenant settings.
                  </TableCell>
                </TableRow>
              ) : (
                stations.map((s) => {
                  const stationPrices = pricesByStation[s.id] ?? [];
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
                        {s.city}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.address}
                      </TableCell>
                      <TableCell>
                        {stationPrices.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {stationPrices.map((price) => (
                              <Badge
                                key={price.stationFuelId}
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {price.fuelName} · R$ {price.currentPrice}
                              </Badge>
                            ))}
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