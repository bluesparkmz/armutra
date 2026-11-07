import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Building2, MapPin, Users, Briefcase, ChevronRight } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import ListScreenHeader from "@/components/ListScreenHeader";
import FilterChips from "@/components/FilterChips";
import LocationFilter from "@/components/LocationFilter";
import { armutraApi } from "@/utils/api";
import { logError } from "@/utils/logger";
import {
  ACCENT,
  ACCENT_DARK,
  ACCENT_LIGHT,
  TEXT_MAIN,
  TEXT_SUB,
  BG_SOFT,
  CARD,
  BORDER,
  TEXT_MUTED,
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

/** Comparação sem acentos nem maiúsculas */
function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function EmpresaRow({ empresa }) {
  const router = useRouter();
  const openProfile = () => {
    router.push({ pathname: "/public-profile", params: { kind: "empresa", id: empresa.id } });
  };

  const hasJobs = Number(empresa.openJobs) > 0;
  const showEmployees = empresa.employees && empresa.employees !== "Nao informado";

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
      <ArmutraAvatar uri={empresa.logo} name={empresa.name} size={48} borderRadius={10} />

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{ flex: 1, fontSize: 15, fontWeight: "600", color: TEXT_MAIN }}
            numberOfLines={1}
          >
            {empresa.name}
          </Text>
          {hasJobs && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: ACCENT_LIGHT,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
                marginLeft: 8,
              }}
            >
              <Briefcase size={11} color={ACCENT_DARK} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: ACCENT_DARK }}>
                {empresa.openJobs} vaga{empresa.openJobs !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 13, color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
          {empresa.area}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5, gap: 12 }}>
          {!!empresa.location && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1 }}>
              <MapPin size={12} color={TEXT_MUTED} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED, flexShrink: 1 }} numberOfLines={1}>
                {empresa.location}
              </Text>
            </View>
          )}
          {showEmployees && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Users size={12} color={TEXT_MUTED} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }} numberOfLines={1}>
                {empresa.employees}
              </Text>
            </View>
          )}
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
      <View style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: BORDER }} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <View style={{ width: "55%", height: 12, borderRadius: 6, backgroundColor: BORDER }} />
        <View style={{ width: "35%", height: 10, borderRadius: 5, backgroundColor: BORDER }} />
        <View style={{ width: "45%", height: 10, borderRadius: 5, backgroundColor: BORDER }} />
      </View>
    </View>
  );
}

export default function EmpresasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: armutraApi.getCompanies,
    onError: (error) => logError("companies-query", error),
  });

  const filtered = empresas.filter((e) => {
    const catMatch = selectedCategory === "Todos" || e.area === selectedCategory;
    const provinceMatch = !province || sameText(e.raw?.province, province);
    const cityMatch = !city || sameText(e.raw?.city, city);
    if (!provinceMatch || !cityMatch) return false;
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
        showsVerticalScrollIndicator={false}
      >
        <FilterChips
          options={categorias}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          style={{ marginTop: 12 }}
        />

        <LocationFilter
          province={province}
          city={city}
          onChange={(nextProvince, nextCity) => {
            setProvince(nextProvince);
            setCity(nextCity);
          }}
          style={{ marginTop: 8 }}
        />

        <Text
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: TEXT_MAIN,
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 8,
          }}
        >
          {filtered.length} empresa{filtered.length !== 1 ? "s" : ""}
        </Text>

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
              <Building2 size={40} color="#CBD5E1" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT_SUB }}>
                Nenhuma empresa encontrada
              </Text>
              <Text style={{ fontSize: 13, color: TEXT_MUTED, textAlign: "center" }}>
                Tente selecionar outra categoria
              </Text>
            </View>
          ) : (
            filtered.map((empresa) => <EmpresaRow key={empresa.id} empresa={empresa} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
