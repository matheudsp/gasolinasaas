import { MMKV } from "react-native-mmkv"

export const storage = new MMKV()

/**
 * Adapter que mapeia a API do MMKV para a interface esperada pelo Better Auth
 * (ExpoClientOptions.storage: { setItem, getItem }).
 *
 * MMKV usa `set` / `getString` — Better Auth espera `setItem` / `getItem`.
 *
 * Uso em auth-client.ts:
 *   import { expoClient } from "@better-auth/expo/client"
 *   import { mmkvStorageAdapter } from "@/storage"
 *
 *   export const authClient = createAuthClient({
 *     plugins: [expoClient({ storage: mmkvStorageAdapter })],
 *   })
 */
export const mmkvStorageAdapter = {
  setItem: (key: string, value: string) => storage.set(key, value),
  getItem: (key: string): string | null => storage.getString(key) ?? null,
}

/**
 * Loads a string from storage.
 *
 * @param key The key to fetch.
 */
export function loadString(key: string): string | null {
  try {
    return storage.getString(key) ?? null
  } catch {
    // not sure why this would fail... even reading the RN docs I'm unclear
    return null
  }
}

/**
 * Saves a string to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function saveString(key: string, value: string): boolean {
  try {
    storage.set(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Loads something from storage and runs it thru JSON.parse.
 *
 * @param key The key to fetch.
 */
export function load<T>(key: string): T | null {
  let almostThere: string | null = null
  try {
    almostThere = loadString(key)
    return JSON.parse(almostThere ?? "") as T
  } catch {
    return (almostThere as T) ?? null
  }
}

/**
 * Saves an object to storage.
 *
 * @param key The key to fetch.
 * @param value The value to store.
 */
export function save(key: string, value: unknown): boolean {
  try {
    saveString(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/**
 * Removes something from storage.
 *
 * @param key The key to kill.
 */
export function remove(key: string): void {
  try {
    storage.delete(key)
  } catch {}
}

/**
 * Burn it all to the ground.
 */
export function clear(): void {
  try {
    storage.clearAll()
  } catch {}
}
