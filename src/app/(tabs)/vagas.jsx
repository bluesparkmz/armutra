import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Briefcase } from "lucide-react-native";
import JobListItem from "@/components/JobListItem";
import ListScreenHeader from "@/components/ListScreenHeader";
import FilterChips from "@/components/FilterChips";
import { armutraApi } from "@/utils/api";
import { logError } from "@/utils/logger";
import { TEXT_MAIN, TEXT_SUB, BG_SOFT, BORDER, CARD } from "@/theme";

const jobCategories = [
  "Todos",
  "Tecnologia",
  "Construcao",
  "Saude",
  "Educacao",
  "Logistica",
  "Design",
  "Geral",
];
const jobTypes = ["Todos", "Full-time", "Part-time", "Freelancer", "Contrato"];

function VagaRow({ vaga }) {
  const router = useRouter();

  const openDetail = () => {
    router.push({
      pathname: "/content-detail",
      params: { type: "vaga", id: vaga.id, item: JSON.stringify(vaga.raw || vaga) },
    });
  };

  const openCompany = () => {
    const id = vaga.companyProfileId || vaga.companyUserId;
    if (!id) return;
    router.push({
      pathname: "/public-profile",
      params: { kind: vaga.companyProfileId ? "empresa" : "user", id },
    });
  };

  return (
    <JobListItem
      title={vaga.title}
      company={vaga.company}
      logo={vaga.logo}
      location={vaga.location}
      jobType={vaga.type}
      salary={vaga.salary}
      postedAt={vaga.postedAt}
      onPress={openDetail}
      onPressCompany={openCompany}
    />
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
      <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: BORDER }} />
      <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
        <View style={{ width: "65%", height: 12, borderRadius: 6, backgroundColor: BORDER }} />
        <View style={{ width: "45%", height: 10, borderRadius: 5, backgroundColor: BORDER }} />
        <View style={{ width: "30%", height: 10, borderRadius: 5, backgroundColor: BORDER }} />
      </View>
    </View>
  );
}

export default function VagasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedType, setSelectedType] = useState("Todos");
  const [search, setSearch] = useState("");
  const { data: vagas = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: armutraApi.getJobs,
    onError: (error) => logError("jobs-query", error),
  });

  const filtered = vagas.filter((v) => {
    const catMatch = selectedCategory === "Todos" || v.category === selectedCategory;
    const typeMatch = selectedType === "Todos" || v.type === selectedType;
    const searchMatch =
      !search ||
      v.title?.toLowerCase().includes(search.toLowerCase()) ||
      v.company?.toLowerCase().includes(search.toLowerCase());
    return catMatch && typeMatch && searchMatch;
  });

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT }}>
      <ListScreenHeader
        insets={insets}
        title="Vagas"
        onBack={() => router.push("/(tabs)/feed")}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Pesquisar vagas..."
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
        showsVerticalScrollIndicator={false}
      >
        <FilterChips
          options={jobCategories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          style={{ marginTop: 12 }}
        />
        <FilterChips
          options={jobTypes}
          selected={selectedType}
          onSelect={setSelectedType}
          showFilterIcon={false}
          style={{ marginTop: 6 }}
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
            {filtered.length} vaga{filtered.length !== 1 ? "s" : ""}
          </Text>
          <Text style={{ fontSize: 12, color: TEXT_SUB }}>Recentes</Text>
        </View>

        <View style={{ width: "100%", borderTopWidth: 1, borderTopColor: BORDER }}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />)
          ) : filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 12, backgroundColor: CARD }}>
              <Briefcase size={40} color="#CBD5E1" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: TEXT_SUB }}>
                Nenhuma vaga encontrada
              </Text>
            </View>
          ) : (
            filtered.map((vaga) => <VagaRow key={vaga.id} vaga={vaga} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
