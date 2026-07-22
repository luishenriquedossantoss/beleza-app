import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { colors, radius } from "../theme/colors";
import { api } from "../services/api";

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!phone || !password || (mode === "register" && !name)) {
      Alert.alert("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === "login" ? await api.login(phone, password) : await api.register(name, phone, password);
      await AsyncStorage.setItem("token", result.token);
      await AsyncStorage.setItem("professional", JSON.stringify(result.professional));
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Nao foi possivel continuar", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{mode === "login" ? "Entrar" : "Criar conta"}</Text>
      <Text style={styles.subtitle}>
        {mode === "login" ? "Acesse sua agenda" : "Comece a receber agendamentos hoje"}
      </Text>

      {mode === "register" && (
        <TextInput
          style={styles.input}
          placeholder="Seu nome"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.primaryButton} onPress={submit} disabled={loading}>
        <Text style={styles.primaryButtonText}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
        </Text>
      </Pressable>

      <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
        <Text style={styles.switchText}>
          {mode === "login" ? "Nao tem conta? Criar agora" : "Ja tem conta? Entrar"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 24 },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  primaryButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  primaryButtonText: { color: colors.brandTint, fontWeight: "500", fontSize: 15 },
  switchText: { textAlign: "center", color: colors.textSecondary, fontSize: 13, marginTop: 16 },
});
