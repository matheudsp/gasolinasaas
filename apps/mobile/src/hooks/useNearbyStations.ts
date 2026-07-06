import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

interface Coords {
  latitude: number
  longitude: number
}

export interface NearbyStation {
  id: string
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  distanceKm: number | null
  price: string | null
  fuelName: string | null
}

export interface FuelOption {
  slug: string
  name: string
}

export type SortOption = "distance-asc" | "distance-desc" | "price-asc" | "price-desc"

export interface NearbyStationsFilters {
  maxDistanceKm?: number
  minPrice?: number
  maxPrice?: number
}

/**
 * Filtragem por combustível, preço e distância agora acontece no backend
 * (station.listNearby) — este hook só repassa parâmetros e devolve o
 * resultado já pronto. Nada de join, Haversine ou sort no cliente.
 *
 * MUDANÇA DE COMPORTAMENTO: antes, um posto que não vendia o combustível
 * preferido ainda aparecia na lista com o preço de outro combustível como
 * fallback. Agora fuelSlug filtra de verdade — só aparecem postos que
 * vendem especificamente aquele combustível.
 */
export function useNearbyStations(
  preferredFuelSlug: string,
  location: Coords | null,
  sortBy: SortOption = "distance-asc",
  filters: NearbyStationsFilters = {},
) {
  const stationsQuery = useQuery(
    orpc.station.listNearby.queryOptions({
      input: {
        fuelSlug: preferredFuelSlug,
        latitude: location?.latitude,
        longitude: location?.longitude,
        sortBy,
        ...filters,
      },
    }),
  )

  const fuelsQuery = useQuery(orpc.fuel.listAvailable.queryOptions({ input: {} }))

  return {
    stations: stationsQuery.data ?? [],
    availableFuels: fuelsQuery.data ?? [],
    isLoading: stationsQuery.isLoading || fuelsQuery.isLoading,
    isRefetching: stationsQuery.isRefetching || fuelsQuery.isRefetching,
    isError: stationsQuery.isError || fuelsQuery.isError,
    refetch: () => {
      stationsQuery.refetch()
      fuelsQuery.refetch()
    },
  }
}