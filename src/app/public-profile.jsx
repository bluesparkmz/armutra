import React from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle,
  MapPin,
  UserPlus,
  UserRound,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { armutraApi, mediaUrl } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import {
  ACCENT,
  ACCENT_DARK,
  ACCENT_LIGHT,
  BG_SOFT,
  BLACK,
  BORDER,
  CARD,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_SUB,
} from "@/theme";

function InfoPill({ label }) {
  if (!label) return null;
  return (
    <View
      style={{
        backgroundColor: ACCENT_LIGHT,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text style={{ color: ACCENT_DARK, fontSize: 12, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function Stat({ value, label }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 14 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 3, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function normalizeProfile(kind, data) {
  if (!data) return null;
  const tipo = data.tipo || (kind === "empresa" ? "empresa" : kind === "freelancer" ? "candidato" : null);
  const avatar = mediaUrl(data.foto_perfil || data.logo_url || data.avatar_url || data.user?.avatar_url);
  const location = data.localizacao || [data.city, data.province].filter(Boolean).join(", ") || "Moçambique";

  if (tipo === "empresa" || data.empresa || data.company_name) {
    const empresa = data.empresa || {};
    return {
      name: empresa.nome_empresa || data.nome || data.company_name,
      subtitle: "Empresa",
      avatar,
      location,
      about: empresa.descricao || data.bio || data.description || "Empresa cadastrada no Armutra.",
      icon: Building2,
      tags: [empresa.website, location].filter(Boolean),
      stats: [
        { value: location, label: "Local" },
        { value: empresa.website ? "Sim" : "Não", label: "Website" },
      ],
    };
  }

  const candidato = data.candidato || {};
  const skills = Array.isArray(candidato.habilidades) ? candidato.habilidades : [];
  return {
    name: data.nome || data.name || data.user?.name,
    subtitle: skills[0] || (tipo === "candidato" ? "Candidato" : "Utilizador"),
    avatar,
    location,
    about: data.bio || candidato.experiencia || candidato.educacao || "Perfil no Armutra.",
    icon: UserRound,
    tags: skills.length ? skills : [data.email].filter(Boolean),
    stats: [
      { value: skills.length, label: "Habilidades" },
      { value: candidato.cv_url ? "Sim" : "Não", label: "CV" },
      { value: location, label: "Local" },
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
    queryFn: () => armutraApi.getUser(id),
    onError: (queryError) => logError("public-profile", queryError, { kind, id }),
  });

  // Conexão = seguir o utilizador para o manter de perto
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const queryClient = useQueryClient();
  const targetUserId = data?.id || id;
  const isMe = !!targetUserId && auth?.user?.id === targetUserId;

  const { data: connectionStatus } = useQuery({
    queryKey: ["connection-status", targetUserId, !!token],
    enabled: !!targetUserId && !!token && !isMe,
    queryFn: () => armutraApi.getConnectionStatus(targetUserId, token),
  });

  const followMutation = useMutation({
    mutationFn: (follow) =>
      follow
        ? armutraApi.followUser(targetUserId, token)
        : armutraApi.unfollowUser(targetUserId, token),
    onSuccess: (result) => {
      queryClient.setQueryData(["connection-status", targetUserId, !!token], result);
    },
    onError: (mutationError) => {
      logError("follow-user", mutationError, { targetUserId });
      const raw = mutationError?.message || "";
      const missing = /not found|não encontrado|nao encontrado/i.test(raw);
      Alert.alert(
        "Conectar",
        missing ? "Seguir ainda não está disponível nesta API." : raw || "Não foi possível actualizar a conexão."
      );
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["connection-counts", targetUserId, connectionStatus?.seguidores],
    enabled: !!targetUserId,
    queryFn: () => armutraApi.getConnectionCounts(targetUserId),
  });

  const isFollowing = !!connectionStatus?.a_seguir_utilizador;
  const isCompany = data?.tipo === "empresa" || kind === "empresa";
  const related = useQuery({
    queryKey: ["profile-related", id, isCompany],
    enabled: !!id && !!data,
    queryFn: () => (isCompany ? armutraApi.getJobsByCompany(id) : armutraApi.getServicesByUser(id)),
  });

  const handleConnect = () => {
    if (!token) {
      Alert.alert("Iniciar sessão", "Entre na sua conta para seguir este perfil.");
      return;
    }
    if (!targetUserId) {
      Alert.alert("Indisponível", "Não foi possível identificar este utilizador.");
      return;
    }
    followMutation.mutate(!isFollowing);
  };

  const baseProfile = normalizeProfile(kind, data);
  const profile = baseProfile && {
    ...baseProfile,
    stats: counts
      ? [...baseProfile.stats.slice(0, 2), { value: counts.seguidores, label: "Seguidores" }]
      : baseProfile.stats,
  };
  const Icon = profile?.icon || UserRound;

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
          <Text style={{ fontSize: 20, fontWeight: "800", color: TEXT_MAIN }}>Perfil</Text>
        </View>
      </ScreenFixedHeader>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      >
        {/* Identidade */}
        <View
          style={{
            backgroundColor: CARD,
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
          }}
        >
          <View
            style={{
              borderWidth: 3,
              borderColor: ACCENT_LIGHT,
              borderRadius: 999,
              padding: 2,
            }}
          >
            <ArmutraAvatar uri={profile?.avatar} name={profile?.name || "Armutra"} size={92} />
          </View>
          <Text
            style={{
              color: TEXT_MAIN,
              fontSize: 22,
              fontWeight: "800",
              marginTop: 14,
              textAlign: "center",
            }}
          >
            {isLoading ? "A carregar..." : profile?.name || "Perfil"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Icon size={15} color={ACCENT_DARK} />
            <Text style={{ color: ACCENT_DARK, fontSize: 14, fontWeight: "600" }}>
              {profile?.subtitle || "Armutra"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
            <MapPin size={13} color={TEXT_MUTED} />
            <Text style={{ color: TEXT_SUB, fontSize: 13 }}>{profile?.location}</Text>
          </View>

          {/* Ações */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18, width: "100%" }}>
            {!isMe && (
            <TouchableOpacity
              onPress={handleConnect}
              disabled={followMutation.isPending}
              activeOpacity={0.85}
              style={{
                flex: 1,
                opacity: followMutation.isPending ? 0.6 : 1,
                backgroundColor: isFollowing ? CARD : ACCENT,
                borderWidth: 1.5,
                borderColor: ACCENT,
                minHeight: 46,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {isFollowing ? (
                <CheckCircle size={17} color={ACCENT_DARK} />
              ) : (
                <UserPlus size={17} color="#fff" />
              )}
              <Text
                style={{
                  color: isFollowing ? ACCENT_DARK : "#fff",
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {isFollowing ? "A seguir" : "Conectar"}
              </Text>
            </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                if (!targetUserId || isMe) return;
                router.push({ pathname: "/messages", params: { userId: targetUserId, nome: profile?.name || "" } });
              }}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: BLACK,
                minHeight: 46,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <Briefcase size={17} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Contactar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Estatísticas */}
        <View
          style={{
            backgroundColor: CARD,
            marginTop: 8,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: BORDER,
          }}
        >
          {error ? (
            <Text style={{ color: "#DC2626", fontWeight: "600", padding: 16 }}>
              Não foi possível carregar este perfil.
            </Text>
          ) : (
            <View style={{ flexDirection: "row" }}>
              {(profile?.stats || []).map((stat, index) => (
                <React.Fragment key={stat.label}>
                  {index > 0 && <View style={{ width: 1, backgroundColor: BORDER }} />}
                  <Stat value={stat.value} label={stat.label} />
                </React.Fragment>
              ))}
            </View>
          )}
        </View>

        {/* Sobre */}
        <View
          style={{
            backgroundColor: CARD,
            marginTop: 8,
            padding: 20,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: BORDER,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN, marginBottom: 8 }}>
            Sobre
          </Text>
          <Text style={{ fontSize: 14, color: TEXT_SUB, lineHeight: 21 }}>
            {profile?.about || "Sem descrição."}
          </Text>
          {(profile?.tags || []).length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {profile.tags.map((tag) => (
                <InfoPill key={tag} label={tag} />
              ))}
            </View>
          )}
          {profile && !error && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 16 }}>
              <CheckCircle size={14} color={ACCENT} />
              <Text style={{ color: ACCENT_DARK, fontWeight: "600", fontSize: 12 }}>
                Perfil público
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            backgroundColor: CARD,
            marginTop: 8,
            padding: 20,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: BORDER,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN }}>
            {isCompany ? "Vagas abertas" : "Serviços"}
          </Text>
          {(related.data || []).length === 0 ? (
            <Text style={{ color: TEXT_SUB, fontSize: 14 }}>
              {isCompany ? "Esta empresa não tem vagas abertas." : "Este perfil ainda não publicou serviços."}
            </Text>
          ) : (
            related.data.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/content-detail",
                    params: {
                      type: isCompany ? "vaga" : "servico",
                      id: item.id,
                      item: JSON.stringify(item),
                    },
                  })
                }
                style={{
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Text style={{ fontWeight: "800", color: TEXT_MAIN }}>{item.titulo || item.title}</Text>
                <Text style={{ color: TEXT_SUB, marginTop: 4 }} numberOfLines={2}>
                  {isCompany
                    ? [item.salario || item.salary, item.localizacao || item.location].filter(Boolean).join(" · ")
                    : [item.preco == null || item.preco === "" ? "A negociar" : `${item.preco} MZN`, item.categoria]
                        .filter(Boolean)
                        .join(" · ")}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
