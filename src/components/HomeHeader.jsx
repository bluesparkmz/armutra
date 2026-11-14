import React from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Bell, MessageCircle, Search, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { armutraApi } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { ACCENT, BG_SOFT, BORDER, TEXT_MAIN, TEXT_SUB, getGreeting } from "@/theme";

/** Barra fixa ~50px: avatar + saudação + ícones (ou só botão Entrar sem sessão) */
export function HomeTopBar({ userName, userAvatar, onAvatarPress, isLoggedIn = !!userName, onLoginPress }) {
  const router = useRouter();
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count", token],
    enabled: !!token && isLoggedIn,
    staleTime: 30 * 1000,
    queryFn: () => armutraApi.getUnreadNotificationCount(token),
  });
  const unreadCount = unread?.nao_lidas || 0;
  const displayName = userName?.trim() || "visitante";
  const firstName = displayName.split(" ")[0];

  if (!isLoggedIn) {
    return (
      <View
        style={{
          paddingHorizontal: 20,
          height: 50,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 20, color: TEXT_MAIN, fontWeight: "800" }}>Armutra</Text>
        <TouchableOpacity
          onPress={onLoginPress || (() => router.push("/(tabs)/perfil"))}
          activeOpacity={0.85}
          style={{
            backgroundColor: ACCENT,
            paddingHorizontal: 20,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={{
        paddingHorizontal: 20,
        height: 50,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <TouchableOpacity
        onPress={onAvatarPress}
        activeOpacity={0.85}
        style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}
        disabled={!onAvatarPress}
      >
        <ArmutraAvatar uri={userAvatar} name={displayName} size={36} borderRadius={18} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "500" }} numberOfLines={1}>
            {getGreeting()}
          </Text>
          <Text
            style={{ fontSize: 15, color: TEXT_MAIN, fontWeight: "700", marginTop: 1 }}
            numberOfLines={1}
          >
            {firstName}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <TouchableOpacity
          onPress={() => router.push("/messages")}
          activeOpacity={0.8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: BG_SOFT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MessageCircle size={18} color={TEXT_MAIN} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/notifications")}
          activeOpacity={0.8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: BG_SOFT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bell size={18} color={TEXT_MAIN} strokeWidth={2} />
          {unreadCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 9,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: "#EF4444",
              }}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Pesquisa — rola com o conteúdo */
export function HomeSearchBar({
  searchText,
  onSearchChange,
  searchPlaceholder = "Pesquisar vagas, posts e serviços...",
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: BG_SOFT,
          borderRadius: 28,
          paddingHorizontal: 18,
          minHeight: 48,
          borderWidth: 1,
          borderColor: BORDER,
        }}
      >
        <TextInput
          value={searchText}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={TEXT_SUB}
          style={{
            flex: 1,
            fontSize: 15,
            color: TEXT_MAIN,
            paddingVertical: 12,
          }}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => onSearchChange("")} activeOpacity={0.7}>
            <X size={18} color={TEXT_SUB} />
          </TouchableOpacity>
        ) : (
          <Search size={20} color={TEXT_SUB} strokeWidth={2} />
        )}
      </View>
    </View>
  );
}
