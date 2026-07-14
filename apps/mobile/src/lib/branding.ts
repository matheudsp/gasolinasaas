import { useEffect } from "react"
import { ImageSourcePropType } from "react-native"
import Constants from "expo-constants"
import { useQuery } from "@tanstack/react-query"

import Config from "@/config"
import { orpc } from "@/lib/orpc"
import { load, save } from "@/utils/storage"

/**
 * Branding white-label do tenant, vindo do server (`tenant.branding`).
 *
 * O logo NÃO pode ser um require estático compartilhado: como o bundle JS é
 * o mesmo para todos os tenants (EAS Update com fingerprint), um update OTA
 * mostraria o logo de um tenant nos apps dos outros. Aqui o logo vem do
 * server (R2) por tenant, com cache local (MMKV) para abrir offline e
 * fallback para o asset embarcado no binário.
 */

const fallbackLogo: ImageSourcePropType = require("@assets/images/logo.png")

const BRANDING_STORAGE_KEY = "tenant.branding.v1"

type TenantBranding = {
  name: string
  slug: string
  logoUrl: string | null
  colors: {
    primary: string | null
    background: string | null
  }
}

/** Caminhos vêm relativos do server; cada cliente prefixa a própria base de API. */
function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  return url.startsWith("http") ? url : `${Config.API_URL}${url}`
}

export function useTenantBranding() {
  const query = useQuery({
    ...orpc.tenant.branding.queryOptions(),
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
    colors: branding?.colors ?? { primary: null, background: null },
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
