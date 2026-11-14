import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Briefcase, ChevronRight } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { armutraApi, mediaUrl } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import { ACCENT, ACCENT_DARK, BG_SOFT, BORDER, CARD, TEXT_MAIN, TEXT_MUTED, TEXT_SUB } from "@/theme";

const STATUS = {
  pendente: { label: "Em análise", color: "#D97706" },
  aceite: { label: "Aceite", color: "#16A34A" },
  recusada: { label: "Recusada", color: "#DC2626" },
};

function Badge({ estado }) {
  const item = STATUS[estado] || STATUS.pendente;
  return (
    <View style={{ backgroundColor: item.color + "18", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: item.color, fontSize: 11, fontWeight: "800" }}>{item.label}</Text>
    </View>
  );
}

function SmallButton({ label, onPress, tone = "dark" }) {
  const filled = tone === "accent";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        minHeight: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? ACCENT : CARD,
        borderWidth: 1,
        borderColor: filled ? ACCENT : BORDER,
      }}
    >
      <Text style={{ color: filled ? "#fff" : TEXT_MAIN, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function MinhasVagasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const isCompany = auth?.user?.tipo === "empresa" || auth?.user?.user_type === "empresa";
  const [openJobId, setOpenJobId] = useState(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const jobs = useQuery({
    queryKey: ["jobs", "mine", token],
    enabled: !!token && isCompany,
    queryFn: () => armutraApi.getMyJobs(token),
  });

  const applications = useQuery({
    queryKey: ["jobs", "applications", openJobId],
    enabled: !!token && !!openJobId,
    queryFn: () => armutraApi.getJobApplications(openJobId, token),
  });

  const received = useQuery({
    queryKey: ["jobs", "received-applications", token],
    enabled: !!token && isCompany,
    queryFn: async () => {
      const ownJobs = await armutraApi.getMyJobs(token);
      const groups = await Promise.all(
        ownJobs.map(async (job) => {
          const rows = await armutraApi.getJobApplications(job.id, token);
          return rows.map((row) => ({ ...row, vaga_titulo: row.vaga_titulo || job.titulo }));
        })
      );
      return groups.flat();
    },
  });

  const setStatus = useMutation({
    mutationFn: ({ jobId, applicationId, estado }) =>
      armutraApi.updateApplication(jobId, applicationId, estado, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs", "applications", openJobId] });
      queryClient.invalidateQueries({ queryKey: ["jobs", "received-applications"] });
      refresh();
    },
    onError: (error) => {
      logError("application-status", error);
      Alert.alert("Candidatura", error.message);
    },
  });

  const setJobState = useMutation({
    mutationFn: ({ jobId, estado }) => armutraApi.updateJob(jobId, { estado }, token),
    onSuccess: refresh,
    onError: (error) => Alert.alert("Vaga", error.message),
  });

  const removeJob = useMutation({
    mutationFn: (jobId) => armutraApi.deleteJob(jobId, token),
    onSuccess: () => {
      setOpenJobId(null);
      refresh();
    },
    onError: (error) => Alert.alert("Vaga", error.message),
  });

  const confirmDelete = (job) => {
    Alert.alert("Apagar vaga", `Apagar "${job.titulo}" e as candidaturas?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Apagar", style: "destructive", onPress: () => removeJob.mutate(job.id) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: TEXT_MAIN }}>Candidaturas</Text>
        {isCompany && (
          <TouchableOpacity onPress={() => router.push("/create-job")}>
            <Text style={{ color: ACCENT_DARK, fontWeight: "800" }}>Nova</Text>
          </TouchableOpacity>
        )}
      </View>

      {!token ? (
        <Text style={{ padding: 20, color: TEXT_SUB }}>Entre na sua conta para continuar.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
          {isCompany ? (
            <>
            <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_SUB }}>
              Recebidas nas suas vagas
            </Text>
            {received.isLoading ? (
              <ActivityIndicator color={ACCENT} />
            ) : (received.data || []).length === 0 ? (
              <Text style={{ color: TEXT_SUB }}>Ainda não há candidaturas.</Text>
            ) : (
              received.data.map((item) => (
                <View key={item.id} style={cardStyle}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ArmutraAvatar uri={mediaUrl(item.candidato_foto)} name={item.candidato_nome} size={40} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ flex: 1, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={1}>
                          {item.candidato_nome || "Candidato"}
                        </Text>
                        <Badge estado={item.estado} />
                      </View>
                      <Text style={{ color: TEXT_SUB, marginTop: 2 }} numberOfLines={1}>
                        {item.vaga_titulo || "Vaga"}
                      </Text>
                    </View>
                  </View>
                  {!!item.mensagem && (
                    <Text style={{ color: TEXT_MAIN, marginTop: 8 }} numberOfLines={3}>
                      {item.mensagem}
                    </Text>
                  )}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <SmallButton
                      label="Aceitar"
                      tone="accent"
                      onPress={() =>
                        setStatus.mutate({ jobId: item.job_id, applicationId: item.id, estado: "aceite" })
                      }
                    />
                    <SmallButton
                      label="Recusar"
                      onPress={() =>
                        setStatus.mutate({ jobId: item.job_id, applicationId: item.id, estado: "recusada" })
                      }
                    />
                    <SmallButton
                      label="Mensagem"
                      onPress={() =>
                        router.push({
                          pathname: "/messages",
                          params: { userId: item.candidato_user_id, nome: item.candidato_nome || "" },
                        })
                      }
                    />
                  </View>
                </View>
              ))
            )}
            {jobs.isLoading ? (
              <ActivityIndicator color={ACCENT} />
            ) : (jobs.data || []).length === 0 ? (
              <Empty text="Ainda não publicou vagas." action="Criar vaga" onPress={() => router.push("/create-job")} />
            ) : (
              jobs.data.map((job) => {
                const open = openJobId === job.id;
                const closed = job.estado === "fechada";
                return (
                  <View key={job.id} style={cardStyle}>
                    <TouchableOpacity
                      onPress={() => setOpenJobId(open ? null : job.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                    >
                      <Briefcase size={18} color={ACCENT} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800", color: TEXT_MAIN }}>{job.titulo}</Text>
                        <Text style={{ color: TEXT_SUB, marginTop: 2 }}>
                          {job.candidaturas || 0} candidatura{(job.candidaturas || 0) === 1 ? "" : "s"} · {job.salario}
                        </Text>
                        <Text style={{ color: closed ? "#DC2626" : "#16A34A", marginTop: 2, fontWeight: "700", fontSize: 12 }}>
                          {closed ? "Fechada" : "Aberta"} · {job.localizacao}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={TEXT_MUTED} />
                    </TouchableOpacity>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                      <SmallButton
                        label={closed ? "Reabrir" : "Fechar"}
                        onPress={() => setJobState.mutate({ jobId: job.id, estado: closed ? "aberta" : "fechada" })}
                      />
                      <SmallButton label="Apagar" onPress={() => confirmDelete(job)} />
                    </View>
                    {open && (
                      <View style={{ marginTop: 12, gap: 10 }}>
                        {applications.isLoading ? (
                          <ActivityIndicator color={ACCENT} />
                        ) : (applications.data || []).length === 0 ? (
                          <Text style={{ color: TEXT_SUB }}>Sem candidaturas nesta vaga.</Text>
                        ) : (
                          applications.data.map((item) => (
                            <View key={item.id} style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER, gap: 8 }}>
                              <TouchableOpacity
                                onPress={() =>
                                  router.push({
                                    pathname: "/public-profile",
                                    params: { kind: "user", id: item.candidato_user_id },
                                  })
                                }
                                style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
                              >
                                <ArmutraAvatar uri={mediaUrl(item.candidato_foto)} name={item.candidato_nome} size={40} />
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Text style={{ fontWeight: "700", color: TEXT_MAIN, flex: 1 }}>
                                      {item.candidato_nome || "Candidato"}
                                    </Text>
                                    <Badge estado={item.estado} />
                                  </View>
                                  <Text style={{ color: TEXT_SUB, marginTop: 2 }} numberOfLines={3}>
                                    {item.mensagem || "Sem mensagem"}
                                    {item.cv_url ? " · CV anexado" : ""}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                                <SmallButton
                                  label="Aceitar"
                                  tone="accent"
                                  onPress={() =>
                                    setStatus.mutate({ jobId: job.id, applicationId: item.id, estado: "aceite" })
                                  }
                                />
                                <SmallButton
                                  label="Recusar"
                                  onPress={() =>
                                    setStatus.mutate({ jobId: job.id, applicationId: item.id, estado: "recusada" })
                                  }
                                />
                                <SmallButton
                                  label="Mensagem"
                                  onPress={() =>
                                    router.push({
                                      pathname: "/messages",
                                      params: { userId: item.candidato_user_id, nome: item.candidato_nome || "" },
                                    })
                                  }
                                />
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
            </>
          ) : (
            <Text style={{ color: TEXT_SUB, lineHeight: 20 }}>
              A lista de candidaturas fica disponível só para contas de empresa.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const cardStyle = {
  backgroundColor: CARD,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: BORDER,
  padding: 14,
};

function Empty({ text, action, onPress }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
      <Text style={{ color: TEXT_SUB, textAlign: "center" }}>{text}</Text>
      <TouchableOpacity onPress={onPress} style={{ backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Text style={{ color: "#fff", fontWeight: "700" }}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}
