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
import { armutraApi, paymentStatus } from "@/utils/api";
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

const SUBSCRIPTION_LABEL = {
  active: "Activa",
  cancelled: "Cancelada",
  expired: "Expirada",
};

function Field({ label, hint, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_MAIN, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        placeholderTextColor={TEXT_MUTED}
        selectionColor={ACCENT}
        cursorColor={ACCENT}
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
      {pending ? <ActivityIndicator color={meta.color} /> : <meta.Icon size={36} color={meta.color} />}
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
          ? `Confirme o PIN M-Pesa no telemóvel${payment.msisdn ? ` +258 ${payment.msisdn}` : ""}.`
          : payment.status === "failed"
            ? payment.error || payment.message || "O pagamento foi cancelado ou recusado."
            : `Referência ${payment.reference || payment.order_id}`}
      </Text>
      {!!payment.order_id && (
        <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>Pedido {payment.order_id}</Text>
      )}
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
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const billing = useQuery({
    queryKey: ["billing", token],
    enabled: !!token,
    staleTime: 0,
    queryFn: () => armutraApi.getBilling(token),
    refetchInterval: (query) => {
      if (!activeOrderId) return false;
      const match = (query.state.data?.payments || []).find((item) => item.order_id === activeOrderId);
      return !match || match.status === "pending" ? POLL_INTERVAL_MS : false;
    },
  });

  const matched = (billing.data?.payments || []).find((item) => item.order_id === activeOrderId);
  const activePayment = matched || snapshot;

  React.useEffect(() => {
    if (activePayment?.status === "success" || activePayment?.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }, [activePayment?.status, queryClient]);

  const pay = useMutation({
    mutationFn: (payload) => armutraApi.createMpesaOrder(payload, token),
    onSuccess: (order, variables) => {
      const next = {
        id: order.order_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency || "MZN",
        status: paymentStatus(order.status),
        reference: order.reference,
        msisdn: variables.msisdn,
        description: variables.description,
        message: order.message,
        error: paymentStatus(order.status) === "failed" ? order.message : null,
      };
      setSnapshot(next);
      setActiveOrderId(order.order_id);
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (error) => {
      logError("skywallet-pay", error);
      setFormError(error?.message || "Não foi possível iniciar o pagamento.");
    },
  });

  const isPending = pay.isPending || activePayment?.status === "pending";
  const mpesaEnabled = billing.data?.mpesaEnabled !== false;

  const submit = () => {
    setFormError("");
    const cleanPhone = msisdn.replace(/\D/g, "");
    const phone =
      cleanPhone.startsWith("258") && cleanPhone.length === 12 ? cleanPhone.slice(3) : cleanPhone;
    if (!/^(84|85)\d{7}$/.test(phone)) {
      setFormError("Número M-Pesa inválido. Use 84xxxxxxx ou 85xxxxxxx.");
      return;
    }
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Indique um valor maior que zero.");
      return;
    }
    pay.mutate({
      msisdn: phone,
      purpose: "payment",
      amount: Number(value.toFixed(2)),
      description: description.trim() || "Teste Armutra",
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={billing.isRefetching}
                onRefresh={() => billing.refetch()}
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
                  <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN }}>Pagar com SkyWallet</Text>
                  <Text style={{ fontSize: 12, color: TEXT_SUB }}>Pagamento M-Pesa de teste</Text>
                </View>
              </View>

              <Field
                label="Valor (MZN)"
                value={amount}
                onChangeText={setAmount}
                placeholder="1.00"
                keyboardType="decimal-pad"
                editable={!isPending && mpesaEnabled}
              />
              <Field
                label="Descrição"
                value={description}
                onChangeText={setDescription}
                placeholder="Teste Armutra"
                maxLength={120}
                editable={!isPending && mpesaEnabled}
              />
              <Field
                label="Número M-Pesa"
                value={msisdn}
                onChangeText={setMsisdn}
                placeholder="84xxxxxxx"
                keyboardType="phone-pad"
                maxLength={16}
                editable={!isPending && mpesaEnabled}
                hint="Receberá um pedido de PIN neste número."
              />

              {!mpesaEnabled && (
                <Text style={{ color: WARNING, fontWeight: "600", fontSize: 13, marginBottom: 12 }}>
                  O M-Pesa está desligado neste momento.
                </Text>
              )}

              {!!formError && (
                <Text style={{ color: DANGER, fontWeight: "600", fontSize: 13, marginBottom: 12 }}>{formError}</Text>
              )}

              <TouchableOpacity
                onPress={submit}
                disabled={isPending || !mpesaEnabled}
                activeOpacity={0.85}
                style={{
                  backgroundColor: ACCENT,
                  minHeight: 50,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  opacity: isPending || !mpesaEnabled ? 0.6 : 1,
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

            {(billing.data?.subscriptions || []).length > 0 && (
              <>
                <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 24, marginBottom: 10 }}>
                  Subscrições
                </Text>
                <View style={{ gap: 10 }}>
                  {billing.data.subscriptions.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        backgroundColor: CARD,
                        borderWidth: 1,
                        borderColor: BORDER,
                        borderRadius: 14,
                        padding: 14,
                      }}
                    >
                      <Text style={{ fontWeight: "800", color: TEXT_MAIN }}>{item.plan?.name || "Plano"}</Text>
                      <Text style={{ color: TEXT_SUB, marginTop: 4, fontSize: 12 }}>
                        {SUBSCRIPTION_LABEL[item.status] || item.status}
                        {item.ends_at ? ` · até ${formatDate(item.ends_at)}` : ""}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 24, marginBottom: 10 }}>
              Histórico
            </Text>

            {billing.isLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 12 }} />
            ) : billing.error ? (
              <Text style={{ color: DANGER, fontWeight: "600" }}>Não foi possível carregar o histórico.</Text>
            ) : (billing.data?.payments || []).length ? (
              <View style={{ gap: 10 }}>
                {billing.data.payments.map((payment) => (
                  <TouchableOpacity
                    key={payment.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSnapshot(payment);
                      setActiveOrderId(payment.order_id);
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
                        {payment.description}
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
