import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Clock,
  Users,
  Banknote,
} from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import JobListItem from "@/components/JobListItem";
import FullWidthImage from "@/components/FullWidthImage";
import SkeletonCard from "@/components/SkeletonCard";
import { HomeTopBar, HomeSearchBar } from "@/components/HomeHeader";
import FeedPromoBanner from "@/components/FeedPromoBanner";
import FilterChips from "@/components/FilterChips";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { useUser } from "@/utils/auth/useUser";
import { armutraApi } from "@/utils/api";
import { logError } from "@/utils/logger";
import { displayMoney, salaryFromItem, priceFromItem } from "@/utils/formatMoney";
import {
  ACCENT,
  BLACK,
  TEXT_MAIN,
  TEXT_SUB,
  TEXT_MUTED,
  BG,
  BG_SOFT,
  BORDER,
  feedCardStyle,
  feedCardImageBleed,
} from "@/theme";

const feedTypes = ["Todos", "Posts", "Vagas", "Serviços", "Empresas"];

function openPublicProfile(router, item) {
  const kind = item.profile_type || (item.type === "empresa" ? "empresa" : "user");
  const id = item.profile_id || item.user_id || (item.type === "empresa" ? item.id : null);
  if (!id) return;
  router.push({ pathname: "/public-profile", params: { kind, id } });
}

function openContentDetail(router, item) {
  if (!["post", "vaga", "servico"].includes(item.type)) return;
  router.push({
    pathname: "/content-detail",
    params: { type: item.type, id: item.id, item: JSON.stringify(item) },
  });
}

function parseSkills(item) {
  if (Array.isArray(item.skills)) return item.skills.filter(Boolean);
  if (typeof item.skills === "string" && item.skills.trim()) {
    return item.skills.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(item.tags)) return item.tags;
  return [];
}

function TypeBadge({ label, color = ACCENT }) {
  return (
    <View
      style={{
        backgroundColor: color + "18",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

function DetailRow({ icon: Icon, text }) {
  if (!text) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <Icon size={15} color={TEXT_MUTED} strokeWidth={2} />
      <Text style={{ fontSize: 13, color: TEXT_SUB, flex: 1 }} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

function SkillTags({ skills }) {
  if (!skills.length) return null;
  const visible = skills.slice(0, 3);
  const rest = skills.length - 3;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 10 }}>
      {visible.map((skill) => (
        <View
          key={skill}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: BORDER,
          }}
        >
          <Text style={{ fontSize: 11, color: TEXT_SUB, fontWeight: "500" }}>{skill}</Text>
        </View>
      ))}
      {rest > 0 && (
        <Text style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: "500" }}>+ {rest} mais</Text>
      )}
    </View>
  );
}

function CardFooter({ left, right }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: BORDER,
      }}
    >
      {left ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Clock size={13} color={TEXT_MUTED} />
          <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{left}</Text>
        </View>
      ) : (
        <View />
      )}
      {right != null && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Users size={13} color={TEXT_MUTED} />
          <Text style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: "600" }}>{right}</Text>
        </View>
      )}
    </View>
  );
}

