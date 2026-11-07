import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Users, CheckCircle } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import StarRating from "@/components/StarRating";
import ListScreenHeader from "@/components/ListScreenHeader";
import FilterChips from "@/components/FilterChips";
import { armutraApi } from "@/utils/api";
import { logError } from "@/utils/logger";
import { displayMoney } from "@/utils/formatMoney";
import {
  ACCENT,
  ACCENT_DARK,
  TEXT_MAIN,
  TEXT_SUB,
  BG,
  BG_SOFT,
  CARD,
  BORDER,
  TEXT_MUTED,
  cardStyle,
  shadow,
} from "@/theme";
const freelancerCategories = [
  "Todos",
  "Design",
  "Tecnologia",
  "Educacao",
  "Construcao",
  "Fotografia",
  "Financas",
  "Geral",
];

function FreelancerCard({ freelancer, cardWidth }) {
  const router = useRouter();
  const openProfile = () => {
    router.push({ pathname: "/public-profile", params: { kind: "freelancer", id: freelancer.id } });
  };

  return (
    <TouchableOpacity
      onPress={openProfile}
      activeOpacity={0.92}
      style={{
        ...cardStyle,
        padding: 16,
        width: cardWidth,
        marginBottom: 0,
        ...shadow.card,
      }}
    >
      {/* Avatar + Status */}
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <View style={{ position: "relative" }}>
          <ArmutraAvatar
            uri={freelancer.photo}
            name={freelancer.name}
            size={64}
            borderRadius={32}
          />
          {freelancer.available && (
            <View
              style={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: ACCENT,
                borderWidth: 2,
                borderColor: "#fff",
              }}
            />
          )}
        </View>

        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: TEXT_MAIN,
            marginTop: 12,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {freelancer.name}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: TEXT_SUB,
            marginTop: 4,
            textAlign: "center",
          }}
          numberOfLines={1}
        >
          {freelancer.profession}
        </Text>
      </View>

      {/* Stats */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <StarRating
          rating={freelancer.rating}
          reviews={freelancer.reviews}
          size={14}
        />
      </View>

      {/* Jobs count */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          marginBottom: 16,
        }}
      >
        <CheckCircle size={14} color={ACCENT} />
        <Text style={{ fontSize: 13, color: TEXT_SUB }}>
          {freelancer.completedJobs} trabalhos
        </Text>
      </View>

      {/* Price */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: ACCENT_DARK,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        {displayMoney(freelancer.price) || "A negociar"}
      </Text>

      {/* Hire button */}
      <TouchableOpacity
        onPress={openProfile}
        style={{
          backgroundColor: freelancer.available ? ACCENT : "#E2E8F0",
          paddingVertical: 12,
          borderRadius: 24,
          alignItems: "center",
        }}
        activeOpacity={0.8}
        disabled={!freelancer.available}
      >
        <Text
          style={{
            color: freelancer.available ? "#fff" : "#94A3B8",
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          {freelancer.available ? "Contratar" : "Indisponível"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function FreelancersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const { data: freelancers = [], isLoading } = useQuery({
    queryKey: ["freelancers"],
    queryFn: armutraApi.getFreelancers,
    onError: (error) => logError("freelancers-query", error),
  });

  const PADDING = 16;
  const GAP = 12;
  const cardWidth = (width - PADDING * 2 - GAP) / 2;

  const filtered = freelancers.filter((f) => {
    const catMatch = selectedCategory === "Todos" || f.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const searchMatch =
      !q ||
      f.name?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q) ||
      f.title?.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  const leftCol = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 !== 0);

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <ListScreenHeader
        insets={insets}
        title="Talentos"
        onBack={() => router.push("/(tabs)/feed")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar talentos..."
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
        }}
      >
        <FilterChips
          options={freelancerCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          style={{ marginTop: 12 }}
        />

        <Text
          style={{
            fontSize: 13,
            color: TEXT_MUTED,
            fontWeight: "600",
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 10,
          }}
        >
          {filtered.length} profissional{filtered.length !== 1 ? "ais" : ""}{" "}
          disponív{filtered.length !== 1 ? "eis" : "el"}
        </Text>

        <View style={{ paddingHorizontal: 16 }}>
        {isLoading ? (
          <View
            style={{ flexDirection: "row", gap: GAP, alignItems: "flex-start" }}
          >
            {[0, 1].map((col) => (
              <View key={col} style={{ flex: 1, gap: GAP }}>
                {[0, 1, 2].map((item) => (
                  <View
                    key={item}
                    pointerEvents="none"
                    style={{
                      height: 210,
                      width: cardWidth,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 18,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            <Users size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#94A3B8" }}>
              Nenhum freelancer encontrado
            </Text>
            <Text
              style={{ fontSize: 13, color: "#CBD5E1", textAlign: "center" }}
            >
              Tente selecionar outra categoria
            </Text>
          </View>
        ) : (
          <View
            style={{ flexDirection: "row", gap: GAP, alignItems: "flex-start" }}
          >
            {/* Left column */}
            <View style={{ flex: 1, gap: GAP }}>
              {leftCol.map((f) => (
                <FreelancerCard
                  key={f.id}
                  freelancer={f}
                  cardWidth={cardWidth}
                />
              ))}
            </View>
            {/* Right column */}
            <View style={{ flex: 1, gap: GAP }}>
              {rightCol.map((f) => (
                <FreelancerCard
                  key={f.id}
                  freelancer={f}
                  cardWidth={cardWidth}
                />
              ))}
            </View>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}
