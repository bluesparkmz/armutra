import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  MapPin,
  UserPlus,
  UserRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { armutraApi } from "@/utils/api";
import { logError } from "@/utils/logger";

const BLUE = "#2563EB";
const GREEN = "#10B981";
const BG = "#F8FAFC";

function InfoPill({ label }) {
  if (!label) return null;
  return (
    <View
      style={{
        backgroundColor: BLUE + "12",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: BLUE, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A" }}>{value}</Text>
      <Text style={{ fontSize: 12, color: "#64748B", marginTop: 3, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function normalizeProfile(kind, data) {
  if (!data) return null;
  if (kind === "empresa") {
    return {
      name: data.company_name,
      subtitle: data.industry || "Empresa",
      avatar: data.logo_url || data.user?.avatar_url,
      location: [data.city, data.province].filter(Boolean).join(", ") || "Mocambique",
      about: data.description || data.mission || "Empresa cadastrada no Armutra.",
      icon: Building2,
      tags: [data.industry, data.employees_range, data.website].filter(Boolean),
      stats: [
        { value: data.open_jobs || 0, label: "Vagas" },
        { value: data.rating || 0, label: "Rating" },
        { value: data.total_reviews || 0, label: "Avaliacoes" },
      ],
    };
  }
  if (kind === "freelancer") {
    return {
      name: data.user?.name,
      subtitle: data.profession || data.headline || "Freelancer",
      avatar: data.user?.avatar_url,
      location: [data.user?.city, data.user?.province].filter(Boolean).join(", ") || "Mocambique",
      about: data.bio || "Freelancer cadastrado no Armutra.",
      icon: UserRound,
      tags: [data.category, data.skills, data.price_label ||
        (data.hourly_rate != null
          ? `${Number(data.hourly_rate).toLocaleString("pt-MZ")} MZN/h`
          : null)].filter(Boolean),
      stats: [
        { value: data.completed_jobs || 0, label: "Trabalhos" },
        { value: data.rating || 0, label: "Rating" },
        { value: data.total_reviews || 0, label: "Avaliacoes" },
      ],
    };
  }
  return {
    name: data.name,
    subtitle: data.user_type === "empresa" ? "Empresa" : data.user_type === "freelancer" ? "Freelancer" : "Usuario",
    avatar: data.avatar_url,
    location: [data.city, data.province].filter(Boolean).join(", ") || "Mocambique",
    about: "Perfil publico no Armutra.",
    icon: UserRound,
    tags: [data.user_type, data.phone].filter(Boolean),
    stats: [
      { value: data.is_verified ? "Sim" : "Nao", label: "Verificado" },
      { value: data.province || "-", label: "Provincia" },
      { value: data.city || "-", label: "Cidade" },
    ],
  };
}

export default function PublicProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind || "user";
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-profile", kind, id],
    enabled: !!id,
    queryFn: () => {
      if (kind === "empresa") return armutraApi.getCompany(id);
      if (kind === "freelancer") return armutraApi.getFreelancer(id);
      return armutraApi.getUser(id);
    },
    onError: (queryError) => logError("public-profile", queryError, { kind, id }),
  });

  // Só UI por agora: o pedido de conexão ainda não é enviado à API
  const [connection, setConnection] = useState("none");
  const isPending = connection === "pending";

  const profile = normalizeProfile(kind, data);
  const Icon = profile?.icon || UserRound;

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View
          style={{
            minHeight: 250,
            backgroundColor: BLUE,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 64,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 22,
            }}
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <ArmutraAvatar uri={profile?.avatar} name={profile?.name || "Armutra"} size={84} />
            <Text style={{ color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 12, textAlign: "center" }}>
              {isLoading ? "Carregando..." : profile?.name || "Perfil"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Icon size={15} color="rgba(255,255,255,0.82)" />
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: "700" }}>
                {profile?.subtitle || "Armutra"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 }}>
              <MapPin size={13} color="rgba(255,255,255,0.75)" />
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{profile?.location}</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -44, gap: 16 }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 18,
              padding: 16,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            {error ? (
              <Text style={{ color: "#DC2626", fontWeight: "700" }}>
                Nao foi possivel carregar este perfil. Veja o console do Expo.
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 14 }}>
                  <CheckCircle size={15} color={GREEN} />
                  <Text style={{ color: GREEN, fontWeight: "800", fontSize: 13 }}>Perfil publico</Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  {(profile?.stats || []).map((stat, index) => (
                    <React.Fragment key={stat.label}>
                      {index > 0 && <View style={{ width: 1, backgroundColor: "#F1F5F9" }} />}
                      <Stat value={stat.value} label={stat.label} />
                    </React.Fragment>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={{ backgroundColor: "#fff", borderRadius: 18, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#0F172A", marginBottom: 10 }}>
              Sobre
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B", lineHeight: 21 }}>
              {profile?.about || "Sem descricao."}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {(profile?.tags || []).map((tag) => (
                <InfoPill key={tag} label={tag} />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => setConnection((current) => (current === "none" ? "pending" : "none"))}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: isPending ? "#fff" : BLUE,
                borderWidth: 1.5,
                borderColor: BLUE,
                minHeight: 50,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {isPending ? (
                <Clock size={18} color={BLUE} />
              ) : (
                <UserPlus size={18} color="#fff" />
              )}
              <Text style={{ color: isPending ? BLUE : "#fff", fontSize: 15, fontWeight: "800" }}>
                {isPending ? "Pedido enviado" : "Conectar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderWidth: 1.5,
                borderColor: "#E2E8F0",
                minHeight: 50,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Briefcase size={18} color="#0F172A" />
              <Text style={{ color: "#0F172A", fontSize: 15, fontWeight: "800" }}>Contactar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
