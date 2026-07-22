import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("token").then((token) => {
      const onLoginScreen = segments[0] === "login";
      if (!token && !onLoginScreen) {
        router.replace("/login");
      }
      setCheckedAuth(true);
    });
  }, [segments]);

  // evita renderizar as telas protegidas antes de saber se tem token
  if (!checkedAuth) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: "Agendamento", presentation: "card" }} />
    </Stack>
  );
}
