import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { useAppTheme } from "@/theme/context";

export default function TabsLayout() {
  const {
    theme: { colors, typography },
  } = useAppTheme();

  // A tab "Operador" só existe para owner/operator do tenant. Enquanto o
  // papel carrega, fica oculta — aparece assim que a query resolve.
  const { data: roleData } = useQuery(orpc.loyalty.myRole.queryOptions());
  const isOperator = roleData?.role === "owner" || roleData?.role === "operator";

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.tint}
      iconColor={{
        default: colors.border,
        selected: colors.palette.primary200,
      }}
      rippleColor={colors.palette.primary400}
      labelStyle={{
        default: { color: colors.border, fontWeight: "normal" },
        selected: { color: colors.tint, fontWeight: "bold" },
        fontFamily: typography.fonts.spaceGrotesk.bold,
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Início</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="loyalty">
        <NativeTabs.Trigger.Label>Meus pontos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="star.circle.fill" md="loyalty" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="operator" hidden={!isOperator}>
        <NativeTabs.Trigger.Label>Operador</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Minha Conta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
