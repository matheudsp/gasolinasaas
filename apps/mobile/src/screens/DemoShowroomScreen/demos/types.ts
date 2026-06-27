import { ReactElement } from "react"

import type { Theme } from "@/theme/types"

export interface Demo {
  name: string
  data: ({ themed, theme }: { themed: any; theme: Theme }) => ReactElement[]
}
