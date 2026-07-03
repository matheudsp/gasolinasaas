import { useCallback, useState } from "react"
import { loadString, saveString } from "@/utils/storage"
import type { SortOption } from "@/hooks/useNearbyStations"

const SORT_OPTION_KEY = "stationSortOption"

export const DEFAULT_SORT_OPTION: SortOption = "distance-asc"

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "distance-asc", label: "Mais próximo" },
  { value: "distance-desc", label: "Mais longe" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
]

export const SORT_LABELS: Record<SortOption, string> = {
  "distance-asc": "Mais próximo",
  "distance-desc": "Mais longe",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
}

export function useSortOption() {
  const [sortBy, setSortByState] = useState<SortOption>(
    () => (loadString(SORT_OPTION_KEY) as SortOption | null) ?? DEFAULT_SORT_OPTION,
  )

  const refresh = useCallback(() => {
    setSortByState((loadString(SORT_OPTION_KEY) as SortOption | null) ?? DEFAULT_SORT_OPTION)
  }, [])

  const setSortBy = useCallback((value: SortOption) => {
    saveString(SORT_OPTION_KEY, value)
    setSortByState(value)
  }, [])

  return { sortBy, setSortBy, refresh }
}
