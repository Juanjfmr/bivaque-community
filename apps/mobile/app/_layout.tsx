import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { nativeTokens } from "@bivaque/tokens"

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={nativeTokens.color.background} />
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
