import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Megaphone, Rocket } from "lucide-react-native";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { formatAmount, formatDate } from "@/utils/format";
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

const SUCCESS = "#16A34A";
const WARNING = "#D97706";
const DANGER = "#DC2626";

const TYPE_LABELS = { job: "Vaga", service: "Serviço", post: "Publicação" };
const AD_STATUS = {
  active: { label: "Ativo", color: SUCCESS },
  pending_payment: { label: "Por pagar", color: WARNING },
  expired: { label: "Expirado", color: TEXT_MUTED },
};

function Badge({ label, color }) {
  return (
    <View
      style={{
        backgroundColor: color + "1A",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return (
    <Text
      style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN, marginTop: 24, marginBottom: 10 }}
    >
      {children}
    </Text>
  );
}

const rowStyle = {
  backgroundColor: CARD,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 14,
  padding: 14,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
};

export default function AdsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const token = auth?.accessToken;

  const boostable = useQuery({
    queryKey: ["ads", "boostable", token],
    enabled: !!token,
    staleTime: 0,
    queryFn: () => armutraApi.getBoostable(token),
  });
  const myAds = useQuery({
    queryKey: ["ads", "mine", token],
    enabled: !!token,
    staleTime: 0,
    queryFn: () => armutraApi.getMyAds(token),
  });

  // Ao voltar da tela de pagamento, actualiza o estado dos boosts
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        boostable.refetch();
        myAds.refetch();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])
  );

  const refreshing = boostable.isRefetching || myAds.isRefetching;
  const items = boostable.data || [];
  const ads = myAds.data || [];

  const openBoost = (params) => router.push({ pathname: "/boost", params });

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
            Entre na sua conta para impulsionar os seus anúncios.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                boostable.refetch();
                myAds.refetch();
              }}
              tintColor={ACCENT}
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        >
          <View
            style={{
              backgroundColor: ACCENT_LIGHT,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
            }}
          >
            <Megaphone size={26} color={ACCENT_DARK} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: ACCENT_DARK }}>
                Apareça primeiro
              </Text>
              <Text style={{ fontSize: 12, color: ACCENT_DARK, marginTop: 2 }}>
                Impulsione uma vaga, serviço ou publicação e fique no topo das listas. Preços de
                teste: 1 MT por plano.
              </Text>
            </View>
          </View>

          <SectionTitle>Os meus itens</SectionTitle>
          {boostable.isLoading ? (
            <ActivityIndicator color={ACCENT} />
          ) : boostable.error ? (
            <Text style={{ color: DANGER, fontWeight: "600" }}>
              Não foi possível carregar os seus itens.
            </Text>
          ) : items.length ? (
            <View style={{ gap: 10 }}>
              {items.map((item) => {
                const boosted = !!item.impulsionado_ate;
                return (
                  <View key={`${item.target_type}-${item.target_id}`} style={rowStyle}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: ACCENT_DARK }}>
                        {TYPE_LABELS[item.target_type]?.toUpperCase()}
                      </Text>
                      <Text
                        style={{ fontSize: 15, fontWeight: "800", color: TEXT_MAIN, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {item.titulo}
                      </Text>
                      {!!item.subtitulo && (
                        <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
                          {item.subtitulo}
                        </Text>
                      )}
                      {boosted && (
                        <Text style={{ fontSize: 12, color: SUCCESS, fontWeight: "700", marginTop: 4 }}>
                          Impulsionado até {formatDate(item.impulsionado_ate)}
                        </Text>
                      )}
                    </View>
                    {!boosted && (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() =>
                          openBoost({
                            target_type: item.target_type,
                            target_id: item.target_id,
                            titulo: item.titulo,
                          })
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: ACCENT,
                          paddingHorizontal: 12,
                          minHeight: 38,
                          borderRadius: 10,
                        }}
                      >
                        <Rocket size={15} color="#fff" />
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
                          Impulsionar
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: TEXT_SUB, fontSize: 13 }}>
              Ainda não tem vagas, serviços ou publicações para impulsionar. Crie um primeiro.
            </Text>
          )}

          <SectionTitle>Os meus anúncios</SectionTitle>
          {myAds.isLoading ? (
            <ActivityIndicator color={ACCENT} />
          ) : ads.length ? (
            <View style={{ gap: 10 }}>
              {ads.map((ad) => {
                const meta = AD_STATUS[ad.status] || AD_STATUS.expired;
                const pending = ad.status === "pending_payment";
                return (
                  <TouchableOpacity
                    key={ad.id}
                    activeOpacity={pending ? 0.85 : 1}
                    onPress={() =>
                      pending &&
                      openBoost({
                        ad_id: ad.id,
                        target_type: ad.target_type,
                        target_id: ad.target_id,
                        titulo: ad.target_titulo || "",
                      })
                    }
                    style={rowStyle}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={1}>
                        {ad.target_titulo || TYPE_LABELS[ad.target_type]}
                      </Text>
                      <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }}>
                        Plano {ad.plan_nome} · {ad.duration_days} dias · {formatAmount(ad.preco, ad.currency)}
                      </Text>
                      <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                        {ad.status === "active"
                          ? `Até ${formatDate(ad.ends_at)}`
                          : pending
                            ? "Toque para concluir o pagamento"
                            : `Terminou em ${formatDate(ad.ends_at)}`}
                      </Text>
                    </View>
                    <Badge label={meta.label} color={meta.color} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: TEXT_SUB, fontSize: 13 }}>Ainda não tem anúncios.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
