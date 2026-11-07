import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  CheckCircle,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import FullWidthImage from "@/components/FullWidthImage";
import ImageViewerModal from "@/components/ImageViewerModal";
import { armutraApi } from "@/utils/api";
import { useAuth } from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import { displayMoney, formatMzn, formatSalaryRange, priceFromItem } from "@/utils/formatMoney";
import {
  ACCENT,
  ACCENT_DARK,
  TEXT_MAIN,
  TEXT_SUB,
  BG_SOFT as BG,
  CARD,
  BORDER,
} from "@/theme";

const jobTypeLabels = {
  full_time: "Full-time",
  part_time: "Part-time",
  freelancer: "Freelancer",
  contract: "Contrato",
};

function parseSnapshot(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatDate(value, fallback = "Recente") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("pt-MZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function salaryLabel(item) {
  if (!item) return null;
  if (item.salary_min != null || item.salary_max != null) {
    return formatSalaryRange(item.salary_min, item.salary_max);
  }
  return displayMoney(item.salary) || "A negociar";
}

function ownerProfile(type, item) {
  if (item.profile_id || item.user_id) {
    return {
      kind: item.profile_type || (type === "vaga" ? "empresa" : "user"),
      id: item.profile_id || item.user_id,
    };
  }

  if (type === "vaga") {
    const company = item.company_user?.company_profile;
    return { kind: company ? "empresa" : "user", id: company?.id || item.company_user_id };
  }

  if (type === "servico") {
    const owner = item.owner_user || {};
    const profile = owner.freelancer_profile || owner.company_profile;
    return {
      kind: owner.freelancer_profile ? "freelancer" : owner.company_profile ? "empresa" : "user",
      id: profile?.id || item.owner_user_id,
    };
  }

  const author = item.author || {};
  const profile = author.freelancer_profile || author.company_profile;
  return {
    kind: author.freelancer_profile ? "freelancer" : author.company_profile ? "empresa" : "user",
    id: profile?.id || item.author_id,
  };
}

function normalize(type, item) {
  if (!item) return null;

  if (type === "vaga") {
    const company = item.company_user?.company_profile;
    const tags = item.tags || (item.requirements || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    return {
      accent: ACCENT,
      icon: Briefcase,
      label: "Vaga",
      title: item.title,
      body: item.description,
      owner: item.company || company?.company_name || item.company_user?.name,
      avatar: item.avatar || item.logo || company?.logo_url || item.company_user?.avatar_url,
      role: company?.industry || item.category || "Empresa",
      image: item.image || item.image_url || null,
      location: item.location || [item.city, item.province].filter(Boolean).join(", ") || "Moçambique",
      postedAt: item.postedAt || formatDate(item.created_at),
      meta: [
        jobTypeLabels[item.job_type] || item.jobType || item.type,
        salaryLabel(item),
      ].filter(Boolean),
      tags,
      likes: item.likes ?? item.likes_count ?? 0,
      comments: item.comments ?? item.comments_count ?? 0,
      cta: "Candidatar-se",
      ctaLabel: "Salário",
      ctaValue: salaryLabel(item) || "A negociar",
    };
  }

  if (type === "servico") {
    const owner = item.owner_user || {};
    const freelancer = owner.freelancer_profile;
    return {
      accent: ACCENT,
      icon: Sparkles,
      label: "Servico",
      title: item.title,
      body: item.description,
      owner: item.company || owner.name,
      avatar: item.avatar || owner.avatar_url,
      role: item.category || freelancer?.profession || "Servico profissional",
      image: item.image || item.image_url,
      location: item.location || [item.city, item.province].filter(Boolean).join(", ") || "Mocambique",
      postedAt: item.postedAt || formatDate(item.created_at),
      meta: [
        priceFromItem(item) ||
          displayMoney(item.price) ||
          displayMoney(freelancer?.price_label) ||
          "A negociar",
        item.rating ? `${item.rating} rating` : null,
      ].filter(Boolean),
      tags: [item.category, item.owner_type].filter(Boolean),
      likes: item.likes ?? item.likes_count ?? 0,
      comments: item.comments ?? item.comments_count ?? 0,
      cta: "Solicitar serviço",
      ctaLabel: "Preço",
      ctaValue:
        priceFromItem(item) ||
        displayMoney(item.price) ||
        displayMoney(freelancer?.price_label) ||
        "A negociar",
    };
  }

  return {
    accent: ACCENT,
    icon: Send,
    label: "Post",
    title: null,
    body: item.content,
    owner: item.author?.name || item.author,
    avatar: item.avatar || item.author?.avatar_url,
    role: item.role || item.author?.user_type || "Usuario",
    image: item.image || item.image_url,
    location: item.location || [item.author?.city, item.author?.province].filter(Boolean).join(", ") || null,
    postedAt: item.postedAt || formatDate(item.created_at),
    meta: [],
    tags: [],
    likes: item.likes ?? item.likes_count ?? 0,
    comments: item.comments ?? item.comments_count ?? 0,
    cta: null,
  };
}

function Badge({ icon: Icon, label, color }) {
  return (
    <View
      style={{
        minHeight: 30,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: color + "12",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon size={13} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: "900" }}>{label}</Text>
    </View>
  );
}

function Action({ icon: Icon, label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7 }}
    >
      <Icon size={20} color={active ? "#EF4444" : TEXT_SUB} fill={active ? "#EF4444" : "transparent"} />
      <Text style={{ color: TEXT_SUB, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ContentDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const type = Array.isArray(params.type) ? params.type[0] : params.type || "post";
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const snapshot = useMemo(() => parseSnapshot(params.item), [params.item]);
  const { auth } = useAuth();
  const user = auth?.user;
  const token = auth?.accessToken;
  const [liked, setLiked] = useState(false);
  const [message, setMessage] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["content-detail", type, id],
    enabled: !snapshot && !!id,
    initialData: snapshot || undefined,
    queryFn: () => {
      if (type === "servico") return armutraApi.getService(id);
      if (type === "vaga") return armutraApi.getJob(id);
      return armutraApi.getPost(id);
    },
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    onError: (queryError) => logError("content-detail", queryError, { type, id }),
  });

  const detail = useMemo(() => normalize(type, data), [type, data]);
  const Icon = detail?.icon || Send;
  const showLoader = isLoading && !detail;

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Entre na sua conta para continuar.");
      if (type === "servico") return armutraApi.requestService(id, { requester_user_id: user.id }, token);
      if (type === "vaga") return armutraApi.applyToJob(id, { applicant_user_id: user.id }, token);
      return null;
    },
    onSuccess: () => setMessage(type === "vaga" ? "Candidatura enviada." : "Pedido enviado."),
    onError: (mutationError) => {
      setMessage(mutationError.message);
      logError("content-detail-action", mutationError, { type, id });
    },
  });

  const openOwner = () => {
    if (!data) return;
    const profile = ownerProfile(type, data);
    if (!profile.id) return;
    router.push({ pathname: "/public-profile", params: profile });
  };

  return (
    <View style={{ flex: 1, backgroundColor: CARD, paddingTop: insets.top }}>
      <View
        style={{
          height: 56,
          paddingHorizontal: 12,
          backgroundColor: CARD,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.75}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <ArrowLeft size={22} color={TEXT_MAIN} />
        </TouchableOpacity>
        {detail && <Badge icon={Icon} label={detail.label} color={detail.accent} />}
      </View>

      {showLoader ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : error && !detail ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#DC2626", fontSize: 14, fontWeight: "700" }}>
            Não foi possível abrir esta publicação.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          >
            {/* Autor */}
            <TouchableOpacity
              onPress={openOwner}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 12,
              }}
            >
              <ArmutraAvatar
                uri={detail.avatar}
                name={detail.owner || "Armutra"}
                size={44}
                borderRadius={22}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: TEXT_MAIN, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                  {detail.owner || "Armutra"}
                </Text>
                <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {[detail.role, detail.postedAt].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Título e texto */}
            {!!detail.title && (
              <Text
                style={{
                  color: TEXT_MAIN,
                  fontSize: 20,
                  fontWeight: "700",
                  lineHeight: 27,
                  paddingHorizontal: 16,
                  marginBottom: 8,
                }}
              >
                {detail.title}
              </Text>
            )}
            {!!detail.body && (
              <Text
                style={{
                  color: TEXT_MAIN,
                  fontSize: 15,
                  lineHeight: 23,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                }}
              >
                {detail.body}
              </Text>
            )}

            {/* Imagem em largura total */}
            {!!detail.image && (
              <TouchableOpacity activeOpacity={0.95} onPress={() => setViewerOpen(true)}>
                <FullWidthImage uri={detail.image} />
              </TouchableOpacity>
            )}

            {/* Interações */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 4,
              }}
            >
              <Text style={{ color: TEXT_SUB, fontSize: 13 }}>
                {(detail.likes || 0) + (liked ? 1 : 0)} gostos · {detail.comments || 0} comentários
              </Text>
            </View>
            <View
              style={{
                marginTop: 8,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: BORDER,
                paddingHorizontal: 16,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Action
                icon={Heart}
                label="Gostar"
                active={liked}
                onPress={() => setLiked((value) => !value)}
              />
              <Action icon={MessageCircle} label="Comentar" />
              <Action icon={Share2} label="Partilhar" />
              <Action icon={Bookmark} label="Guardar" />
            </View>

            {/* Detalhes (vagas e serviços) */}
            {(detail.tags.length > 0 || detail.meta.length > 0) && (
              <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                <Text style={{ color: TEXT_MAIN, fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
                  Detalhes
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {!!detail.location && (
                    <View style={chipStyle}>
                      <MapPin size={14} color={TEXT_MAIN} />
                      <Text style={chipText}>{detail.location}</Text>
                    </View>
                  )}
                  {detail.meta.map((meta) => (
                    <View key={meta} style={chipStyle}>
                      <Text style={chipText}>{meta}</Text>
                    </View>
                  ))}
                  {detail.tags.map((tag) => (
                    <View key={tag} style={chipStyle}>
                      <Text style={chipText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Ação fixa em baixo */}
          {!!detail.cta && (
            <View
              style={{
                backgroundColor: CARD,
                borderTopWidth: 1,
                borderTopColor: BORDER,
                paddingHorizontal: 16,
                paddingTop: 10,
                paddingBottom: Math.max(insets.bottom, 12),
              }}
            >
              {!!message && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <CheckCircle size={14} color={message.includes("enviad") ? ACCENT : "#DC2626"} />
                  <Text
                    style={{
                      color: message.includes("enviad") ? ACCENT_DARK : "#DC2626",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {message}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ color: TEXT_SUB, fontSize: 11 }}>{detail.ctaLabel}</Text>
                  <Text
                    style={{ color: ACCENT_DARK, fontSize: 16, fontWeight: "700", marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {detail.ctaValue}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => actionMutation.mutate()}
                  disabled={actionMutation.isPending}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: 12,
                    backgroundColor: ACCENT,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: actionMutation.isPending ? 0.65 : 1,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                    {actionMutation.isPending ? "A enviar..." : detail.cta}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

      <ImageViewerModal
        visible={viewerOpen}
        uri={detail?.image}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const chipStyle = {
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 999,
  backgroundColor: BG,
  borderWidth: 1,
  borderColor: BORDER,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
};

const chipText = {
  color: TEXT_MAIN,
  fontSize: 13,
  fontWeight: "600",
};
