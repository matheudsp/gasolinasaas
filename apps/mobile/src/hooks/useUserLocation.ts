import { useCallback, useEffect, useState } from "react"
import * as Location from "expo-location"

interface Coords {
  latitude: number
  longitude: number
}

export function useUserLocation() {
  const [location, setLocation] = useState<Coords | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const requestLocation = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setPermissionDenied(true)
        return
      }

      setPermissionDenied(false)

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })

      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao obter localização"
      console.error("[useUserLocation]", message)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  return { location, permissionDenied, error, isLoading, requestLocation }
}
