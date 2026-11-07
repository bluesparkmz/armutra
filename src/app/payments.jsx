import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CheckCircle2, Clock, Wallet, XCircle } from "lucide-react-native";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { formatAmount, formatDateTime as formatDate } from "@/utils/format";
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

const STATUS_META = {
  pending: { label: "Pendente", color: WARNING, Icon: Clock },
  success: { label: "Pago", color: SUCCESS, Icon: CheckCircle2 },
  failed: { label: "Falhou", color: DANGER, Icon: XCircle },
};

function Field({ label, hint, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_MAIN, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={TEXT_MUTED}
        {...props}
        style={{
          borderWidth: 1,
          borderColor: BORDER,
          backgroundColor: BG_SOFT,
          borderRadius: 12,
          paddingHorizontal: 14,
          minHeight: 48,
          fontSize: 15,
          color: TEXT_MAIN,
        }}
      />
      {!!hint && <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 4 }}>{hint}</Text>}
    </View>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: meta.color + "1A",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <meta.Icon size={13} color={meta.color} />
      <Text style={{ fontSize: 12, fontWeight: "700", color: meta.color }}>{meta.label}</Text>
    </View>
  );
}

function ActivePayment({ payment }) {
  const meta = STATUS_META[payment.status] || STATUS_META.pending;
  const pending = payment.status === "pending";
  return (
    <View
      style={{
        backgroundColor: CARD,
        borderWidth: 1.5,
        borderColor: meta.color,
        borderRadius: 16,
        padding: 18,
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      {pending ? (
        <ActivityIndicator color={meta.color} />
      ) : (
        <meta.Icon size={36} color={meta.color} />
      )}
      <Text style={{ fontSize: 18, fontWeight: "800", color: TEXT_MAIN, marginTop: 10 }}>
        {formatAmount(payment.amount, payment.currency)}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: meta.color,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {pending
          ? "A aguardar confirmação"
          : payment.status === "success"
            ? "Pagamento realizado com sucesso"
            : "Pagamento não realizado"}
      </Text>
      <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 6, textAlign: "center" }}>
        {pending
          ? `Confirme o PIN M-Pesa no telemóvel +258 ${payment.msisdn}.`
          : payment.status === "failed"
            ? payment.error || "O pagamento foi cancelado ou recusado."
            : `Referência ${payment.reference || payment.order_id}`}
      </Text>
      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
        Pedido {payment.order_id}
      </Text>
    </View>
  );
}

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;

  const [msisdn, setMsisdn] = useState("");
  const [amount, setAmount] = useState("1");
  const [description, setDescription] = useState("Teste Armutra");
  const [formError, setFormError] = useState("");
  const [activeId, setActiveId] = useState(null);

  const history = useQuery({
    queryKey: ["payments", "list", token],
    enabled: !!token,
    staleTime: 0,
    queryFn: () => armutraApi.getPayments(token),
  });

  // Polling enquanto o pagamento estiver pendente
  const active = useQuery({
    queryKey: ["payments", "detail", activeId],
    enabled: !!token && !!activeId,
    staleTime: 0,
    queryFn: () => armutraApi.getPayment(activeId, token),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  // Quando o estado final chega, actualiza o histórico e o contador de notificações
  const finalStatus = active.data?.status;
  React.useEffect(() => {
    if (finalStatus === "success" || finalStatus === "failed") {
      queryClient.invalidateQueries({ queryKey: ["payments", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [finalStatus, queryClient]);

  const pay = useMutation({
    mutationFn: (payload) => armutraApi.createSkyWalletPayment(payload, token),
    onSuccess: (payment) => {
      queryClient.setQueryData(["payments", "detail", payment.id], payment);
      setActiveId(payment.id);
      queryClient.invalidateQueries({ queryKey: ["payments", "list"] });
    },
    onError: (error) => {
      logError("skywallet-pay", error);
      setFormError(error?.message || "Não foi possível iniciar o pagamento.");
    },
  });

  const activePayment = active.data;
  const isPending = pay.isPending || activePayment?.status === "pending";

  const submit = () => {
    setFormError("");
    const cleanPhone = msisdn.replace(/\D/g, "");
    const phone =
      cleanPhone.startsWith("258") && cleanPhone.length === 12 ? cleanPhone.slice(3) : cleanPhone;
    if (!/^(84|85)\d{7}$/.test(phone)) {
      setFormError("Número M-Pesa inválido. Use 84xxxxxxx ou 85xxxxxxx.");
      return;
    }
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Indique um valor maior que zero.");
      return;
    }
    pay.mutate({
      msisdn: phone,
      amount: value.toFixed(2),
      description: description.trim() || undefined,
    });
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
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>Pagamentos</Text>
        </View>
      </ScreenFixedHeader>

      {!token ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: TEXT_SUB, fontSize: 14, textAlign: "center" }}>
            Entre na sua conta para fazer pagamentos.
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
            refreshControl={
              <RefreshControl
                refreshing={history.isRefetching}
                onRefresh={() => history.refetch()}
                tintColor={ACCENT}
              />
            }
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          >
            {activePayment && <ActivePayment payment={activePayment} />}

            <View
              style={{
                backgroundColor: CARD,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: ACCENT_LIGHT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wallet size={19} color={ACCENT_DARK} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN }}>
                    Pagar com SkyWallet
                  </Text>
                  <Text style={{ fontSize: 12, color: TEXT_SUB }}>Pagamento M-Pesa</Text>
                </View>
              </View>

              <Field
                label="Número M-Pesa"
                value={msisdn}
                onChangeText={setMsisdn}
                placeholder="84xxxxxxx"
                keyboardType="phone-pad"
                maxLength={16}
                editable={!isPending}
                hint="Receberá um pedido de PIN neste número."
              />
              <Field
                label="Valor (MZN)"
                value={amount}
                onChangeText={setAmount}
                placeholder="1.00"
                keyboardType="decimal-pad"
                editable={!isPending}
              />
              <Field
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                placeholder="Teste Armutra"
                maxLength={120}
                editable={!isPending}
              />

              {!!formError && (
                <Text style={{ color: DANGER, fontWeight: "600", fontSize: 13, marginBottom: 12 }}>
                  {formError}
                </Text>
              )}

              <TouchableOpacity
                onPress={submit}
                disabled={isPending}
                activeOpacity={0.85}
                style={{
                  backgroundColor: ACCENT,
                  minHeight: 50,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {pay.isPending && <ActivityIndicator color="#fff" />}
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
                  {pay.isPending
                    ? "A enviar pedido..."
                    : activePayment?.status === "pending"
                      ? "A aguardar confirmação..."
                      : "Pagar com SkyWallet"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 24, marginBottom: 10 }}
            >
              Histórico
            </Text>

            {history.isLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 12 }} />
            ) : history.error ? (
              <Text style={{ color: DANGER, fontWeight: "600" }}>
                Não foi possível carregar o histórico.
              </Text>
            ) : (history.data || []).length ? (
              <View style={{ gap: 10 }}>
                {history.data.map((payment) => (
                  <TouchableOpacity
                    key={payment.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      queryClient.setQueryData(["payments", "detail", payment.id], payment);
                      setActiveId(payment.id);
                    }}
                    style={{
                      backgroundColor: CARD,
                      borderWidth: 1,
                      borderColor: BORDER,
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_MAIN }}>
                        {formatAmount(payment.amount, payment.currency)}
                      </Text>
                      <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
                        {[payment.description, `+258 ${payment.msisdn}`].filter(Boolean).join(" · ")}
                      </Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                        {formatDate(payment.criado_em)}
                      </Text>
                    </View>
                    <StatusBadge status={payment.status} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={{ color: TEXT_SUB, fontSize: 13 }}>Ainda não fez nenhum pagamento.</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}
