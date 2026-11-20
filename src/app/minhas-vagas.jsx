import React, { useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Briefcase, ChevronRight, Clock, CheckCircle2, FileText, XCircle } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { armutraApi, mediaUrl } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import { ACCENT, ACCENT_DARK, BG_SOFT, BORDER, CARD, TEXT_MAIN, TEXT_MUTED, TEXT_SUB } from "@/theme";

const STATUS = {
  pendente: { label: "Em análise", color: "#D97706", Icon: Clock },
  aceite: { label: "Aceite", color: "#16A34A", Icon: CheckCircle2 },
  recusada: { label: "Recusada", color: "#DC2626", Icon: XCircle },
};

function Badge({ estado }) {
  const item = STATUS[estado] || STATUS.pendente;
  const Icon = item.Icon;
  return (
    <View
      style={{
        backgroundColor: item.color + "18",
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Icon size={11} color={item.color} />
      <Text style={{ color: item.color, fontSize: 11, fontWeight: "800" }}>{item.label}</Text>
    </View>
  );
}

function SmallButton({ label, onPress, tone = "dark" }) {
  const filled = tone === "accent";
  const danger = tone === "danger";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        minHeight: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: filled ? ACCENT : danger ? "#DC262618" : CARD,
        borderWidth: 1,
        borderColor: filled ? ACCENT : danger ? "#DC2626" : BORDER,
      }}
    >
      <Text style={{ color: filled ? "#fff" : danger ? "#DC2626" : TEXT_MAIN, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Empty({ text, action, onPress }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
      <Text style={{ color: TEXT_SUB, textAlign: "center" }}>{text}</Text>
      {!!action && (
        <TouchableOpacity
          onPress={onPress}
          style={{ backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────
   Empresa: lista as vagas publicadas + candidatos recebidos
───────────────────────────────────────────── */
function EmpresaView({ token, userId, router }) {
  const queryClient = useQueryClient();
  const [openJobId, setOpenJobId] = useState(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["jobs"] });

  const jobs = useQuery({
    queryKey: ["jobs", "mine", token, userId],
    enabled: !!token,
    queryFn: () => armutraApi.getMyJobs(token, userId),
  });

  const applications = useQuery({
    queryKey: ["jobs", "applications", openJobId],
    enabled: !!openJobId,
    queryFn: () => armutraApi.getJobApplications(openJobId, token),
  });

  const received = useQuery({
    queryKey: ["jobs", "received-applications", token, userId],
    enabled: !!token,
    queryFn: async () => {
      const ownJobs = await armutraApi.getMyJobs(token, userId);
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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
      {/* Candidaturas recebidas (resumo) */}
      {(received.data || []).length > 0 && (
        <>
          <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_SUB, marginBottom: 4 }}>
            Candidaturas recebidas
          </Text>
          {received.isLoading ? (
            <ActivityIndicator color={ACCENT} />
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
                {!!item.cv_url && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(item.cv_url)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}
                  >
                    <FileText size={14} color={ACCENT} />
                    <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700" }}>Ver CV / Documento</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <SmallButton
                    label="Aceitar"
                    tone={item.estado === "aceite" ? "accent" : "default"}
                    onPress={() =>
                      setStatus.mutate({ jobId: item.job_id, applicationId: item.id, estado: "aceite" })
                    }
                  />
                  <SmallButton
                    label="Recusar"
                    tone={item.estado === "recusada" ? "danger" : "default"}
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
        </>
      )}

      {/* Vagas da empresa */}
      <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_SUB, marginTop: 8, marginBottom: 4 }}>
        As suas vagas
      </Text>
      {jobs.isLoading ? (
        <ActivityIndicator color={ACCENT} />
      ) : (jobs.data || []).length === 0 ? (
        <Empty
          text="Ainda não publicou vagas."
          action="Criar vaga"
          onPress={() => router.push("/create-job")}
        />
      ) : (
        jobs.data.map((job) => {
          const open = openJobId === job.id;
          const closed = job.estado === "fechada";
          return (
            <View key={job.id} style={cardStyle}>
              <TouchableOpacity
                onPress={() => setOpenJobId(open ? null : job.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: TEXT_MAIN, fontSize: 16 }}>{job.titulo}</Text>
                  <Text style={{ color: TEXT_SUB, marginTop: 3, fontSize: 13 }}>
                    {job.candidaturas || 0} candidatura{(job.candidaturas || 0) === 1 ? "" : "s"} · {job.salario}
                  </Text>
                  <Text
                    style={{
                      color: closed ? "#DC2626" : "#16A34A",
                      marginTop: 3,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {closed ? "Fechada" : "Aberta"} · {job.localizacao}
                  </Text>
                </View>

                {/* Imagem da vaga na direita */}
                {job.image || job.logo ? (
                  <Image
                    source={{ uri: job.image || job.logo }}
                    style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: BORDER }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: ACCENT + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    <Briefcase size={22} color={ACCENT} />
                  </View>
                )}

                <ChevronRight size={18} color={TEXT_MUTED} />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <SmallButton
                  label={closed ? "Reabrir" : "Fechar"}
                  onPress={() =>
                    setJobState.mutate({ jobId: job.id, estado: closed ? "aberta" : "fechada" })
                  }
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
                      <View
                        key={item.id}
                        style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER, gap: 8 }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            router.push({
                              pathname: "/public-profile",
                              params: { kind: "user", id: item.candidato_user_id },
                            })
                          }
                          style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
                        >
                          <ArmutraAvatar
                            uri={mediaUrl(item.candidato_foto)}
                            name={item.candidato_nome}
                            size={40}
                          />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Text style={{ fontWeight: "700", color: TEXT_MAIN, flex: 1 }}>
                                {item.candidato_nome || "Candidato"}
                              </Text>
                              <Badge estado={item.estado} />
                            </View>
                            <Text style={{ color: TEXT_SUB, marginTop: 2 }} numberOfLines={3}>
                              {item.mensagem || "Sem mensagem"}
                            </Text>
                            {!!item.cv_url && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(item.cv_url)}
                                style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}
                              >
                                <FileText size={13} color={ACCENT} />
                                <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700" }}>Ver CV</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          <SmallButton
                            label="Aceitar"
                            tone={item.estado === "aceite" ? "accent" : "default"}
                            onPress={() =>
                              setStatus.mutate({ jobId: job.id, applicationId: item.id, estado: "aceite" })
                            }
                          />
                          <SmallButton
                            label="Recusar"
                            tone={item.estado === "recusada" ? "danger" : "default"}
                            onPress={() =>
                              setStatus.mutate({ jobId: job.id, applicationId: item.id, estado: "recusada" })
                            }
                          />
                          <SmallButton
                            label="Mensagem"
                            onPress={() =>
                              router.push({
                                pathname: "/messages",
                                params: {
                                  userId: item.candidato_user_id,
                                  nome: item.candidato_nome || "",
                                },
                              })
                            }
                          />
                          <SmallButton
                            label="Ver perfil"
                            onPress={() =>
                              router.push({
                                pathname: "/public-profile",
                                params: { kind: "user", id: item.candidato_user_id },
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
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────
   Candidato: lista as candidaturas que enviou
───────────────────────────────────────────── */
function CandidatoView({ token, userId, router }) {
  const myApplications = useQuery({
    queryKey: ["jobs", "my-applications", token, userId],
    enabled: !!token,
    queryFn: () => armutraApi.getMyApplications(token, userId),
  });

  const list = myApplications.data || [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_SUB, marginBottom: 4 }}>
        As minhas candidaturas
      </Text>

      {myApplications.isLoading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
      ) : list.length === 0 ? (
        <Empty
          text={"Ainda não te candidataste a nenhuma vaga.\nExplora as vagas disponíveis!"}
          action="Ver vagas"
          onPress={() => router.push("/(tabs)/vagas")}
        />
      ) : (
        list.map((item) => {
          // Normalizar campos — a API pode retornar variantes diferentes
          const jobTitle =
            item.vaga_titulo || item.job_title || item.titulo || "Vaga";
          const companyName =
            item.empresa_nome || item.company_name || item.empresa || null;
          const estado = item.estado || "pendente";

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => {
                if (item.job_id || item.vaga_id) {
                  router.push({
                    pathname: "/content-detail",
                    params: { type: "vaga", id: item.job_id || item.vaga_id },
                  });
                }
              }}
              style={cardStyle}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Badge estado={estado} />
                  </View>
                  <Text style={{ fontWeight: "800", color: TEXT_MAIN, fontSize: 16 }} numberOfLines={2}>
                    {jobTitle}
                  </Text>
                  {!!companyName && (
                    <Text style={{ color: TEXT_SUB, fontSize: 13, marginTop: 3 }} numberOfLines={1}>
                      {companyName}
                    </Text>
                  )}
                </View>

                {/* Imagem da vaga na direita */}
                {item.job_image || item.empresa_foto ? (
                  <Image
                    source={{ uri: item.job_image || item.empresa_foto }}
                    style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: BORDER }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: ACCENT + "15",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    <Briefcase size={22} color={ACCENT} />
                  </View>
                )}
              </View>

              {!!item.mensagem && (
                <Text style={{ color: TEXT_SUB, fontSize: 13, marginTop: 10, lineHeight: 19 }} numberOfLines={3}>
                  {item.mensagem}
                </Text>
              )}

              {!!item.cv_url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(item.cv_url)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}
                >
                  <FileText size={14} color={ACCENT} />
                  <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700" }}>Ver CV enviado</Text>
                </TouchableOpacity>
              )}

              {!!item.criado_em && (
                <Text style={{ color: TEXT_MUTED, fontSize: 11, marginTop: 8 }}>
                  Enviada em{" "}
                  {new Date(item.criado_em).toLocaleDateString("pt-MZ", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────
   Ecrã principal — decide a view pelo tipo de conta
───────────────────────────────────────────── */
export default function MinhasVagasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const isCompany =
    auth?.user?.tipo === "empresa" || auth?.user?.user_type === "empresa";

  const title = isCompany ? "Gestão de Vagas" : "Minhas Candidaturas";

  return (
    <View style={{ flex: 1, backgroundColor: BG_SOFT, paddingTop: insets.top }}>
      {/* Cabeçalho */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
          backgroundColor: CARD,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={22} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: TEXT_MAIN }}>
          {title}
        </Text>
        {isCompany && (
          <TouchableOpacity
            onPress={() => router.push("/create-job")}
            style={{
              backgroundColor: ACCENT,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>+ Nova vaga</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo por tipo de perfil */}
      {!token ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: TEXT_SUB, textAlign: "center", lineHeight: 22 }}>
            Entre na sua conta para continuar.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/perfil")}
            style={{ marginTop: 16, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Entrar</Text>
          </TouchableOpacity>
        </View>
      ) : isCompany ? (
        <EmpresaView token={token} userId={auth?.user?.id} router={router} />
      ) : (
        <CandidatoView token={token} userId={auth?.user?.id} router={router} />
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
