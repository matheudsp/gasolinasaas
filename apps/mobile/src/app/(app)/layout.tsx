import { Redirect, Slot, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "@/lib/auth";

export default function AppLayout() {
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!data?.user) return <Redirect href="/(auth)/sign-in" />;

  return (
   <Slot />
  );
}