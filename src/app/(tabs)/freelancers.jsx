import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Users, Star, ChevronRight } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
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
  BG_SOFT,
  CARD,
  BORDER,
  TEXT_MUTED,
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

function FreelancerRow({ freelancer }) {
  const router = useRouter();
  const openProfile = () => {
    router.push({ pathname: "/public-profile", params: { kind: "freelancer", id: freelancer.id } });
  };

  const hasRating = Number(freelancer.rating) > 0;
  const price = displayMoney(freelancer.price) || "A negociar";

  return (
    <TouchableOpacity
      onPress={openProfile}
      activeOpacity={0.7}
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}
    >
      <View>
        <ArmutraAvatar uri={freelancer.photo} name={freelancer.name} size={48} borderRadius={24} />
        {freelancer.available && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: ACCENT,
              borderWidth: 2,
              borderColor: CARD,
            }}
          />
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{ flex: 1, fontSize: 15, fontWeight: "600", color: TEXT_MAIN }}
            numberOfLines={1}
          >
            {freelancer.name}
          </Text>
          {hasRating && (
            <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8, gap: 3 }}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_MAIN }}>
                {Number(freelancer.rating).toFixed(1)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED }}>({freelancer.reviews})</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
          {freelancer.profession}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 }}>
          <Text
            style={{ fontSize: 13, fontWeight: "700", color: ACCENT_DARK, flexShrink: 1 }}
            numberOfLines={1}
          >
            {price}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_MUTED }}>·</Text>
          <Text style={{ fontSize: 12, color: TEXT_SUB }} numberOfLines={1}>
            {freelancer.completedJobs} trabalho{freelancer.completedJobs !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <ChevronRight size={18} color={TEXT_MUTED} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}

function SkeletonRow() {
  return (
    <View
      pointerEvents="none"
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: CARD,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}
    >
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: BORDER }} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <View style={{ width: "55%", height: 12, borderRadius: 6, backgroundColor: BORDER }} />
        <View style={{ width: "40%", height: 10, borderRadius: 5, backgroundColor: BORDER }} />
        <View style={{ width: "30%", height: 10, borderRadius: 5, backgroundColor: BORDER }} />
      </View>
    </View>
  );
}

export default function FreelancersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const { data: freelancers = [], isLoading } = useQuery({
    queryKey: ["freelancers"],
    queryFn: armutraApi.getFreelancers,
    onError: (error) => logError("freelancers-query", error),
  });

  const filtered = freelancers.filter((f) => {
    const catMatch = selectedCategory === "Todos" || f.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const searchMatch =
      !q ||
      f.name?.toLowerCase().includes(q) ||
      f.category?.toLowerCase().includes(q) ||
      f.profession?.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

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
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        <FilterChips
          options={freelancerCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          style={{ marginTop: 12 }}
        />

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT_MAIN }}>
            {filtered.length} profissional{filtered.length !== 1 ? "ais" : ""}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT }}
            />
            <Text style={{ fontSize: 12, color: TEXT_SUB }}>Disponível</Text>
          </View>
        </View>

        <View style={{ width: "100%", borderTopWidth: 1, borderTopColor: BORDER }}>
          {isLoading ? (
            Array.from({ length: 7 }).map((_, index) => <SkeletonRow key={index} />)
          ) : filtered.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 40,
                gap: 10,
                backgroundColor: CARD,
              }}
            >
              <Users size={40} color="#CBD5E1" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT_SUB }}>
                Nenhum freelancer encontrado
              </Text>
              <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
                Tente selecionar outra categoria
              </Text>
            </View>
          ) : (
            filtered.map((f) => <FreelancerRow key={f.id} freelancer={f} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
