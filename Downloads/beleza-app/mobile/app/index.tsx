import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Share, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { colors, radius } from "../theme/colors";
import { api, Booking } from "../services/api";

function startOfDayISO(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfDayISO(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function statusColor(booking: Booking) {
  if (booking.status === "CONFIRMED") return colors.success;
  if (booking.status === "PENDING_PAYMENT") return colors.warning;
  return colors.border;
}

export default function AgendaScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [professionalName, setProfessionalName] = useState("");
  const [professionalSlug, setProfessionalSlug] = useState("");

  const load = useCallback(async () => {
    const today = new Date();
    const data = await api.getBookings(startOfDayISO(today), endOfDayISO(today));
    setBookings(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const pendingCount = bookings.filter((b) => !b.depositPaid && b.status !== "CANCELED").length;
  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const shareLink = () => {
    Share.share({ message: `Agende seu horario comigo: https://beleza-app.com/r/${professionalSlug}` });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.greeting}>Bom dia{professionalName ? `, ${professionalName}` : ""}</Text>
      <Text style={styles.date}>{todayLabel}</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.brandTint }]}>
          <Text style={[styles.statNumber, { color: colors.brandTextStrong }]}>{bookings.length}</Text>
          <Text style={[styles.statLabel, { color: colors.brandTextOnTint }]}>agendamentos hoje</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warningTint }]}>
          <Text style={[styles.statNumber, { color: colors.warningTextStrong }]}>{pendingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.warning }]}>sinal pendente</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Sua agenda</Text>

      <FlatList
        data={bookings}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento hoje ainda.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.bookingRow, { borderLeftColor: statusColor(item) }]}
            onPress={() => router.push(`/booking/${item.id}`)}
          >
            <Text style={styles.time}>
              {new Date(item.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </Text>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.client.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientName}>{item.client.name}</Text>
              <Text style={styles.serviceName}>{item.service.name}</Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable style={styles.shareButton} onPress={shareLink}>
        <Text style={styles.shareButtonText}>Compartilhar link de agendamento</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20 },
  greeting: { fontSize: 13, color: colors.textSecondary },
  date: { fontSize: 19, fontWeight: "500", color: colors.textPrimary, marginTop: 2, marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: radius.md, padding: 14 },
  statNumber: { fontSize: 22, fontWeight: "500" },
  statLabel: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 10 },
  empty: { color: colors.textMuted, fontSize: 14, paddingVertical: 20, textAlign: "center" },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
  },
  time: { fontSize: 14, fontWeight: "500", minWidth: 42, color: colors.textPrimary },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 12, fontWeight: "500", color: colors.brandTextOnTint },
  clientName: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  serviceName: { fontSize: 12, color: colors.textSecondary },
  shareButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  shareButtonText: { color: colors.brandTint, fontWeight: "500", fontSize: 15 },
});
