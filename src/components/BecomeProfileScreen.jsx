import React, { useMemo, useState } from "react";
import { Keyboard, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { ArrowLeft, Building2, UserRoundCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationFields from "@/components/LocationFields";
import { freelancerCategories } from "@/data/freelancersData";
import { getDefaultDistrict } from "@/data/mozambiqueLocationsData";
import { authApi, armutraApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";

const BLUE = "#2563EB";
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
      if (type === "company") {
        await armutraApi.createCompanyProfile(
          {
            user_id: user.id,
            company_name: form.company_name.trim(),
            industry: form.industry.trim() || null,
            description: form.description.trim() || null,
            contact_email: user.email,
            province: form.province.trim() || null,
            city: form.city.trim() || null,
          },
          token
        );
      } else {
        await armutraApi.createFreelancerProfile(
          {
            user_id: user.id,
            headline: form.profession.trim() || null,
            profession: form.profession.trim() || null,
            category: form.category.trim() || null,
            bio: form.bio.trim() || null,
            skills: form.skills.trim() || null,
            hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
            available: true,
            availability_status: "Disponivel",
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
            backgroundColor: BLUE,
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
              style={inputStyle}
            />
            <TextInput
              value={form.industry}
              onChangeText={(value) => update("industry", value)}
              placeholder="Area da empresa"
              style={inputStyle}
            />
            <TextInput
              value={form.description}
              onChangeText={(value) => update("description", value)}
              placeholder="Descricao da empresa"
              multiline
              style={multilineStyle}
            />
          </>
        ) : (
          <>
            <TextInput
              value={form.profession}
              onChangeText={(value) => update("profession", value)}
              placeholder="Profissao"
              style={inputStyle}
            />
            <View style={[inputStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
              <Picker
                selectedValue={form.category}
                onValueChange={(value) => update("category", value)}
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
              style={inputStyle}
            />
            <TextInput
              value={form.hourly_rate}
              onChangeText={(value) => update("hourly_rate", value)}
              placeholder="Preco por hora"
              keyboardType="numeric"
              style={inputStyle}
            />
            <TextInput
              value={form.bio}
              onChangeText={(value) => update("bio", value)}
              placeholder="Fale sobre o seu trabalho"
              multiline
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
            backgroundColor: BLUE,
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
