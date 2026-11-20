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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, KeyRound } from "lucide-react-native";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { authApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import { ACCENT, ACCENT_DARK, ACCENT_LIGHT, BG_SOFT, BORDER, CARD, PLACEHOLDER, TEXT_MAIN, TEXT_SUB } from "@/theme";

const DANGER = "#DC2626";

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_MAIN, marginBottom: 6 }}>{label}</Text>
      <TextInput
        placeholderTextColor={PLACEHOLDER}
        selectionColor={ACCENT}
        cursorColor={ACCENT}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
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
    </View>
  );
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    setSaved(false);
    if (!token) {
      setError("Entre na sua conta para alterar a senha.");
      return;
    }
    if (!currentPassword || !nextPassword) {
      setError("Preencha a senha atual e a nova senha.");
      return;
    }
    if (nextPassword.length < 8) {
      setError("A nova senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("A confirmação não coincide com a nova senha.");
      return;
    }
    if (nextPassword === currentPassword) {
      setError("A nova senha tem de ser diferente da atual.");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(
        { senha_atual: currentPassword, senha_nova: nextPassword },
        token
      );
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch (submitError) {
      logError("change-password", submitError);
      setError(submitError?.message || "Não foi possível alterar a senha.");
    } finally {
      setSaving(false);
    }
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
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>Alterar senha</Text>
        </View>
      </ScreenFixedHeader>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        >
          <View
            style={{
              backgroundColor: CARD,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
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
                <KeyRound size={18} color={ACCENT_DARK} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: TEXT_SUB }}>
                Use a senha atual para definir uma nova, com pelo menos 8 caracteres.
              </Text>
            </View>

            <Field label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} />
            <Field label="Nova senha" value={nextPassword} onChangeText={setNextPassword} />
            <Field label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} />

            {!!error && (
              <Text style={{ color: DANGER, fontWeight: "600", fontSize: 13, marginBottom: 12 }}>{error}</Text>
            )}
            {saved && (
              <Text style={{ color: ACCENT_DARK, fontWeight: "700", fontSize: 13, marginBottom: 12 }}>
                Senha alterada.
              </Text>
            )}

            <TouchableOpacity
              onPress={submit}
              disabled={saving}
              activeOpacity={0.85}
              style={{
                backgroundColor: ACCENT,
                minHeight: 50,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving && <ActivityIndicator color="#fff" />}
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
                {saving ? "A guardar..." : "Guardar senha"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
