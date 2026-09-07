import { nativeTokens } from "@bivaque/tokens"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: nativeTokens.color.background },
          animation: "fade_from_bottom",
        }}
      />
    </>
  )
}
