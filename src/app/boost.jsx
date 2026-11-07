import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CheckCircle2, Rocket, XCircle } from "lucide-react-native";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { formatAmount, formatDate } from "@/utils/format";
import { logError } from "@/utils/logger";
import {
  ACCENT,
  ACCENT_DARK,
  ACCENT_LIGHT,
  BG_SOFT,
  BORDER,
  CARD,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_SUB,
} from "@/theme";

const POLL_INTERVAL_MS = 5000;
const SUCCESS = "#16A34A";
const DANGER = "#DC2626";
const WARNING = "#D97706";
const TYPE_LABELS = { job: "Vaga", service: "Serviço", post: "Publicação" };

const first = (value) => (Array.isArray(value) ? value[0] : value);

export default function BoostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;

  const targetType = first(params.target_type);
  const targetId = first(params.target_id);
  const titulo = first(params.titulo);

  const [adId, setAdId] = useState(first(params.ad_id) || null);
  const [planId, setPlanId] = useState("basico");
  const [msisdn, setMsisdn] = useState("");
  const [formError, setFormError] = useState("");

  const plans = useQuery({
    queryKey: ["ads", "plans"],
    staleTime: 60 * 1000,
    queryFn: () => armutraApi.getAdPlans(),
  });

  // Polling enquanto o pagamento estiver pendente
  const adQuery = useQuery({
    queryKey: ["ads", "detail", adId],
    enabled: !!token && !!adId,
    staleTime: 0,
    queryFn: () => armutraApi.getAd(adId, token),
    refetchInterval: (query) => {
      const ad = query.state.data;
      return ad?.status === "pending_payment" && ad?.payment?.status === "pending"
        ? POLL_INTERVAL_MS
        : false;
    },
  });
  const ad = adQuery.data;

  const startBoost = useMutation({
    mutationFn: async ({ plan, phone }) => {
      // cria (ou reutiliza) o boost por pagar e pede o pagamento M-Pesa
      const created = await armutraApi.createAd(
        { target_type: targetType, target_id: targetId, plan },
        token
      );
      return armutraApi.payAd(created.id, { msisdn: phone }, token);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["ads", "detail", result.id], result);
      setAdId(result.id);
    },
    onError: (error) => {
      logError("boost-start", error);
      setFormError(error?.message || "Não foi possível iniciar o pagamento.");
    },
  });

  const status = ad?.status;
  const paymentStatus = ad?.payment?.status;
  const isActive = status === "active";
  const isWaiting = status === "pending_payment" && paymentStatus === "pending";
  const failed = status === "pending_payment" && paymentStatus === "failed";
  const showForm = !isActive && !isWaiting;

  React.useEffect(() => {
    if (isActive || failed) {
      queryClient.invalidateQueries({ queryKey: ["ads"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    }
  }, [isActive, failed, queryClient]);

  const selectedPlan = (plans.data || []).find((p) => p.id === planId);

  const submit = () => {
    setFormError("");
    const clean = msisdn.replace(/\D/g, "");
    const phone = clean.startsWith("258") && clean.length === 12 ? clean.slice(3) : clean;
    if (!/^(84|85)\d{7}$/.test(phone)) {
      setFormError("Número M-Pesa inválido. Use 84xxxxxxx ou 85xxxxxxx.");
      return;
    }
    if (!targetType || !targetId) {
      setFormError("Item inválido. Volte atrás e escolha o que impulsionar.");
      return;
    }
    startBoost.mutate({ plan: planId, phone });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <ScreenFixedHeader insets={insets}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 8,
            gap: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: BG_SOFT,
              borderWidth: 1,
              borderColor: BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} color={TEXT_MAIN} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>Impulsionar</Text>
        </View>
      </ScreenFixedHeader>

      {!token ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: TEXT_SUB, fontSize: 14, textAlign: "center" }}>
            Entre na sua conta para impulsionar.
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          >
            {/* Alvo */}
            <View
              style={{
                backgroundColor: CARD,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: ACCENT_DARK }}>
                {(TYPE_LABELS[targetType] || "Item").toUpperCase()}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 2 }}>
                {titulo || "Item seleccionado"}
              </Text>
            </View>

            {/* Estado */}
            {isActive && (
              <View
                style={{
                  backgroundColor: CARD,
                  borderWidth: 1.5,
                  borderColor: SUCCESS,
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <CheckCircle2 size={38} color={SUCCESS} />
                <Text style={{ fontSize: 17, fontWeight: "800", color: TEXT_MAIN, marginTop: 10 }}>
                  Boost ativo!
                </Text>
                <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 4, textAlign: "center" }}>
                  Em destaque até {formatDate(ad.ends_at)} (plano {ad.plan_nome}).
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 14,
                    backgroundColor: ACCENT,
                    paddingHorizontal: 22,
                    minHeight: 44,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Concluir</Text>
                </TouchableOpacity>
              </View>
            )}

            {isWaiting && (
              <View
                style={{
                  backgroundColor: CARD,
                  borderWidth: 1.5,
                  borderColor: WARNING,
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <ActivityIndicator color={WARNING} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 10 }}>
                  A aguardar confirmação
                </Text>
                <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 4, textAlign: "center" }}>
                  Confirme o PIN M-Pesa no telemóvel +258 {ad.payment.msisdn} para pagar{" "}
                  {formatAmount(ad.preco, ad.currency)}.
                </Text>
              </View>
            )}

            {failed && (
              <View
                style={{
                  backgroundColor: CARD,
                  borderWidth: 1.5,
                  borderColor: DANGER,
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <XCircle size={34} color={DANGER} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 10 }}>
                  Pagamento não realizado
                </Text>
                <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 4, textAlign: "center" }}>
                  {ad.payment?.error || "O pagamento foi cancelado ou recusado."} Pode tentar de novo.
                </Text>
              </View>
            )}

            {/* Planos + pagamento */}
            {showForm && (
              <>
                <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginBottom: 10 }}>
                  Escolha o plano
                </Text>
                {plans.isLoading ? (
                  <ActivityIndicator color={ACCENT} />
                ) : plans.error ? (
                  <Text style={{ color: DANGER, fontWeight: "600" }}>
                    Não foi possível carregar os planos.
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {(plans.data || []).map((plan) => {
                      const selected = plan.id === planId;
                      return (
                        <TouchableOpacity
                          key={plan.id}
                          onPress={() => setPlanId(plan.id)}
                          disabled={startBoost.isPending}
                          activeOpacity={0.85}
                          style={{
                            backgroundColor: selected ? ACCENT_LIGHT : CARD,
                            borderWidth: 1.5,
                            borderColor: selected ? ACCENT : BORDER,
                            borderRadius: 14,
                            padding: 14,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_MAIN }}>
                              {plan.nome} · {plan.dias} dias
                            </Text>
                            <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }}>
                              {plan.descricao}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 15, fontWeight: "800", color: ACCENT_DARK }}>
                            {formatAmount(plan.preco, plan.currency)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: TEXT_MAIN,
                    marginTop: 18,
                    marginBottom: 6,
                  }}
                >
                  Número M-Pesa
                </Text>
                <TextInput
                  value={msisdn}
                  onChangeText={setMsisdn}
                  placeholder="84xxxxxxx"
                  placeholderTextColor={TEXT_MUTED}
                  keyboardType="phone-pad"
                  maxLength={16}
                  editable={!startBoost.isPending}
                  style={{
                    borderWidth: 1,
                    borderColor: BORDER,
                    backgroundColor: CARD,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    minHeight: 48,
                    fontSize: 15,
                    color: TEXT_MAIN,
                  }}
                />
                <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 4 }}>
                  Pagamento por SkyWallet. Receberá um pedido de PIN neste número.
                </Text>

                {!!formError && (
                  <Text style={{ color: DANGER, fontWeight: "600", fontSize: 13, marginTop: 12 }}>
                    {formError}
                  </Text>
                )}

                <TouchableOpacity
                  onPress={submit}
                  disabled={startBoost.isPending || !selectedPlan}
                  activeOpacity={0.85}
                  style={{
                    marginTop: 18,
                    backgroundColor: ACCENT,
                    minHeight: 50,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    opacity: startBoost.isPending || !selectedPlan ? 0.6 : 1,
                  }}
                >
                  {startBoost.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Rocket size={18} color="#fff" />
                  )}
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
                    {startBoost.isPending
                      ? "A enviar pedido..."
                      : selectedPlan
                        ? `Pagar ${formatAmount(selectedPlan.preco, selectedPlan.currency)} e impulsionar`
                        : "Impulsionar"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
