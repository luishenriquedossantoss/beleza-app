import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { colors, radius } from "../../theme/colors";
import { api } from "../../services/api";

export default function AccountScreen() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connecting, setConnecting] = useState(false);

    const loadStatus = useCallback(async () => {
    setChecking(true);
    try {
      const status = await api.getPaymentConnectStatus();
      setConnected(status.connected);
    } catch (err) {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  const connect = async () => {
    setConnecting(true);
    try {
      const { url } = await api.getPaymentConnectUrl();
      const redirectUrl = Linking.createURL("payment-connected");
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type === "success") {
        await loadStatus();
        Alert.alert("Conectado!", "Os pagamentos dos seus clientes agora caem direto na sua conta Mercado Pago.");
      }
    } catch (err: any) {
      Alert.alert("Não foi possível conectar", err.message);
    } finally {
      setConnecting(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Recebimento de pagamentos</Text>
      <Text style={styles.subtitle}>
        Conecte sua conta do Mercado Pago pra receber os sinais pagos pelos seus clientes direto
        na sua conta — o valor nunca passa pela nossa.
      </Text>

      <View style={[styles.statusCard, { backgroundColor: connected ? colors.successTint : colors.warningTint }]}>
        <Text style={{ color: connected ? colors.successTextStrong : colors.warningTextStrong, fontWeight: "500" }}>
          {connected ? "Conta conectada" : "Nenhuma conta conectada ainda"}
        </Text>
        {!connected && (
          <Text style={{ color: colors.warning, fontSize: 12, marginTop: 4 }}>
            Sem isso, seus clientes não conseguem pagar o sinal pelo link público.
          </Text>
        )}
      </View>

      <Pressable style={styles.connectButton} onPress={connect} disabled={connecting}>
        <Text style={styles.connectButtonText}>
          {connecting ? "Abrindo Mercado Pago..." : connected ? "Reconectar conta" : "Conectar conta do Mercado Pago"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 19, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  statusCard: { borderRadius: radius.md, padding: 14, marginBottom: 20 },
  connectButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 14, alignItems: "center" },
  connectButtonText: { color: colors.brandTint, fontWeight: "500", fontSize: 15 },
});