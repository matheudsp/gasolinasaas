import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useAppTheme } from "@/theme/context";


export default function TabsLayout() {
const { theme:{colors, typography}} = useAppTheme();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.tint}
      // iconColor={{
      //  default:{color: colors.border},
      //  selected:{color:colors.tint}
      // }}
      iconColor={{
        default: colors.border,
        selected: colors.palette.primary200,
      }}
      rippleColor={colors.palette.primary400}
      labelStyle={{
        default: { color: colors.border, fontWeight:"normal"  },
        selected: { color: colors.tint, fontWeight:"bold" },
        fontFamily: typography.fonts.spaceGrotesk.bold,
      }}

    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>

         <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Minha Conta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}