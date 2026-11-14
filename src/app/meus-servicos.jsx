import React from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles } from "lucide-react-native";
import { armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { displayMoney } from "@/utils/formatMoney";
import { ACCENT, ACCENT_DARK, BG_SOFT, BORDER, CARD, TEXT_MAIN, TEXT_SUB } from "@/theme";

export default function MeusServicosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;

  const services = useQuery({
    queryKey: ["services", "mine", token, auth?.user?.id],
    enabled: !!token && !!auth?.user?.id,
    queryFn: () => armutraApi.getMyServices(auth.user.id, token),
  });

  const remove = useMutation({
    mutationFn: (id) => armutraApi.deleteService(id, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services", "mine"] }),
    onError: (error) => Alert.alert("Serviço", error.message),
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: TEXT_MAIN }}>Meus serviços</Text>
        <TouchableOpacity onPress={() => router.push("/create-service")}>
          <Text style={{ color: ACCENT_DARK, fontWeight: "800" }}>Novo</Text>
        </TouchableOpacity>
      </View>
      {!token ? (
        <Text style={{ padding: 20, color: TEXT_SUB }}>Entre na sua conta para ver os serviços.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
          {services.isLoading ? (
            <ActivityIndicator color={ACCENT} />
          ) : (services.data || []).length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
              <Sparkles size={28} color={TEXT_SUB} />
              <Text style={{ color: TEXT_SUB, textAlign: "center" }}>Ainda não publicou serviços.</Text>
              <TouchableOpacity
                onPress={() => router.push("/create-service")}
                style={{ backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Criar serviço</Text>
              </TouchableOpacity>
            </View>
          ) : (
            services.data.map((service) => (
              <View
                key={service.id}
                style={{ backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 8 }}
              >
                <Text style={{ fontWeight: "800", color: TEXT_MAIN }}>{service.titulo}</Text>
                <Text style={{ color: TEXT_SUB }} numberOfLines={2}>{service.descricao}</Text>
                <Text style={{ color: ACCENT_DARK, fontWeight: "700" }}>
                  {displayMoney(service.preco) || service.preco} · {service.categoria}
                </Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/boost",
                        params: { target_type: "service", target_id: service.id, titulo: service.titulo },
                      })
                    }
                    style={{
                      paddingHorizontal: 12,
                      minHeight: 34,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: BORDER,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: TEXT_MAIN }}>Impulsionar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Apagar serviço", `Apagar "${service.titulo}"?`, [
                        { text: "Cancelar", style: "cancel" },
                        { text: "Apagar", style: "destructive", onPress: () => remove.mutate(service.id) },
                      ])
                    }
                    style={{
                      paddingHorizontal: 12,
                      minHeight: 34,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: BORDER,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: "#DC2626" }}>Apagar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
