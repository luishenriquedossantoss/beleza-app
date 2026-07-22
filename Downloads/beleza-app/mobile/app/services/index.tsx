import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { colors, radius } from "../../theme/colors";
import { api } from "../../services/api";

type ServiceForm = { name: string; durationMin: string; priceReais: string };
const emptyForm: ServiceForm = { name: "", durationMin: "", priceReais: "" };

export default function ServicesScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  const load = useCallback(() => {
    api.getServices().then(setServices);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addService = async () => {
    if (!form.name || !form.durationMin || !form.priceReais) {
      Alert.alert("Preencha todos os campos pra cadastrar o servico.");
      return;
    }
    try {
      await api.createService({
        name: form.name,
        durationMin: parseInt(form.durationMin, 10),
        priceCents: Math.round(parseFloat(form.priceReais.replace(",", ".")) * 100),
      });
      setForm(emptyForm);
      load();
    } catch (err: any) {
      Alert.alert("Nao foi possivel cadastrar", err.message);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Seus servicos</Text>

      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        style={{ marginBottom: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum servico cadastrado ainda.</Text>}
        renderItem={({ item }) => (
          <View style={styles.serviceRow}>
            <View>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.serviceMeta}>{item.durationMin} min</Text>
            </View>
            <Text style={styles.servicePrice}>{(item.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
          </View>
        )}
      />

      <Text style={styles.sectionLabel}>Novo servico</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome do servico"
        placeholderTextColor={colors.textMuted}
        value={form.name}
        onChangeText={(v) => setForm({ ...form, name: v })}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Duracao (min)"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={form.durationMin}
          onChangeText={(v) => setForm({ ...form, durationMin: v })}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Preco (R$)"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          value={form.priceReais}
          onChangeText={(v) => setForm({ ...form, priceReais: v })}
        />
      </View>

      <Pressable style={styles.addButton} onPress={addService}>
        <Text style={styles.addButtonText}>Cadastrar servico</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 19, fontWeight: "500", color: colors.textPrimary, marginBottom: 16 },
  empty: { color: colors.textMuted, fontSize: 14, paddingVertical: 12 },
  sectionLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 8 },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
  },
  serviceName: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  serviceMeta: { fontSize: 12, color: colors.textSecondary },
  servicePrice: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  input: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  addButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  addButtonText: { color: colors.brandTint, fontWeight: "500", fontSize: 15 },
});
