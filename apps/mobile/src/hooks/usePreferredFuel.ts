import { useCallback, useState } from "react"
import { loadString, saveString } from "@/utils/storage"

const PREFERRED_FUEL_KEY = "preferredFuelSlug"

export const DEFAULT_FUEL_SLUG = "gasolina-comum"

export function usePreferredFuel() {
  const [preferredFuelSlug, setPreferredFuelSlugState] = useState<string>(
    () => loadString(PREFERRED_FUEL_KEY) ?? DEFAULT_FUEL_SLUG,
  )

  const refresh = useCallback(() => {
    setPreferredFuelSlugState(loadString(PREFERRED_FUEL_KEY) ?? DEFAULT_FUEL_SLUG)
  }, [])

  const setPreferredFuelSlug = useCallback((slug: string) => {
    saveString(PREFERRED_FUEL_KEY, slug)
    setPreferredFuelSlugState(slug)
  }, [])

  return { preferredFuelSlug, setPreferredFuelSlug, refresh }
}
