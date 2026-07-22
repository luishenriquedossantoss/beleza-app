import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, radius } from "../../theme/colors";
import { api } from "../../services/api";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type DayConfig = { enabled: boolean; start: string; end: string };

function minutesToTime(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

const defaultDay: DayConfig = { enabled: false, start: "09:00", end: "18:00" };

export default function HoursScreen() {
  const [days, setDays] = useState<DayConfig[]>(WEEKDAYS.map(() => ({ ...defaultDay })));
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.getWorkHours().then((hours) => {
        const next = WEEKDAYS.map(() => ({ ...defaultDay }));
        hours.forEach((h) => {
          next[h.weekday] = { enabled: true, start: minutesToTime(h.startMinutes), end: minutesToTime(h.endMinutes) };
        });
        setDays(next);
      });
    }, [])
  );

  const updateDay = (index: number, patch: Partial<DayConfig>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const hours = days
        .map((d, weekday) => ({ ...d, weekday }))
        .filter((d) => d.enabled)
        .map((d) => ({
          weekday: d.weekday,
          startMinutes: timeToMinutes(d.start),
          endMinutes: timeToMinutes(d.end),
        }));
      await api.setWorkHours(hours);
      Alert.alert("Horário salvo", "Seus horários de atendimento foram atualizados.");
    } catch (err: any) {
      Alert.alert("Não foi possível salvar", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Horário de atendimento</Text>
      <Text style={styles.subtitle}>
        Só os dias marcados aqui aparecem como disponíveis na sua página pública de agendamento.
      </Text>

      {WEEKDAYS.map((label, index) => {
        const day = days[index];
        return (
          <View key={label} style={styles.dayRow}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{label}</Text>
              <Switch
                value={day.enabled}
                onValueChange={(v) => updateDay(index, { enabled: v })}
                trackColor={{ false: colors.border, true: colors.brand }}
              />
            </View>
            {day.enabled && (
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  value={day.start}
                  onChangeText={(v) => updateDay(index, { start: v })}
                  placeholder="09:00"
                />
                <Text style={styles.timeSeparator}>até</Text>
                <TextInput
                  style={styles.timeInput}
                  value={day.end}
                  onChangeText={(v) => updateDay(index, { end: v })}
                  placeholder="18:00"
                />
              </View>
            )}
          </View>
        );
      })}

      <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? "Salvando..." : "Salvar horário"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 19, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  dayRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginBottom: 10 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayLabel: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  timeInput: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: "center",
  },
  timeSeparator: { fontSize: 12, color: colors.textSecondary },
  saveButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveButtonText: { color: colors.brandTint, fontWeight: "500", fontSize: 15 },
});
