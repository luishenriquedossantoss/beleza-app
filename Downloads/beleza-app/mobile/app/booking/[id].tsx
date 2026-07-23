import { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Image } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { colors, radius } from "../../theme/colors";
import { api, Booking } from "../../services/api";

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [charging, setCharging] = useState(false);
  const [remainingCharge, setRemainingCharge] = useState<{ pixCopiaECola: string; pixQrCodeBase64: string } | null>(
    null
  );

  useFocusEffect(
    useCallback(() => {
      api.getBooking(id).then(setBooking);
    }, [id])
  );

  if (!booking) return null;

  const initials = booking.client.name.split(" ").slice(0, 2).map((n) => n[0]).join("");
  const depositPercent = Math.round((booking.depositCents / booking.service.priceCents) * 100);
  const remainingCents = booking.service.priceCents - booking.depositCents;

  const resendCharge = async () => {
    await api.resendCharge(booking.id);
    Alert.alert("Cobranca reenviada", `Enviamos o link de pagamento pro WhatsApp de ${booking.client.name}.`);
  };

  const chargeRemaining = async () => {
    setCharging(true);
    try {
      const result = await api.chargeRemaining(booking.id);
      setRemainingCharge(result);
    } catch (err: any) {
      Alert.alert("Não foi possível cobrar", err.message);
    } finally {
      setCharging(false);
    }
  };

  const cancelBooking = () => {
    Alert.alert("Cancelar agendamento", "Tem certeza que quer cancelar esse horario?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar agendamento",
        style: "destructive",
        onPress: async () => {
          await api.cancelBooking(booking.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Text style={styles.backText}>Voltar pra agenda</Text>
      </Pressable>

      <View style={styles.clientHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.clientName}>{booking.client.name}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Servico</Text>
          <Text style={styles.rowValue}>{booking.service.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Horario</Text>
          <Text style={styles.rowValue}>
            {new Date(booking.startAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            {" · "}
            {booking.service.durationMin} min
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Valor total</Text>
          <Text style={styles.rowValue}>{formatCents(booking.service.priceCents)}</Text>
        </View>
      </View>

      {!booking.depositPaid && booking.status !== "CANCELED" && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Sinal ainda nao pago</Text>
          <Text style={styles.warningSubtitle}>
            {formatCents(booking.depositCents)} · {depositPercent}% do valor
          </Text>
        </View>
      )}

      {booking.depositPaid && booking.status !== "CANCELED" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Restante do servico</Text>

          {booking.remainingPaid ? (
            <View style={[styles.statusPill, { backgroundColor: colors.successTint }]}>
              <Text style={{ color: colors.successTextStrong, fontWeight: "500", fontSize: 13 }}>
                Restante pago · {formatCents(remainingCents)}
              </Text>
            </View>
          ) : remainingCharge ? (
            <View style={{ alignItems: "center" }}>
              <Image
                source={{ uri: `data:image/png;base64,${remainingCharge.pixQrCodeBase64}` }}
                style={{ width: 180, height: 180, marginBottom: 10 }}
              />
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center", marginBottom: 6 }}>
                Peça pro cliente escanear com o app do banco dele
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                Falta cobrar {formatCents(remainingCents)} pra fechar esse atendimento.
              </Text>
              <Pressable style={styles.primaryButton} onPress={chargeRemaining} disabled={charging}>
                <Text style={styles.primaryButtonText}>
                  {charging ? "Gerando cobranca..." : `Cobrar restante · ${formatCents(remainingCents)}`}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {booking.status !== "CANCELED" && (
        <Pressable style={styles.primaryButton} onPress={resendCharge}>
          <Text style={styles.primaryButtonText}>Reenviar cobranca pelo WhatsApp</Text>
        </Pressable>
      )}

      {booking.status !== "CANCELED" && (
        <Pressable style={styles.dangerButton} onPress={cancelBooking}>
          <Text style={styles.dangerButtonText}>Cancelar agendamento</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20 },
  backRow: { marginBottom: 18 },
  backText: { fontSize: 14, color: colors.textSecondary },
  clientHeader: { alignItems: "center", marginBottom: 18 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: { fontSize: 18, fontWeight: "500", color: colors.brandTextOnTint },
  clientName: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: "500", color: colors.textPrimary },
  sectionTitle: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  statusPill: { borderRadius: radius.sm, padding: 10, alignItems: "center" },
  warningCard: { backgroundColor: colors.warningTint, borderRadius: radius.lg, padding: 16, marginBottom: 14 },
  warningTitle: { fontSize: 13, fontWeight: "500", color: colors.warningTextStrong },
  warningSubtitle: { fontSize: 12, color: colors.warning, marginTop: 3 },
  primaryButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", marginBottom: 10 },
  primaryButtonText: { color: colors.brandTint, fontWeight: "500", fontSize: 15 },
  dangerButton: { borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 13, alignItems: "center" },
  dangerButtonText: { color: colors.danger, fontWeight: "500", fontSize: 15 },
});
