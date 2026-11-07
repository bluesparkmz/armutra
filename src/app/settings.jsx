import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell, UserRound, FileText, LogOut, ChevronRight } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import {
  ACCENT_DARK,
  ACCENT_LIGHT,
  BG_SOFT,
  BORDER,
  CARD,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_SUB,
} from "@/theme";

const DANGER = "#DC2626";
const DANGER_SOFT = "#FEF2F2";

function SectionTitle({ title }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        color: TEXT_SUB,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

function Group({ children }) {
  return (
    <View
      style={{
        backgroundColor: CARD,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: BORDER,
      }}
    >
      {children}
    </View>
  );
}

function SettingRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  danger = false,
  showChevron = true,
  last = false,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: BORDER,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: danger ? DANGER_SOFT : ACCENT_LIGHT,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
        }}
      >
        <Icon size={19} color={danger ? DANGER : ACCENT_DARK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: danger ? DANGER : TEXT_MAIN }}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      {showChevron && <ChevronRight size={18} color={TEXT_MUTED} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, logout } = useAuth();
  const user = auth?.user;

  const handleLogout = () => {
    Alert.alert("Sair", "Tem a certeza que deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/");
          } catch (error) {
            logError("logout", error);
            Alert.alert("Erro", "Falha ao sair. Tente novamente.");
          }
        },
      },
    ]);
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
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>Configurações</Text>
        </View>
      </ScreenFixedHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {user && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: CARD,
              paddingHorizontal: 20,
              paddingVertical: 16,
              marginTop: 12,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: BORDER,
              gap: 14,
            }}
          >
            <ArmutraAvatar uri={user.avatar_url} name={user.name} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN }} numberOfLines={1}>
                {user.name}
              </Text>
              {!!user.email && (
                <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
                  {user.email}
                </Text>
              )}
            </View>
          </View>
        )}

        <SectionTitle title="Conta" />
        <Group>
          <SettingRow
            icon={UserRound}
            title="Editar perfil"
            subtitle="Nome, foto e localização"
            onPress={() => router.push("/edit-profile")}
          />
          <SettingRow
            icon={Bell}
            title="Notificações"
            subtitle="Veja os seus alertas recentes"
            onPress={() => router.push("/notifications")}
            last
          />
        </Group>

        <SectionTitle title="Informações" />
        <Group>
          <SettingRow
            icon={FileText}
            title="Política de privacidade"
            subtitle="Como tratamos os seus dados"
            onPress={() => router.push("/privacy-policy")}
            last
          />
        </Group>

        <View style={{ marginTop: 24 }}>
          <Group>
            <SettingRow
              icon={LogOut}
              title="Sair"
              subtitle="Terminar a sessão atual"
              onPress={handleLogout}
              danger
              showChevron={false}
              last
            />
          </Group>
        </View>

        <View style={{ paddingVertical: 28, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: TEXT_MUTED }}>Armutra v1.0.0</Text>
          <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>
            © {new Date().getFullYear()} Armutra. Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
