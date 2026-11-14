import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MessageCircle, UserCheck, UserPlus, Users } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { API_URL, armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
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

const TABS = [
  { key: "following", label: "A seguir" },
  { key: "followers", label: "Seguidores" },
];

const TYPE_LABELS = {
  empresa: "Empresa",
  candidato: "Utilizador",
};

function resolveAvatar(uri) {
  if (!uri) return null;
  return uri.startsWith("/") ? `${API_URL}${uri}` : uri;
}

function ConnectionRow({ item, isFollowing, busy, onOpen, onToggle, onMessage }) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: CARD,
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <ArmutraAvatar uri={resolveAvatar(item.foto_perfil)} name={item.nome} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={1}>
          {item.nome}
        </Text>
        <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
          {[TYPE_LABELS[item.tipo] || item.tipo, item.localizacao].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onMessage}
        activeOpacity={0.85}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MessageCircle size={16} color={TEXT_MAIN} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onToggle}
        disabled={busy}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          minHeight: 36,
          borderRadius: 10,
          borderWidth: 1.5,
          borderColor: ACCENT,
          backgroundColor: isFollowing ? CARD : ACCENT,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {isFollowing ? (
          <UserCheck size={15} color={ACCENT_DARK} />
        ) : (
          <UserPlus size={15} color="#fff" />
        )}
        <Text
          style={{ fontSize: 12, fontWeight: "700", color: isFollowing ? ACCENT_DARK : "#fff" }}
        >
          {isFollowing ? "A seguir" : "Seguir"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function EmptyState({ tab }) {
  return (
    <View
      style={{
        backgroundColor: CARD,
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        borderColor: BORDER,
      }}
    >
      <Users size={28} color={TEXT_MUTED} />
      <Text style={{ marginTop: 10, fontSize: 15, fontWeight: "800", color: TEXT_MAIN }}>
        {tab === "following" ? "Ainda não segue ninguém" : "Ainda não tem seguidores"}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 13, color: TEXT_SUB, textAlign: "center" }}>
        {tab === "following"
          ? "Abra o perfil de uma empresa ou profissional e toque em Conectar."
          : "Quando alguém o seguir, aparece aqui."}
      </Text>
    </View>
  );
}

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const [tab, setTab] = useState("following");

  const following = useQuery({
    queryKey: ["connections", "following", token],
    enabled: !!token,
    queryFn: () => armutraApi.getFollowing(token),
  });
  const followers = useQuery({
    queryKey: ["connections", "followers", token],
    enabled: !!token,
    queryFn: () => armutraApi.getFollowers(token),
  });

  const toggle = useMutation({
    mutationFn: ({ userId, follow }) =>
      follow ? armutraApi.followUser(userId, token) : armutraApi.unfollowUser(userId, token),
    onSuccess: (_result, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["connection-status", userId] });
      queryClient.invalidateQueries({ queryKey: ["connection-counts", userId] });
    },
    onError: (error) => {
      logError("connections-toggle", error);
      Alert.alert("Erro", error?.message || "Não foi possível actualizar a conexão.");
    },
  });

  const active = tab === "following" ? following : followers;
  const items = active.data || [];
  const followingIds = new Set((following.data || []).map((u) => u.id));

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
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>Conexões</Text>
        </View>
      </ScreenFixedHeader>

      {!token ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: TEXT_SUB, fontSize: 14, textAlign: "center" }}>
            Entre na sua conta para ver as suas conexões.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
            {TABS.map(({ key, label }) => {
              const selected = tab === key;
              const count = (key === "following" ? following : followers).data?.length;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTab(key)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: selected ? ACCENT : CARD,
                    borderWidth: 1,
                    borderColor: selected ? ACCENT : BORDER,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: selected ? "#fff" : TEXT_SUB,
                    }}
                  >
                    {label}
                    {count != null ? ` (${count})` : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={active.isRefetching}
                onRefresh={() => active.refetch()}
                tintColor={ACCENT}
              />
            }
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
          >
            {active.isLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
            ) : active.error ? (
              <Text style={{ color: "#DC2626", fontWeight: "600" }}>
                Não foi possível carregar as conexões.
              </Text>
            ) : items.length ? (
              items.map((item) => (
                <ConnectionRow
                  key={item.id}
                  item={item}
                  isFollowing={followingIds.has(item.id)}
                  busy={toggle.isPending && toggle.variables?.userId === item.id}
                  onOpen={() =>
                    router.push({ pathname: "/public-profile", params: { kind: "user", id: item.id } })
                  }
                  onMessage={() =>
                    router.push({
                      pathname: "/messages",
                      params: { userId: item.id, nome: item.nome },
                    })
                  }
                  onToggle={() =>
                    toggle.mutate({ userId: item.id, follow: !followingIds.has(item.id) })
                  }
                />
              ))
            ) : (
              <EmptyState tab={tab} />
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}
