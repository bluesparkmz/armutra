import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Alert,
  Modal,
  Pressable,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Camera,
  Edit3,
  MapPin,
  Building2,
  UserRoundCheck,
  CheckCircle,
  Plus,
  Save,
  Settings,
  X,
  ChevronDown,
  Sparkles,
  Briefcase,
  MessageCircle,
  Send,
  Users,
  Wallet,
} from "lucide-react-native";
import LocationFields from "@/components/LocationFields";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { getDefaultDistrict } from "@/data/mozambiqueLocationsData";
import { authApi, armutraApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import {
  ACCENT,
  ACCENT_DARK,
  ACCENT_LIGHT,
  BG,
  BG_SOFT,
  BORDER,
  TEXT_MAIN,
  TEXT_SUB,
  TEXT_MUTED,
  cardStyle,
  colors,
  radius,
  tagStyle,
} from "@/theme";

const DEFAULT_PROVINCE = "Cidade de Maputo";

const inputStyle = {
  backgroundColor: BG,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: radius.md,
  paddingHorizontal: 16,
  paddingVertical: 15,
  fontSize: 14,
  color: TEXT_MAIN,
  minHeight: 54,
};

function IconButton({ onPress, children, active }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: active ? colors.black : BG_SOFT,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: active ? colors.black : BORDER,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

/** Opções do menu "Postar" conforme o tipo de conta */
function getCreateOptions(userType) {
  const options = [];
  if (userType === "candidato" || userType === "freelancer" || userType === "empresa") {
    options.push({
      key: "service",
      label: "Serviço",
      hint: "Ofereça o seu trabalho",
      icon: Sparkles,
      path: "/create-service",
    });
  }
  if (userType === "empresa") {
    options.push({
      key: "job",
      label: "Vaga",
      hint: "Encontre candidatos",
      icon: Briefcase,
      path: "/create-job",
    });
  }
  options.push({
    key: "post",
    label: "Post",
    hint: "Partilhe uma atualização",
    icon: Send,
    path: "/create-post",
  });
  return options;
}

function PostMenu({ insets, userType, onSelect }) {
  const [open, setOpen] = useState(false);
  const options = getCreateOptions(userType);
  const single = options.length === 1;

  const handlePress = () => {
    if (single) {
      onSelect(options[0].path);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: ACCENT,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radius.pill,
        }}
      >
        <Plus size={18} color="#fff" strokeWidth={2.5} />
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Postar</Text>
        {!single && <ChevronDown size={16} color="#fff" strokeWidth={2.5} />}
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View
            style={{
              position: "absolute",
              top: insets.top + 56,
              right: 20,
              width: 250,
              backgroundColor: BG,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: BORDER,
              paddingVertical: 6,
              elevation: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
            }}
          >
            {options.map((option, index) => {
              const OptionIcon = option.icon;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => {
                    setOpen(false);
                    onSelect(option.path);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: BORDER,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: ACCENT_LIGHT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <OptionIcon size={18} color={ACCENT_DARK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_MAIN }}>
                      {option.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 1 }}>
                      {option.hint}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function accountLabelOf(user) {
  if (user?.tipo === "empresa" || user?.user_type === "empresa") return "Empresa";
  if (user?.user_type === "freelancer") return "Freelancer";
  return "Candidato";
}

function ProfileFixedHeader({ insets, user, onPost, onSettings }) {
  return (
    <ScreenFixedHeader insets={insets} paddingBottom={8}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          minHeight: 44,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "800", color: TEXT_MAIN }}>Perfil</Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <PostMenu insets={insets} userType={user?.user_type || user?.tipo} onSelect={onPost} />
          <IconButton onPress={onSettings}>
            <Settings size={18} color={TEXT_MAIN} />
          </IconButton>
        </View>
      </View>
    </ScreenFixedHeader>
  );
}

function GoogleMark() {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: BORDER,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "800", color: "#4285F4", marginTop: -1 }}>G</Text>
    </View>
  );
}

