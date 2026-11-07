import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  Save,
  Loader,
  X,
} from "lucide-react-native";
import LocationFields from "@/components/LocationFields";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { getDefaultDistrict } from "@/data/mozambiqueLocationsData";
import { armutraApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";

const BLUE = "#2563EB";
const GREEN = "#10B981";
const BG = "#F8FAFC";

const inputStyle = {
  backgroundColor: "#fff",
  borderWidth: 1,
  borderColor: "#E2E8F0",
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 13,
  minHeight: 52,
  fontSize: 14,
  color: "#0F172A",
};

function SectionTitle({ title }) {
  return (
    <Text
      style={{
        fontSize: 16,
        fontWeight: "800",
        color: "#0F172A",
        marginBottom: 12,
        marginTop: 16,
      }}
    >
      {title}
    </Text>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const user = auth?.user;
  const token = auth?.accessToken;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    profession: user?.profession || "",
    bio: user?.bio || "",
    province: user?.province || "Cidade de Maputo",
    city: user?.city || getDefaultDistrict(user?.province || "Cidade de Maputo"),
    website: user?.website || "",
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const pickAvatar = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permita acesso a galeria para escolher uma imagem.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const uploadAvatar = async () => {
    if (!selectedImage?.uri) return null;
    const formData = new FormData();
    const fileName = selectedImage.fileName || `avatar-${Date.now()}.jpg`;
    const mimeType = selectedImage.mimeType || "image/jpeg";
    formData.append("file", {
      uri: selectedImage.uri,
      name: fileName,
      type: mimeType,
    });
    const uploaded = await armutraApi.uploadPostImage(formData, token);
    return uploaded.image_url;
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!user?.id) {
      setError("Usuário não autenticado.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let avatarUrl = null;
      if (selectedImage?.uri) {
        avatarUrl = await uploadAvatar();
      }

      const updateData = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        profession: form.profession.trim() || null,
        bio: form.bio.trim() || null,
        province: form.province.trim(),
        city: form.city.trim(),
        website: form.website.trim() || null,
      };

      if (avatarUrl) {
        updateData.avatar = avatarUrl;
      }

      await armutraApi.updateProfile(user.id, updateData, token);
      
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      logError("update-profile", err);
      setError(err.message || "Falha ao atualizar perfil. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#FFFFFF",
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
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#0F172A" }}>
          Editar Perfil
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: saving ? "#E2E8F0" : BLUE,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {saving ? (
            <Loader size={20} color="#94A3B8" />
          ) : (
            <Save size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Avatar Section */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              position: "relative",
              width: 120,
              height: 120,
              marginBottom: 12,
            }}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: "#F1F5F9",
                }}
                contentFit="cover"
              />
            ) : (
              <ArmutraAvatar
                uri={user?.avatar}
                name={user?.name}
                size={120}
                borderRadius={60}
              />
            )}
            <TouchableOpacity
              onPress={pickAvatar}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: BLUE,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: "#fff",
              }}
            >
              <Camera size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={pickAvatar}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: BLUE }}>
              Alterar foto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Basic Info */}
        <SectionTitle title="Informações Básicas" />
        <TextInput
          value={form.name}
          onChangeText={(value) => update("name", value)}
          placeholder="Nome completo"
          style={inputStyle}
        />
        <TextInput
          value={form.email}
          onChangeText={(value) => update("email", value)}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          style={inputStyle}
        />
        <TextInput
          value={form.phone}
          onChangeText={(value) => update("phone", value)}
          placeholder="Telefone"
          keyboardType="phone-pad"
          style={inputStyle}
        />

        {/* Professional Info */}
        <SectionTitle title="Informações Profissionais" />
        <TextInput
          value={form.profession}
          onChangeText={(value) => update("profession", value)}
          placeholder="Profissão ou especialidade"
          style={inputStyle}
        />
        <TextInput
          value={form.bio}
          onChangeText={(value) => update("bio", value)}
          placeholder="Sobre você (bio)"
          multiline
          numberOfLines={4}
          style={[inputStyle, { minHeight: 100, textAlignVertical: "top" }]}
        />
        <TextInput
          value={form.website}
          onChangeText={(value) => update("website", value)}
          placeholder="Website ou portfólio"
          keyboardType="url"
          style={inputStyle}
        />

        {/* Location */}
        <SectionTitle title="Localização" />
        <LocationFields
          province={form.province}
          city={form.city}
          onProvinceChange={(value) => update("province", value)}
          onCityChange={(value) => update("city", value)}
          inputStyle={inputStyle}
        />

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: "#FEF2F2",
              borderWidth: 1,
              borderColor: "#FECACA",
              borderRadius: 12,
              padding: 12,
              marginVertical: 8,
            }}
          >
            <Text style={{ color: "#DC2626", fontSize: 13, fontWeight: "600" }}>
              {error}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: BLUE,
            minHeight: 54,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            opacity: saving ? 0.65 : 1,
            marginTop: 8,
            flexDirection: "row",
            gap: 8,
          }}
        >
          {saving && <Loader size={18} color="#fff" />}
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
