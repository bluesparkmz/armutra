import React, { useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  CheckCheck,
  Heart,
  MessageCircle,
  MessageSquare,
  Megaphone,
  UserPlus,
  Wallet,
} from "lucide-react-native";
import { armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";

const BLUE = "#2563EB";
const BG = "#F8FAFC";
const CARD = "#FFFFFF";

const notificationIcons = {
  connection: UserPlus,
  like: Heart,
  comment: MessageSquare,
  job: Briefcase,
  message: MessageCircle,
  payment: Wallet,
  ad: Megaphone,
};

const notificationColors = {
  payment: "#16A34A",
  ad: "#F59E0B",
  connection: "#10B981",
  like: "#EF4444",
  comment: "#8B5CF6",
  job: "#2563EB",
  message: "#0EA5E9",
};

function timeAgo(value) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (Number.isNaN(seconds) || seconds < 60) return "Agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return date.toLocaleDateString("pt-MZ");
}

function NotificationCard({ item, onPress }) {
  const Icon = notificationIcons[item.tipo] || Bell;
  const color = notificationColors[item.tipo] || BLUE;
  const unread = !item.lida;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={{
        backgroundColor: unread ? "#EFF6FF" : CARD,
        borderWidth: 1,
        borderColor: unread ? "#BFDBFE" : "#E2E8F0",
        borderRadius: 16,
        padding: 14,
        flexDirection: "row",
        gap: 12,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: color + "18",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={19} color={color} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 15, fontWeight: "800", color: "#0F172A" }}
          >
            {item.titulo}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "700" }}>
            {timeAgo(item.criado_em)}
          </Text>
        </View>
        <Text style={{ marginTop: 5, fontSize: 13, color: "#475569", lineHeight: 19 }}>
          {item.mensagem}
        </Text>
      </View>
      {unread && (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#EF4444",
            marginTop: 5,
          }}
        />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["notifications", "list", token],
    enabled: !!token,
    staleTime: 0,
    queryFn: () => armutraApi.getNotifications(token),
  });
  const items = data || [];
  const unreadCount = useMemo(() => items.filter((item) => !item.lida).length, [items]);

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markAll = useMutation({
    mutationFn: () => armutraApi.markAllNotificationsRead(token),
    onSuccess: refreshAll,
    onError: (e) => logError("notifications-read-all", e),
  });

  const markOne = useMutation({
    mutationFn: (id) => armutraApi.markNotificationRead(id, token),
    onSuccess: refreshAll,
    onError: (e) => logError("notifications-read", e),
  });

  const handlePress = (item) => {
    if (!item.lida) markOne.mutate(item.id);
    if ((item.tipo === "connection" || item.tipo === "message") && item.actor_id) {
      router.push({ pathname: "/public-profile", params: { kind: "user", id: item.actor_id } });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: CARD,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>
            Notificações
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {unreadCount ? `${unreadCount} por ler` : "Tudo em dia"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => markAll.mutate()}
          disabled={!unreadCount || markAll.isPending}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: unreadCount ? BLUE : "#E2E8F0",
            alignItems: "center",
            justifyContent: "center",
            opacity: unreadCount ? 1 : 0.7,
          }}
        >
          <CheckCheck size={20} color={unreadCount ? "#fff" : "#64748B"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          token ? <RefreshControl refreshing={isRefetching} onRefresh={refetch} /> : undefined
        }
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}
      >
        {!token ? (
          <Text style={{ color: "#64748B", fontSize: 14, textAlign: "center", marginTop: 16 }}>
            Entre na sua conta para ver as suas notificações.
          </Text>
        ) : isLoading ? (
          <ActivityIndicator color={BLUE} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={{ color: "#DC2626", fontWeight: "600" }}>
            Não foi possível carregar as notificações.
          </Text>
        ) : items.length ? (
          items.map((item) => (
            <NotificationCard key={item.id} item={item} onPress={() => handlePress(item)} />
          ))
        ) : (
          <View
            style={{
              backgroundColor: CARD,
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#E2E8F0",
            }}
          >
            <Bell size={28} color="#94A3B8" />
            <Text style={{ marginTop: 10, fontSize: 15, fontWeight: "800", color: "#0F172A" }}>
              Sem notificações
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