function AuthPanel({ insets, mode, setMode, form, setForm, onSubmit, error, loading, onClose }) {
  const isLogin = mode === "login";
  const authInputProps = {
    placeholderTextColor: TEXT_SUB,
    keyboardAppearance: "light",
    style: inputStyle,
  };

  const handleGoogle = () => {
    // Só UI por agora: o login com Google ainda não está ligado
    Alert.alert("Google", "O login com Google estará disponível em breve.");
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.8}
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          zIndex: 10,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: BG_SOFT,
          borderWidth: 1,
          borderColor: BORDER,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <X size={18} color={TEXT_MAIN} />
      </TouchableOpacity>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 12 }}>
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 30, fontWeight: "800", color: TEXT_MAIN }}>Armutra</Text>
            <Text style={{ fontSize: 14, color: TEXT_SUB, marginTop: 6, textAlign: "center" }}>
              {isLogin ? "Entre na sua conta para continuar" : "Crie a sua conta gratuitamente"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleGoogle}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              minHeight: 52,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: BORDER,
              backgroundColor: BG,
            }}
          >
            <GoogleMark />
            <Text style={{ color: TEXT_MAIN, fontWeight: "700", fontSize: 15 }}>
              Continuar com Google
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
            <Text style={{ fontSize: 12, color: TEXT_SUB }}>ou</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: BORDER }} />
          </View>

          {!isLogin && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { id: "candidato", label: "Candidato" },
                  { id: "empresa", label: "Empresa" },
                ].map((option) => {
                  const selected = (form.tipo || "candidato") === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => setForm((current) => ({ ...current, tipo: option.id }))}
                      style={{
                        flex: 1,
                        minHeight: 44,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: selected ? ACCENT : BORDER,
                        backgroundColor: selected ? ACCENT : BG,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontWeight: "700", color: selected ? "#fff" : TEXT_MAIN }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                value={form.name}
                onChangeText={(name) => setForm((current) => ({ ...current, name }))}
                placeholder={form.tipo === "empresa" ? "Nome da empresa" : "Nome"}
                {...authInputProps}
              />
              <TextInput
                value={form.phone}
                onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
                placeholder="Telefone"
                keyboardType="phone-pad"
                {...authInputProps}
              />
              <LocationFields
                province={form.province}
                city={form.city}
                onProvinceChange={(province) => setForm((current) => ({ ...current, province }))}
                onCityChange={(city) => setForm((current) => ({ ...current, city }))}
                inputStyle={inputStyle}
                rowStyle={{ flexDirection: "column", gap: 12 }}
              />
            </>
          )}

          <TextInput
            value={form.email}
            onChangeText={(email) => setForm((current) => ({ ...current, email }))}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            {...authInputProps}
          />
          <TextInput
            value={form.password}
            onChangeText={(password) => setForm((current) => ({ ...current, password }))}
            placeholder="Senha"
            secureTextEntry
            {...authInputProps}
          />
          {error && <Text style={{ color: "#DC2626", fontSize: 13 }}>{error}</Text>}
          <TouchableOpacity
            onPress={onSubmit}
            disabled={loading}
            style={{
              backgroundColor: ACCENT,
              borderRadius: radius.md,
              minHeight: 54,
              alignItems: "center",
              justifyContent: "center",
              opacity: loading ? 0.65 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode((current) => (current === "login" ? "register" : "login"))}
            style={{ alignItems: "center", paddingVertical: 12 }}
          >
            <Text style={{ color: ACCENT_DARK, fontWeight: "700" }}>
              {isLogin ? "Criar nova conta" : "Já tenho conta"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function EditProfilePanel({
  form,
  setForm,
  onPickAvatar,
  onCancel,
  onSave,
  error,
  loading,
  avatarLoading,
}) {
  return (
    <View style={{ ...cardStyle, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: TEXT_MAIN }}>
          Editar perfil
        </Text>
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.75}
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            backgroundColor: BG_SOFT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={17} color={TEXT_SUB} />
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: "center", marginBottom: 14 }}>
        <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.8} disabled={avatarLoading}>
          <View>
            <ArmutraAvatar uri={form.avatar_url} name={form.name || "Perfil Armutra"} size={86} />
            <View
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 34,
                height: 34,
                borderRadius: radius.sm,
                backgroundColor: ACCENT,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: BG,
              }}
            >
              <Camera size={15} color="#fff" />
            </View>
          </View>
        </TouchableOpacity>
        <Text style={{ color: TEXT_SUB, fontSize: 12, fontWeight: "600", marginTop: 8 }}>
          {avatarLoading ? "Enviando avatar..." : "Tocar para trocar avatar"}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <TextInput
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder="Nome"
          style={inputStyle}
        />
        <TextInput
          value={form.phone}
          onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
          placeholder="Telefone"
          keyboardType="phone-pad"
          style={inputStyle}
        />
        <LocationFields
          province={form.province}
          city={form.city}
          onProvinceChange={(province) => setForm((current) => ({ ...current, province }))}
          onCityChange={(city) => setForm((current) => ({ ...current, city }))}
          inputStyle={inputStyle}
          rowStyle={{ flexDirection: "column", gap: 12 }}
        />
        {error && (
          <Text style={{ color: "#DC2626", fontSize: 13, fontWeight: "700" }}>{error}</Text>
        )}
        <TouchableOpacity
          onPress={onSave}
          disabled={loading || avatarLoading}
          activeOpacity={0.85}
          style={{
            backgroundColor: ACCENT,
            minHeight: 54,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: loading || avatarLoading ? 0.65 : 1,
          }}
        >
          <Save size={17} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
            {loading ? "Guardando..." : "Guardar alterações"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, isAuthenticated, login, register, signOut, setAuth } = useAuth();
  const user = auth?.user;
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    province: DEFAULT_PROVINCE,
    city: getDefaultDistrict(DEFAULT_PROVINCE),
    avatar_url: null,
  });
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    province: DEFAULT_PROVINCE,
    city: getDefaultDistrict(DEFAULT_PROVINCE),
    user_type: "candidato",
    tipo: "candidato",
  });
  const [authError, setAuthError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const openCreate = (path) => {
    router.push(path);
  };

  const openEdit = () => {
    setEditError(null);
    setEditForm({
      name: user?.name || "",
      phone: user?.phone || "",
      province: user?.province || DEFAULT_PROVINCE,
      city: user?.city || getDefaultDistrict(user?.province || DEFAULT_PROVINCE),
      avatar_url: user?.avatar_url || null,
    });
    setEditOpen(true);
  };

  const pickAvatar = async () => {
    setEditError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setEditError("Permita acesso à galeria para escolher um avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const selected = result.assets[0];
    const formData = new FormData();
    formData.append("file", {
      uri: selected.uri,
      name: selected.fileName || `avatar-${Date.now()}.jpg`,
      type: selected.mimeType || "image/jpeg",
    });

    setAvatarUploading(true);
    try {
      const uploaded = await armutraApi.uploadAvatar(formData, auth?.accessToken);
      setEditForm((current) => ({ ...current, avatar_url: uploaded.image_url }));
    } catch (error) {
      logError("avatar-upload", error);
      setEditError(error.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    Keyboard.dismiss();
    setEditSaving(true);
    setEditError(null);
    try {
      const updatedUser = await authApi.updateMe(
        {
          name: editForm.name.trim(),
          phone: editForm.phone?.trim() || null,
          province: editForm.province,
          city: editForm.city,
          avatar_url: editForm.avatar_url,
        },
        auth?.accessToken
      );
      setAuth({ ...auth, user: updatedUser });
      setEditOpen(false);
    } catch (error) {
      logError("profile-update", error);
      setEditError(error.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleAuth = async () => {
    Keyboard.dismiss();
    setSubmitting(true);
    setAuthError(null);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      Keyboard.dismiss();
    } catch (error) {
      logError("auth-submit", error);
      setAuthError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AuthPanel
        insets={insets}
        mode={mode}
        setMode={setMode}
        form={form}
        setForm={setForm}
        onSubmit={handleAuth}
        error={authError}
        loading={submitting}
        onClose={() => router.replace("/(tabs)/feed")}
      />
    );
  }

  const tag = tagStyle();
  const isCompany = user?.tipo === "empresa" || user?.user_type === "empresa";
  const location = [user?.city, user?.province].filter(Boolean).join(", ") || user?.localizacao || "Moçambique";
  const shortcuts = [
    {
      key: "profile",
      label: isCompany ? "Dados da empresa" : "Habilidades",
      icon: isCompany ? Building2 : UserRoundCheck,
      onPress: () => router.push(isCompany ? "/become-company" : "/become-freelancer"),
    },
    ...(isCompany
      ? [
          {
            key: "jobs",
            label: "Candidaturas",
            icon: Briefcase,
            onPress: () => router.push("/minhas-vagas"),
          },
        ]
      : []),
    {
      key: "services",
      label: "Serviços",
      icon: Sparkles,
      onPress: () => router.push("/meus-servicos"),
    },
    {
      key: "payments",
      label: "Pagamentos",
      icon: Wallet,
      onPress: () => router.push("/payments"),
    },
    {
      key: "connections",
      label: "Conexões",
      icon: Users,
      onPress: () => router.push("/connections"),
    },
    {
      key: "messages",
      label: "Mensagens",
      icon: MessageCircle,
      onPress: () => router.push("/messages"),
    },
    {
      key: "edit",
      label: "Editar perfil",
      icon: Edit3,
      onPress: () => router.push("/edit-profile"),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <ProfileFixedHeader
        insets={insets}
        user={user}
        onPost={openCreate}
        onSettings={() => router.push("/settings")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 96,
        }}
      >
        <View style={{ backgroundColor: BG, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View
              style={{
                borderWidth: 2,
                borderColor: ACCENT_LIGHT,
                borderRadius: 999,
                padding: 2,
              }}
            >
              <ArmutraAvatar uri={user?.avatar_url} name={user?.name || "Perfil Armutra"} size={86} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={2}>
                {user?.name || "Perfil Armutra"}
              </Text>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: tag.bg,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  marginTop: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: tag.text }}>{accountLabelOf(user)}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                <MapPin size={13} color={TEXT_MUTED} />
                <Text style={{ fontSize: 13, color: TEXT_SUB, flex: 1 }} numberOfLines={1}>
                  {location}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                <CheckCircle
                  size={14}
                  color={user?.is_verified ? ACCENT : TEXT_MUTED}
                  fill={user?.is_verified ? ACCENT_LIGHT : "transparent"}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: user?.is_verified ? ACCENT_DARK : TEXT_SUB,
                    fontWeight: "600",
                  }}
                >
                  {user?.is_verified ? "Perfil verificado" : "Perfil em configuração"}
                </Text>
              </View>
            </View>
          </View>
          {user?.bio ? (
            <Text style={{ fontSize: 14, color: TEXT_MAIN, lineHeight: 21, marginTop: 14 }}>{user.bio}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/edit-profile")}
              activeOpacity={0.7}
              style={{ marginTop: 14, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: ACCENT }}>Adicionar descrição</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                activeOpacity={0.85}
                style={{
                  width: "48%",
                  flexGrow: 1,
                  minHeight: 88,
                  backgroundColor: BG,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: BORDER,
                  padding: 14,
                  justifyContent: "space-between",
                }}
              >
                <Icon size={18} color={ACCENT_DARK} />
                <Text style={{ fontSize: 14, fontWeight: "800", color: TEXT_MAIN, marginTop: 12 }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={openEdit}
          activeOpacity={0.85}
          style={{
            minHeight: 48,
            borderRadius: radius.md,
            backgroundColor: BG,
            borderWidth: 1,
            borderColor: BORDER,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: TEXT_MAIN, fontWeight: "700", fontSize: 14 }}>Edição rápida aqui</Text>
        </TouchableOpacity>

        {editOpen && (
          <EditProfilePanel
            form={editForm}
            setForm={setEditForm}
            onPickAvatar={pickAvatar}
            onCancel={() => setEditOpen(false)}
            onSave={saveProfile}
            error={editError}
            loading={editSaving}
            avatarLoading={avatarUploading}
          />
        )}

        <TouchableOpacity
          onPress={signOut}
          style={{
            minHeight: 48,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.85}
        >
          <Text style={{ color: TEXT_SUB, fontWeight: "700", fontSize: 14 }}>Sair</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}