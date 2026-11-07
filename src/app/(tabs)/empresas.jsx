import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Building2,
  MapPin,
  Users,
  Briefcase,
  ChevronRight,
} from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import ListScreenHeader from "@/components/ListScreenHeader";
import FilterChips from "@/components/FilterChips";
import { armutraApi } from "@/utils/api";
import { logError } from "@/utils/logger";
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
  tagStyle,
} from "@/theme";
const categorias = [
  "Todos",
  "Tecnologia",
  "Construcao",
  "Saude",
  "Educacao",
  "Logistica",
  "Agricultura",
  "Geral",
];

function EmpresaCard({ empresa }) {
  const router = useRouter();
  const tag = tagStyle();
  const openProfile = () => {
    router.push({ pathname: "/public-profile", params: { kind: "empresa", id: empresa.id } });
  };

  return (
    <TouchableOpacity
      onPress={openProfile}
      activeOpacity={0.92}
      style={{
        ...cardStyle,
        padding: 24,
        ...shadow.card,
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <ArmutraAvatar
          uri={empresa.logo}
          name={empresa.name}
          size={56}
          borderRadius={28}
        />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: TEXT_MAIN }}>
            {empresa.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginTop: 4,
            }}
          >
            <View
              style={{
                backgroundColor: tag.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: tag.text }}>
                {empresa.area}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text
        style={{
          fontSize: 14,
          color: TEXT_SUB,
          lineHeight: 20,
          marginBottom: 20,
        }}
        numberOfLines={2}
      >
        {empresa.description}
      </Text>

      <View style={{ flexDirection: "row", gap: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MapPin size={14} color={TEXT_SUB} />
          <Text style={{ fontSize: 13, color: TEXT_SUB }}>
            {empresa.location}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Users size={14} color={TEXT_SUB} />
          <Text style={{ fontSize: 13, color: TEXT_SUB }}>
            {empresa.employees} colaboradores
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Briefcase size={16} color={ACCENT} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: ACCENT_DARK }}>
            {empresa.openJobs} vagas abertas
          </Text>
        </View>
        <TouchableOpacity
          onPress={openProfile}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: ACCENT,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 24,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            Ver perfil
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function EmpresasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: armutraApi.getCompanies,
    onError: (error) => logError("companies-query", error),
  });

  const filtered = empresas.filter((e) => {
    const catMatch = selectedCategory === "Todos" || e.area === selectedCategory;
    const q = search.trim().toLowerCase();
    const searchMatch =
      !q ||
      e.name?.toLowerCase().includes(q) ||
      e.area?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q);
    return catMatch && searchMatch;
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <ListScreenHeader
        insets={insets}
        title="Empresas"
        onBack={() => router.push("/(tabs)/feed")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar empresas..."
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 88,
        }}
        showsVerticalScrollIndicator={false}
      >
        <FilterChips
          options={categorias}
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
          {filtered.length} empresa{filtered.length !== 1 ? "s" : ""} encontrada
          {filtered.length !== 1 ? "s" : ""}
        </Text>

        <View style={{ paddingHorizontal: 20 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <View
              key={index}
              pointerEvents="none"
              style={{
                height: 150,
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                marginBottom: 14,
              }}
            />
          ))
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
            <Building2 size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#94A3B8" }}>
              Nenhuma empresa encontrada
            </Text>
            <Text
              style={{ fontSize: 13, color: "#CBD5E1", textAlign: "center" }}
            >
              Tente selecionar outra categoria
            </Text>
          </View>
        ) : (
          filtered.map((empresa) => (
            <EmpresaCard key={empresa.id} empresa={empresa} />
          ))
        )}
        </View>
      </ScrollView>
    </View>
  );
}
