import { useEffect } from "react"
import { ImageSourcePropType } from "react-native"
import Constants from "expo-constants"
import { useQuery } from "@tanstack/react-query"

import Config from "@/config"
import { useActiveTenantSlug } from "@/lib/activeTenant"
import { orpc } from "@/lib/orpc"
import { BRANDING_STORAGE_KEY, type TenantBranding } from "@/theme/tenantBranding"
import { load, save } from "@/utils/storage"

/**
 * Branding white-label do tenant, vindo do server (`tenant.branding`).
 *
 * O logo e as cores NÃO podem ser estáticos no bundle: como o bundle JS é
 * o mesmo para todos os tenants (EAS Update com fingerprint), um update OTA
 * mostraria a identidade de um tenant nos apps dos outros. Aqui tudo vem do
 * server por tenant, com cache local (MMKV) para abrir offline e fallback
 * para o asset/tema embarcados no binário. As cores são aplicadas ao tema
 * pelo ThemeProvider, que lê o mesmo cache (theme/tenantBranding.ts).
 */

const fallbackLogo: ImageSourcePropType = require("@assets/images/logo2.png")

/** Caminhos vêm relativos do server; cada cliente prefixa a própria base de API. */
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith("http") ? url : `${Config.API_URL}${url}`
}

export function useTenantBranding() {
  const [activeSlug] = useActiveTenantSlug()

  const query = useQuery({
    ...orpc.tenant.branding.queryOptions(),
    // Sem rede escolhida não há o que buscar — sem header o server
    // responderia NOT_FOUND em loop.
    enabled: !!activeSlug,
    staleTime: 1000 * 60 * 60,
    // Cache local: o app abre com o último branding conhecido mesmo offline.
    placeholderData: () => load<TenantBranding>(BRANDING_STORAGE_KEY) ?? undefined,
  })

  const branding = query.data

  useEffect(() => {
    if (query.isSuccess && query.data) {
      save(BRANDING_STORAGE_KEY, query.data)
    }
  }, [query.isSuccess, query.data])

  const logoUri = resolveImageUrl(branding?.logoUrl ?? null)

  return {
    /** Nome da rede — fallback pro nome do binário enquanto o server não responde. */
    name: branding?.name ?? Constants.expoConfig?.name ?? "App",
    /** Pronto pra passar direto num <Image source={...}>. */
    logoSource: (logoUri ? { uri: logoUri } : fallbackLogo) as ImageSourcePropType,
    /** Cores do tema do tenant (nulas = tema padrão do build). */
    colors: branding?.colors ?? { primary: null },
  }
}

/**
 * Componente de boot: montado no root layout para o branding começar a
 * carregar (e o cache aquecer) antes de qualquer tela que o use.
 */
export function TenantBrandingLoader() {
  useTenantBranding()
  return null
}
