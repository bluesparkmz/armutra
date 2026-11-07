import React, { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, ImagePlus, Send, Sparkles, Trash2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FullWidthImage from "@/components/FullWidthImage";
import LocationFields from "@/components/LocationFields";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { freelancerCategories } from "@/data/categories";
import { getDefaultDistrict } from "@/data/mozambiqueLocationsData";
import { armutraApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import {
  ACCENT,
  ACCENT_DARK,
  ACCENT_LIGHT,
  BG,
  BG_SOFT,
  BORDER,
  TEXT_MAIN,
  TEXT_SUB,
  radius,
} from "@/theme";

const categoryOptions = freelancerCategories.filter((category) => category !== "Todos");
const DEFAULT_PROVINCE = "Cidade de Maputo";

function CreateHeader({ insets, title, subtitle, icon: Icon, onBack }) {
  return (
    <ScreenFixedHeader insets={insets}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 4,
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.8}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: BG_SOFT,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <ArrowLeft size={20} color={TEXT_MAIN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>{title}</Text>
          <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 2 }}>{subtitle}</Text>
        </View>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: ACCENT_LIGHT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={19} color={ACCENT_DARK} />
        </View>
      </View>
    </ScreenFixedHeader>
  );
}

export default function CreateContentScreen({ type }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const user = auth?.user;
  const token = auth?.accessToken;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [form, setForm] = useState({
    content: "",
    title: "",
    description: "",
    category: "",
    price: "",
    requirements: "",
    salary_min: "",
    salary_max: "",
    province: user?.province || DEFAULT_PROVINCE,
    city: user?.city || getDefaultDistrict(user?.province || DEFAULT_PROVINCE),
  });

  const inputStyle = {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 52,
    fontSize: 14,
    color: TEXT_MAIN,
  };

  const multilineStyle = {
    ...inputStyle,
    minHeight: 120,
    textAlignVertical: "top",
  };

  const meta = useMemo(() => {
    if (type === "service") {
      return {
        title: "Publicar serviço",
        subtitle: "Mostre o que você oferece no Armutra.",
        icon: Sparkles,
      };
    }
    if (type === "job") {
      return {
        title: "Publicar vaga",
        subtitle: "Encontre candidatos para a sua empresa.",
        icon: Briefcase,
      };
    }
    return {
      title: "Postar",
      subtitle: "Partilhe uma atualização profissional.",
      icon: Send,
    };
  }, [type]);

  const Icon = meta.icon;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const removeImage = () => setSelectedImage(null);

  const pickPostImage = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Permita acesso à galeria para escolher uma imagem.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const uploadSelectedImage = async () => {
    const formData = new FormData();
    const fileName = selectedImage.fileName || `post-${Date.now()}.jpg`;
    const mimeType = selectedImage.mimeType || "image/jpeg";
    formData.append("file", {
      uri: selectedImage.uri,
      name: fileName,
      type: mimeType,
    });
    const uploaded = await armutraApi.uploadPostImage(formData, token);
    return uploaded.image_url;
  };

  const submit = async () => {
    Keyboard.dismiss();
    if (!user?.id) {
      setError("Entre na sua conta para publicar.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (type === "post") {
        const content = form.content.trim();
        const hasImage = !!selectedImage?.uri;
        if (!content && !hasImage) {
          setError("Escreva algo ou escolha uma imagem para publicar.");
          setSubmitting(false);
          return;
        }
        const imageUrl = hasImage ? await uploadSelectedImage() : null;
        await armutraApi.createPost(
          {
            author_id: user.id,
            post_type: hasImage ? "image" : "text",
            content: content || null,
            ...(hasImage ? { image_url: imageUrl } : {}),
          },
          token
        );
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      }

      if (type === "service") {
        let imageUrl = null;
        if (selectedImage?.uri) {
          imageUrl = await uploadSelectedImage();
        }
        await armutraApi.createService(
          {
            owner_user_id: user.id,
            owner_type: user.user_type === "empresa" ? "empresa" : "freelancer",
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category.trim() || null,
            price: form.price ? Number(form.price) : null,
            province: form.province.trim() || null,
            city: form.city.trim() || null,
            image_url: imageUrl,
          },
          token
        );
        queryClient.invalidateQueries({ queryKey: ["feed"] });
      }

      if (type === "job") {
        let imageUrl = null;
        if (selectedImage?.uri) {
          imageUrl = await uploadSelectedImage();
        }
        await armutraApi.createJob(
          {
            company_user_id: user.id,
            title: form.title.trim(),
            description: form.description.trim(),
            requirements: form.requirements.trim() || null,
            salary_min: form.salary_min ? Number(form.salary_min) : null,
            salary_max: form.salary_max ? Number(form.salary_max) : null,
            province: form.province.trim() || null,
            city: form.city.trim() || null,
            job_type: "full_time",
            image_url: imageUrl,
          },
          token
        );
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      }

      router.back();
    } catch (submitError) {
      logError(`create-${type}`, submitError);
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const imagePickerBoxStyle = {
    borderWidth: 1,
    borderColor: selectedImage ? BORDER : ACCENT_LIGHT,
    borderStyle: selectedImage ? "solid" : "dashed",
    borderRadius: radius.lg,
    backgroundColor: selectedImage ? BG : ACCENT_LIGHT,
    overflow: "hidden",
  };

  const renderImagePicker = (optionalLabel) => (
    <View style={imagePickerBoxStyle}>
      {selectedImage ? (
        <View>
          <TouchableOpacity onPress={pickPostImage} activeOpacity={0.9}>
            <FullWidthImage
              uri={selectedImage.uri}
              maxHeight={300}
              ratio={
                selectedImage.width && selectedImage.height
                  ? selectedImage.width / selectedImage.height
                  : undefined
              }
            />
          </TouchableOpacity>
          <View
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={pickPostImage}
              activeOpacity={0.8}
              style={{
                height: 36,
                paddingHorizontal: 12,
                borderRadius: 18,
                backgroundColor: "rgba(17,24,39,0.72)",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
              }}
            >
              <ImagePlus size={15} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Trocar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={removeImage}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(17,24,39,0.72)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={pickPostImage}
          activeOpacity={0.75}
          style={{
            minHeight: optionalLabel ? 140 : 168,
            padding: 18,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: radius.md,
              backgroundColor: BG,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: BORDER,
            }}
          >
            <ImagePlus size={22} color={ACCENT} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "800", color: TEXT_MAIN }}>
            {optionalLabel ? "Escolher imagem (opcional)" : "Escolher imagem"}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_SUB, textAlign: "center" }}>
            JPG, PNG, WebP ou HEIC até 5MB
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <CreateHeader
        insets={insets}
        title={meta.title}
        subtitle={meta.subtitle}
        icon={Icon}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            gap: 12,
            paddingBottom: 16,
          }}
        >
          {type === "post" ? (
            <>
              <TextInput
                value={form.content}
                onChangeText={(value) => update("content", value)}
                placeholder="O que quer partilhar?"
                placeholderTextColor={TEXT_SUB}
                multiline
                style={[multilineStyle, { minHeight: selectedImage ? 92 : 160 }]}
              />

              {selectedImage && renderImagePicker(false)}

              {!selectedImage && (
                <TouchableOpacity
                  onPress={pickPostImage}
                  activeOpacity={0.75}
                  style={{
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 44,
                    paddingHorizontal: 16,
                    borderRadius: radius.pill,
                    backgroundColor: ACCENT_LIGHT,
                  }}
                >
                  <ImagePlus size={18} color={ACCENT_DARK} />
                  <Text style={{ color: ACCENT_DARK, fontSize: 13, fontWeight: "700" }}>
                    Galeria
                  </Text>
                </TouchableOpacity>
              )}            </>
          ) : (
            <>
              <TextInput
                value={form.title}
                onChangeText={(value) => update("title", value)}
                placeholder={type === "job" ? "Título da vaga" : "Título do serviço"}
                placeholderTextColor={TEXT_SUB}
                style={inputStyle}
              />
              <TextInput
                value={form.description}
                onChangeText={(value) => update("description", value)}
                placeholder="Descrição"
                placeholderTextColor={TEXT_SUB}
                multiline
                style={multilineStyle}
              />

              {renderImagePicker(true)}

              {type === "service" ? (
                <>
                  <View style={[inputStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                    <Picker
                      selectedValue={form.category}
                      onValueChange={(value) => update("category", value)}
                      style={{ color: form.category ? TEXT_MAIN : TEXT_SUB, minHeight: 52 }}
                    >
                      <Picker.Item label="Categoria" value="" />
                      {categoryOptions.map((category) => (
                        <Picker.Item key={category} label={category} value={category} />
                      ))}
                    </Picker>
                  </View>
                  <TextInput
                    value={form.price}
                    onChangeText={(value) => update("price", value)}
                    placeholder="Preço (MZN)"
                    placeholderTextColor={TEXT_SUB}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </>
              ) : (
                <>
                  <TextInput
                    value={form.requirements}
                    onChangeText={(value) => update("requirements", value)}
                    placeholder="Requisitos, separados por vírgula"
                    placeholderTextColor={TEXT_SUB}
                    style={inputStyle}
                  />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TextInput
                      value={form.salary_min}
                      onChangeText={(value) => update("salary_min", value)}
                      placeholder="Salário mín. (MZN)"
                      placeholderTextColor={TEXT_SUB}
                      keyboardType="numeric"
                      style={[inputStyle, { flex: 1 }]}
                    />
                    <TextInput
                      value={form.salary_max}
                      onChangeText={(value) => update("salary_max", value)}
                      placeholder="Salário máx. (MZN)"
                      placeholderTextColor={TEXT_SUB}
                      keyboardType="numeric"
                      style={[inputStyle, { flex: 1 }]}
                    />
                  </View>
                </>
              )}
              <LocationFields
                province={form.province}
                city={form.city}
                onProvinceChange={(value) => update("province", value)}
                onCityChange={(value) => update("city", value)}
                inputStyle={inputStyle}
              />
            </>
          )}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: BG,
            borderTopWidth: 1,
            borderTopColor: BORDER,
          }}
        >
          {error ? (
            <Text style={{ color: "#DC2626", fontSize: 13, marginBottom: 10 }}>{error}</Text>
          ) : null}
          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
            style={{
              backgroundColor: ACCENT,
              minHeight: 54,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              opacity: submitting ? 0.65 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
              {submitting ? "Publicando..." : "Publicar"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
