import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"
import { getDistanceKm } from "@/utils/distance"
import { DEFAULT_FUEL_SLUG } from "@/hooks/usePreferredFuel"

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

export function useNearbyStations(
  preferredFuelSlug: string,
  location: Coords | null,
  sortBy: SortOption = "distance-asc",
) {
  const stationsQuery = useQuery(orpc.station.search.queryOptions({ input: {} }))

  const pricesQuery = useQuery(orpc.fuel.listPrices.queryOptions({ input: {} }))

  const stations = useMemo<NearbyStation[]>(() => {
    const stationRows = stationsQuery.data ?? []
    const priceRows = pricesQuery.data ?? []

    const combined = stationRows.map((station) => {
      const stationPrices = priceRows.filter((p) => p.stationId === station.id)

      const preferred =
        stationPrices.find((p) => p.fuelSlug === preferredFuelSlug) ??
        stationPrices.find((p) => p.fuelSlug === DEFAULT_FUEL_SLUG) ??
        stationPrices[0]

      const distanceKm = location
        ? getDistanceKm(
            location.latitude,
            location.longitude,
            Number(station.latitude),
            Number(station.longitude),
          )
        : null

      return {
        id: station.id,
        name: station.name,
        address: station.address,
        city: station.city,
        latitude: station.latitude,
        longitude: station.longitude,
        distanceKm,
        price: preferred?.currentPrice ?? null,
        fuelName: preferred?.fuelName ?? null,
      }
    })

    return [...combined].sort((a, b) => {
      if (sortBy === "distance-asc" || sortBy === "distance-desc") {
        const da = a.distanceKm
        const db = b.distanceKm
        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return sortBy === "distance-asc" ? da - db : db - da
      }
      const pa = a.price !== null ? Number(a.price) : null
      const pb = b.price !== null ? Number(b.price) : null
      if (pa === null && pb === null) return 0
      if (pa === null) return 1
      if (pb === null) return -1
      return sortBy === "price-asc" ? pa - pb : pb - pa
    })
  }, [stationsQuery.data, pricesQuery.data, preferredFuelSlug, location, sortBy])

  const availableFuels = useMemo<FuelOption[]>(() => {
    const map = new Map<string, string>()
    for (const p of pricesQuery.data ?? []) {
      if (!map.has(p.fuelSlug)) map.set(p.fuelSlug, p.fuelName)
    }
    return Array.from(map, ([slug, name]) => ({ slug, name }))
  }, [pricesQuery.data])

  const refetch = () => {
    stationsQuery.refetch()
    pricesQuery.refetch()
  }

  return {
    stations,
    availableFuels,
    isLoading: stationsQuery.isLoading || pricesQuery.isLoading,
    isRefetching: stationsQuery.isRefetching || pricesQuery.isRefetching,
    isError: stationsQuery.isError || pricesQuery.isError,
    refetch,
  }
}
