import React, { useMemo, useState } from "react";
import { Keyboard, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { ArrowLeft, Building2, UserRoundCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationFields from "@/components/LocationFields";
import { freelancerCategories } from "@/data/categories";
import { getDefaultDistrict } from "@/data/mozambiqueLocationsData";
import { authApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import { ACCENT, BG_SOFT } from "@/theme";

const BG = BG_SOFT;

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

const multilineStyle = {
  ...inputStyle,
  minHeight: 116,
  textAlignVertical: "top",
};

const categoryOptions = freelancerCategories.filter((category) => category !== "Todos");
const DEFAULT_PROVINCE = "Cidade de Maputo";

export default function BecomeProfileScreen({ type }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth, setAuth } = useAuth();
  const user = auth?.user;
  const token = auth?.accessToken;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    company_name: user?.name || "",
    industry: "",
    description: "",
    profession: "",
    category: "",
    bio: "",
    skills: "",
    hourly_rate: "",
    province: user?.province || DEFAULT_PROVINCE,
    city: user?.city || getDefaultDistrict(user?.province || DEFAULT_PROVINCE),
  });

  const meta = useMemo(() => {
    if (type === "company") {
      return {
        title: "Criar empresa",
        subtitle: "Prepare a sua empresa para publicar vagas.",
        icon: Building2,
      };
    }
    return {
      title: "Virar freelancer",
      subtitle: "Mostre os seus servicos e habilidades.",
      icon: UserRoundCheck,
    };
  }, [type]);

  const Icon = meta.icon;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    Keyboard.dismiss();
    if (!user?.id) {
      setError("Entre na sua conta para continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const localizacao = [form.city, form.province].filter(Boolean).join(", ");
      if (type === "company") {
        await authApi.updateMe(
          {
            nome: form.company_name.trim() || undefined,
            localizacao,
            empresa: {
              nome_empresa: form.company_name.trim(),
              descricao: form.description.trim() || null,
            },
          },
          token
        );
      } else {
        const habilidades = form.skills
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        if (form.profession.trim()) habilidades.unshift(form.profession.trim());
        await authApi.updateMe(
          {
            bio: form.bio.trim() || null,
            localizacao,
            candidato: {
              habilidades,
              experiencia: form.bio.trim() || null,
            },
          },
          token
        );
      }

      if (token) {
        const freshUser = await authApi.me(token);
        setAuth({ ...auth, user: freshUser });
      }
      router.back();
    } catch (submitError) {
      logError(`become-${type}`, submitError);
      setError(submitError.message);
    } finally {
      setSubmitting(false);
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
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: "#0F172A" }}>
            {meta.title}
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
            {meta.subtitle}
          </Text>
        </View>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: ACCENT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={19} color="#fff" />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
      >
        {type === "company" ? (
          <>
            <TextInput
              value={form.company_name}
              onChangeText={(value) => update("company_name", value)}
              placeholder="Nome da empresa"
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={inputStyle}
            />
            <TextInput
              value={form.industry}
              onChangeText={(value) => update("industry", value)}
              placeholder="Area da empresa"
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={inputStyle}
            />
            <TextInput
              value={form.description}
              onChangeText={(value) => update("description", value)}
              placeholder="Descricao da empresa"
              multiline
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={multilineStyle}
            />
          </>
        ) : (
          <>
            <TextInput
              value={form.profession}
              onChangeText={(value) => update("profession", value)}
              placeholder="Profissao"
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={inputStyle}
            />
            <View style={[inputStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
              <Picker
                selectedValue={form.category}
                onValueChange={(value) => update("category", value)}
                dropdownIconColor={ACCENT}
                style={{ color: form.category ? "#0F172A" : "#94A3B8", minHeight: 52 }}
              >
                <Picker.Item label="Categoria" value="" />
                {categoryOptions.map((category) => (
                  <Picker.Item key={category} label={category} value={category} />
                ))}
              </Picker>
            </View>
            <TextInput
              value={form.skills}
              onChangeText={(value) => update("skills", value)}
              placeholder="Habilidades, separadas por virgula"
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={inputStyle}
            />
            <TextInput
              value={form.hourly_rate}
              onChangeText={(value) => update("hourly_rate", value)}
              placeholder="Preco por hora"
              keyboardType="numeric"
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={inputStyle}
            />
            <TextInput
              value={form.bio}
              onChangeText={(value) => update("bio", value)}
              placeholder="Fale sobre o seu trabalho"
              multiline
              selectionColor={ACCENT}
              cursorColor={ACCENT}
              style={multilineStyle}
            />
          </>
        )}

        <LocationFields
          province={form.province}
          city={form.city}
          onProvinceChange={(value) => update("province", value)}
          onCityChange={(value) => update("city", value)}
          inputStyle={inputStyle}
        />

        {error && <Text style={{ color: "#DC2626", fontSize: 13 }}>{error}</Text>}

        <TouchableOpacity
          onPress={submit}
          disabled={submitting}
          style={{
            backgroundColor: ACCENT,
            minHeight: 54,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            opacity: submitting ? 0.65 : 1,
            marginTop: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "800" }}>
            {submitting ? "Salvando..." : "Salvar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