function PrimaryButton({ label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: BLACK,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 16,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── POST card ─────────────────────────────────────────────────────
function PostCard({ item }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes);
  const scale = useRef(new Animated.Value(1)).current;

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.25, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setLiked((v) => !v);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <TouchableOpacity
      onPress={() => openContentDetail(router, item)}
      activeOpacity={0.92}
      style={feedCardStyle}
    >
      <TouchableOpacity
        onPress={() => openPublicProfile(router, item)}
        activeOpacity={0.8}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
      >
        <ArmutraAvatar uri={item.avatar} name={item.author} size={44} borderRadius={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: TEXT_MAIN }}>{item.author}</Text>
          {!!item.role && (
            <Text style={{ fontSize: 12, color: TEXT_SUB, marginTop: 2 }}>{item.role}</Text>
          )}
        </View>
        <TypeBadge label="Post" color={ACCENT} />
      </TouchableOpacity>

      {!!item.content && (
        <Text style={{ fontSize: 14, color: TEXT_MAIN, lineHeight: 21, marginBottom: 12 }}>
          {item.content}
        </Text>
      )}

      {item.image && (
        <View style={{ ...feedCardImageBleed, marginBottom: 12 }}>
          <FullWidthImage uri={item.image} maxHeight={300} />
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <TouchableOpacity
          onPress={handleLike}
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Heart
              size={18}
              color={liked ? "#EF4444" : TEXT_MUTED}
              fill={liked ? "#EF4444" : "transparent"}
            />
          </Animated.View>
          <Text style={{ fontSize: 13, color: TEXT_SUB, fontWeight: "500" }}>{likesCount}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <MessageCircle size={18} color={TEXT_MUTED} />
          <Text style={{ fontSize: 13, color: TEXT_SUB, fontWeight: "500" }}>{item.comments}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Share2 size={18} color={TEXT_MUTED} />
          <Text style={{ fontSize: 13, color: TEXT_SUB, fontWeight: "500" }}>Partilhar</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── VAGA (linha compacta, estilo lista profissional) ──────────────
function VagaCard({ item }) {
  const router = useRouter();

  return (
    <JobListItem
      title={item.title}
      company={item.company}
      logo={item.avatar}
      location={item.location}
      jobType={item.jobType}
      salary={salaryFromItem(item) || displayMoney(item.salary)}
      postedAt={item.postedAt}
      onPress={() => openContentDetail(router, item)}
      onPressCompany={() => openPublicProfile(router, item)}
    />
  );
}
// ── SERVIÇO card ──────────────────────────────────────────────────
function ServicoCard({ item }) {
  const router = useRouter();
  const skills = parseSkills(item);

  return (
    <TouchableOpacity
      onPress={() => openContentDetail(router, item)}
      activeOpacity={0.92}
      style={feedCardStyle}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
        <TouchableOpacity onPress={() => openPublicProfile(router, item)} activeOpacity={0.8}>
          <ArmutraAvatar uri={item.avatar} name={item.company} size={48} borderRadius={24} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN, lineHeight: 22 }} numberOfLines={2}>
            {item.title}
          </Text>
          {!!item.company && (
            <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 4 }} numberOfLines={1}>
              {item.company}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <TypeBadge label="Serviço" color={ACCENT} />
      </View>

      {item.image && (
        <View style={{ ...feedCardImageBleed, marginBottom: 12 }}>
          <FullWidthImage uri={item.image} maxHeight={300} />
        </View>
      )}

      <DetailRow icon={Banknote} text={priceFromItem(item) || displayMoney(item.price)} />
      <DetailRow icon={MapPin} text={item.location} />

      {!!item.description && (
        <Text style={{ fontSize: 13, color: TEXT_SUB, lineHeight: 19 }} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <SkillTags skills={skills} />
      <CardFooter left={item.postedAt} />

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
        <PrimaryButton label="Contratar" onPress={() => openContentDetail(router, item)} />
      </View>
    </TouchableOpacity>
  );
}

// ── EMPRESA card ──────────────────────────────────────────────────
function EmpresaCard({ item }) {
  const router = useRouter();

  return (
    <View style={feedCardStyle}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <TouchableOpacity onPress={() => openPublicProfile(router, item)} activeOpacity={0.8}>
          <ArmutraAvatar uri={item.avatar} name={item.company} size={48} borderRadius={24} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN }} numberOfLines={2}>
            {item.company}
          </Text>
          <View style={{ marginTop: 8, alignSelf: "flex-start" }}>
            <TypeBadge label="Empresa" color="#7C3AED" />
          </View>
        </View>
      </View>

      <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT_MAIN, marginBottom: 6 }}>{item.title}</Text>
      <Text style={{ fontSize: 13, color: TEXT_SUB, lineHeight: 19, marginBottom: 12 }} numberOfLines={3}>
        {item.description}
      </Text>

      <DetailRow icon={MapPin} text={item.location} />
      {item.employees && <DetailRow icon={Users} text={`${item.employees} colaboradores`} />}

      <CardFooter left={item.postedAt} />

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
        <PrimaryButton label="Ver perfil" onPress={() => openPublicProfile(router, item)} />
      </View>
    </View>
  );
}

function FeedCard({ item }) {
  if (item.type === "post") return <PostCard item={item} />;
  if (item.type === "vaga") return <VagaCard item={item} />;
  if (item.type === "servico") return <ServicoCard item={item} />;
  if (item.type === "empresa") return <EmpresaCard item={item} />;
  return null;
}

const TYPE_MAP = {
  Posts: "post",
  Vagas: "vaga",
  Serviços: "servico",
  Empresas: "empresa",
};

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const {
    data: feedItems = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["feed"],
    queryFn: () => armutraApi.getFeed(),
    staleTime: 0,
    refetchOnMount: "always",
    onError: (queryError) => logError("feed-query", queryError),
  });

  const filtered = feedItems.filter((item) => {
    const typeMatch =
      activeFilter === "Todos" || item.type === TYPE_MAP[activeFilter];
    const text = searchText.toLowerCase();
    const textMatch =
      !text ||
      item.title?.toLowerCase().includes(text) ||
      item.company?.toLowerCase().includes(text) ||
      item.author?.toLowerCase().includes(text) ||
      item.content?.toLowerCase().includes(text);
    return typeMatch && textMatch;
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <ScreenFixedHeader insets={insets} paddingBottom={0}>
        <HomeTopBar
          isLoggedIn={!!user}
          userName={user?.name}
          userAvatar={user?.avatar_url}
          onAvatarPress={() => router.push("/(tabs)/perfil")}
        />
      </ScreenFixedHeader>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        <HomeSearchBar searchText={searchText} onSearchChange={setSearchText} />

        <FilterChips
          options={feedTypes}
          selected={activeFilter}
          onSelect={setActiveFilter}
          style={{ marginTop: 8 }}
        />

        <FeedPromoBanner onPress={() => setActiveFilter("Vagas")} />

        <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: TEXT_MAIN }}>Para si</Text>
          <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 4 }}>
            {loading ? "A carregar..." : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
          </Text>
        </View>

        <View style={{ width: "100%" }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.map((item) => <FeedCard key={item.id} item={item} />)}

          {!loading && error && (
            <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 20, gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: TEXT_SUB }}>
                Não foi possível carregar o feed
              </Text>
              <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
                Verifique a ligação e tente novamente.
              </Text>
            </View>
          )}

          {!loading && !error && filtered.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 20, gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: TEXT_SUB }}>
                Nenhum resultado
              </Text>
              <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
                Experimente outro filtro ou pesquisa
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
