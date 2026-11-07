import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  Lock,
  Eye,
  Trash2,
  LogOut,
  HelpCircle,
  FileText,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "@/utils/auth/useAuth";
import { authApi } from "@/utils/api";
import { logError } from "@/utils/logger";

const BLUE = "#2563EB";
const RED = "#DC2626";
const BG = "#F8FAFC";
const CARD = "#FFFFFF";

function SettingRow({ icon: Icon, title, subtitle, onPress, action = null }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: CARD,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: BG,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Icon size={20} color={BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#0F172A" }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
      {action === "toggle" ? (
        <Switch value={false} disabled style={{ marginLeft: 12 }} />
      ) : (
        <ChevronRight size={18} color="#94A3B8" />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: "800",
        color: "#94A3B8",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: BG,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  const handleLogout = () => {
    Alert.alert("Sair", "Tem certeza que deseja sair da sua conta?", [
      { text: "Cancelar", onPress: () => {}, style: "cancel" },
      {
        text: "Sair",
        onPress: async () => {
          try {
            await logout();
            router.replace("/");
          } catch (error) {
            logError("logout", error);
            Alert.alert("Erro", "Falha ao sair. Tente novamente.");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Deletar conta",
      "Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.",
      [
        { text: "Cancelar", onPress: () => {}, style: "cancel" },
        {
          text: "Deletar",
          onPress: async () => {
            try {
              // Implement delete account API call
              // await authApi.deleteAccount(auth.user.id, auth.accessToken);
              await logout();
              router.replace("/");
            } catch (error) {
              logError("delete-account", error);
              Alert.alert("Erro", "Falha ao deletar conta. Tente novamente.");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: CARD,
          borderBottomWidth: 1,
          borderBottomColor: "#F1F5F9",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: BG,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#0F172A",
            marginLeft: 12,
          }}
        >
          Configurações
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 16,
        }}
      >
        {/* Privacy Section */}
        <SectionHeader title="Privacidade" />
        <View style={{ marginBottom: 8 }}>
          <SettingRow
            icon={Eye}
            title="Perfil privado"
            subtitle="Apenas pessoas autorizadas podem ver seu perfil"
            onPress={() => setPrivateProfile(!privateProfile)}
            action="toggle"
          />
          <SettingRow
            icon={Lock}
            title="Alterar senha"
            subtitle="Atualize sua senha com segurança"
            onPress={() => router.push("/change-password")}
          />
        </View>

        {/* Notifications Section */}
        <SectionHeader title="Notificações" />
        <View style={{ marginBottom: 8 }}>
          <SettingRow
            icon={Bell}
            title="Notificações push"
            subtitle="Receba alertas em tempo real"
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            action="toggle"
          />
        </View>

        {/* Help Section */}
        <SectionHeader title="Ajuda e informações" />
        <View style={{ marginBottom: 8 }}>
          <SettingRow
            icon={HelpCircle}
            title="Central de ajuda"
            subtitle="Dúvidas frequentes e suporte"
            onPress={() => router.push("/help")}
          />
          <SettingRow
            icon={FileText}
            title="Política de privacidade"
            subtitle="Leia nossa política completa"
            onPress={() => router.push("/privacy-policy")}
          />
        </View>

        {/* Account Section */}
        <SectionHeader title="Conta" />
        <View>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: CARD,
              borderBottomWidth: 1,
              borderBottomColor: "#F1F5F9",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#FEF2F2",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <LogOut size={20} color={RED} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: RED }}>
                Sair
              </Text>
              <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                Finde a sessão atual
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: CARD,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: "#FEF2F2",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Trash2 size={20} color={RED} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: RED }}>
                Deletar conta
              </Text>
              <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                Esta ação é irreversível
              </Text>
            </View>
            <ChevronRight size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#94A3B8" }}>
            Armutra v1.0.0
          </Text>
          <Text style={{ fontSize: 11, color: "#CBD5E1", marginTop: 4 }}>
            © 2024 Armutra. Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
