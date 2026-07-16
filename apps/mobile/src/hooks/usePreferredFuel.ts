import { useCallback, useState } from "react"
import { loadString, remove, saveString } from "@/utils/storage"

const PREFERRED_FUEL_KEY = "preferredFuelSlug"

export const DEFAULT_FUEL_SLUG = "gasolina-comum"

/** Combustíveis variam por rede — a troca de tenant reseta a preferência. */
export function clearPreferredFuel() {
  remove(PREFERRED_FUEL_KEY)
}

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
