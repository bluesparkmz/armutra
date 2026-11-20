import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MessageSquare,
  MessageSquarePlus,
  Search,
  Send,
  UserCheck,
  X,
} from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { armutraApi, mediaUrl } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import {
  ACCENT,
  ACCENT_DARK,
  ACCENT_LIGHT,
  BG,
  BG_SOFT,
  BORDER,
  CARD,
  PLACEHOLDER,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_SUB,
  radius,
} from "@/theme";

const first = (value) => (Array.isArray(value) ? value[0] : value);

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const token = auth?.accessToken;
  const myId = auth?.user?.id;

  const presetUserId = first(params.userId);
  const presetName = first(params.nome) || "Conversa";
  const presetConversationId = first(params.conversationId);

  const [active, setActive] = useState(
    presetUserId ? { outro_user_id: presetUserId, outro_nome: presetName, id: null } : null
  );
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState("");
  const scrollViewRef = React.useRef(null);

  // Lista de conversas
  const conversations = useQuery({
    queryKey: ["messages", "list", token, myId],
    enabled: !!token,
    queryFn: () => armutraApi.getConversations(token, myId),
  });

  const threadId = active?.id;

  // Mensagens da conversa aberta
  const thread = useQuery({
    queryKey: ["messages", "thread", threadId],
    enabled: !!token && !!threadId,
    queryFn: () => armutraApi.getMessages(threadId, token),
  });

  // Busca de usuários para novo chat
  const usersQuery = useQuery({
    queryKey: ["users", "search", userSearchText],
    enabled: !!token && newChatOpen,
    queryFn: () => armutraApi.searchUsers({ search: userSearchText.trim(), limit: 25 }),
  });

  const items = thread.data?.messages || [];

  useEffect(() => {
    if (!presetConversationId || active?.id) return;
    const found = (conversations.data || []).find((item) => item.id === presetConversationId);
    if (found) setActive(found);
  }, [presetConversationId, conversations.data, active?.id]);

  // Se veio presetUserId mas já existe conversa com ele, vincular o ID da conversa
  useEffect(() => {
    if (!presetUserId || active?.id) return;
    const existing = (conversations.data || []).find(
      (c) => String(c.outro_user_id) === String(presetUserId)
    );
    if (existing) {
      setActive(existing);
    }
  }, [presetUserId, conversations.data, active?.id]);

  const send = useMutation({
    mutationFn: () =>
      armutraApi.sendMessage(
        {
          destinatario_user_id: active?.outro_user_id,
          conversation_id: active?.id,
          conteudo: draft.trim(),
        },
        token
      ),
    onSuccess: (result) => {
      setDraft("");
      const convId = result?.conversation_id || active?.id;
      if (convId) {
        setActive((current) => ({ ...current, id: convId }));
      }
      queryClient.invalidateQueries({ queryKey: ["messages", "thread", convId] });
      queryClient.invalidateQueries({ queryKey: ["messages", "list"] });
    },
    onError: (error) => logError("send-message", error),
  });

  const list = useMemo(() => {
    const raw = conversations.data || [];
    if (!searchQuery.trim()) return raw;
    const q = searchQuery.toLowerCase();
    return raw.filter(
      (item) =>
        item.outro_nome?.toLowerCase().includes(q) ||
        item.ultima_mensagem?.toLowerCase().includes(q)
    );
  }, [conversations.data, searchQuery]);

  const startChatWith = (user) => {
    setNewChatOpen(false);
    setUserSearchText("");
    const existing = (conversations.data || []).find(
      (c) => String(c.outro_user_id) === String(user.id)
    );
    if (existing) {
      setActive(existing);
    } else {
      setActive({
        id: null,
        outro_user_id: user.id,
        outro_nome: user.name || "Conversa",
        outro_foto: user.avatar_url,
      });
    }
  };

  const headerName = active?.outro_nome || "Mensagens";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG_SOFT, paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Barra superior */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: CARD,
          borderBottomWidth: 1,
          borderBottomColor: BORDER,
        }}
      >
        <TouchableOpacity
          onPress={() => (active && !presetUserId ? setActive(null) : router.back())}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color={TEXT_MAIN} />
        </TouchableOpacity>

        {active ? (
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ArmutraAvatar uri={mediaUrl(active.outro_foto)} name={active.outro_nome} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={1}>
                {headerName}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: TEXT_MAIN }}>
              Mensagens
            </Text>
            <TouchableOpacity
              onPress={() => setNewChatOpen(true)}
              style={{
                backgroundColor: ACCENT,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <MessageSquarePlus size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Nova</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {!token ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: TEXT_SUB, textAlign: "center", lineHeight: 20 }}>
            Entre na sua conta para ver e enviar mensagens.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/perfil")}
            style={{
              marginTop: 16,
              backgroundColor: ACCENT,
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Entrar</Text>
          </TouchableOpacity>
        </View>
      ) : !active ? (
        /* Lista de conversas */
        <View style={{ flex: 1 }}>
          {/* Barra de pesquisa de conversas */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: BG,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BORDER,
                paddingHorizontal: 12,
                height: 44,
                gap: 8,
              }}
            >
              <Search size={18} color={TEXT_MUTED} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Pesquisar conversas..."
                placeholderTextColor={PLACEHOLDER}
                style={{ flex: 1, color: TEXT_MAIN, fontSize: 14 }}
              />
              {!!searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 90 }}
            showsVerticalScrollIndicator={false}
          >
            {conversations.isLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
            ) : list.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: ACCENT_LIGHT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MessageSquare size={30} color={ACCENT_DARK} />
                </View>
                <Text style={{ color: TEXT_MAIN, fontWeight: "700", fontSize: 16 }}>
                  Ainda não tem conversas
                </Text>
                <Text style={{ color: TEXT_SUB, textAlign: "center", fontSize: 13, maxWidth: 260 }}>
                  Inicie uma nova conversa para falar com empresas, freelancers ou clientes.
                </Text>
                <TouchableOpacity
                  onPress={() => setNewChatOpen(true)}
                  style={{
                    marginTop: 8,
                    backgroundColor: ACCENT,
                    borderRadius: 12,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MessageSquarePlus size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Nova conversa</Text>
                </TouchableOpacity>
              </View>
            ) : (
              list.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setActive(item)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "center",
                    backgroundColor: CARD,
                    borderWidth: 1,
                    borderColor: BORDER,
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <ArmutraAvatar
                    uri={mediaUrl(item.outro_foto)}
                    name={item.outro_nome}
                    size={46}
                    borderRadius={23}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text
                        style={{ fontWeight: "800", color: TEXT_MAIN, fontSize: 15 }}
                        numberOfLines={1}
                      >
                        {item.outro_nome}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{ color: TEXT_SUB, marginTop: 3, fontSize: 13 }}
                    >
                      {item.ultima_mensagem || "Conversa iniciada"}
                    </Text>
                  </View>
                  {Number(item.unread_count) > 0 && (
                    <View
                      style={{
                        backgroundColor: ACCENT,
                        minWidth: 20,
                        height: 20,
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 6,
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                        {item.unread_count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* FAB - Botão Flutuante de Novo Chat */}
          <TouchableOpacity
            onPress={() => setNewChatOpen(true)}
            activeOpacity={0.85}
            style={{
              position: "absolute",
              bottom: insets.bottom + 24,
              right: 20,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: ACCENT,
              alignItems: "center",
              justifyContent: "center",
              elevation: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 5,
            }}
          >
            <MessageSquarePlus size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Janela da Conversa Ativa */
        <>
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {thread.isLoading && threadId ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 12 }} />
            ) : null}

            {items.length === 0 && (
              <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
                <Text style={{ color: TEXT_MUTED, fontSize: 13, textAlign: "center" }}>
                  Envie uma mensagem para iniciar o contacto com {active.outro_nome}.
                </Text>
              </View>
            )}

            {items.map((item) => {
              const mine = item.sender_id === myId;
              return (
                <View
                  key={item.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    backgroundColor: mine ? ACCENT : CARD,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderWidth: mine ? 0 : 1,
                    borderColor: BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: mine ? "#fff" : TEXT_MAIN,
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {item.conteudo}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Barra inferior de digitação */}
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopWidth: 1,
              borderTopColor: BORDER,
              backgroundColor: CARD,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escreva uma mensagem..."
              placeholderTextColor={PLACEHOLDER}
              multiline
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 110,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingTop: 11,
                paddingBottom: 11,
                color: TEXT_MAIN,
                backgroundColor: BG_SOFT,
                fontSize: 14,
              }}
            />
            <TouchableOpacity
              onPress={() => draft.trim() && send.mutate()}
              disabled={send.isPending || !draft.trim()}
              activeOpacity={0.85}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: draft.trim() ? ACCENT : BORDER,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Modal - Novo Chat */}
      <Modal
        visible={newChatOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewChatOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: BG_SOFT, paddingTop: insets.top }}>
          {/* Header do modal */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: CARD,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: TEXT_MAIN }}>
              Nova mensagem
            </Text>
            <TouchableOpacity
              onPress={() => setNewChatOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: BG_SOFT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} color={TEXT_MAIN} />
            </TouchableOpacity>
          </View>

          {/* Campo de busca no modal */}
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: CARD,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: BORDER,
                paddingHorizontal: 12,
                height: 46,
                gap: 8,
              }}
            >
              <Search size={18} color={TEXT_MUTED} />
              <TextInput
                value={userSearchText}
                onChangeText={setUserSearchText}
                placeholder="Pesquisar utilizador ou empresa..."
                placeholderTextColor={PLACEHOLDER}
                autoFocus
                style={{ flex: 1, color: TEXT_MAIN, fontSize: 14 }}
              />
              {!!userSearchText && (
                <TouchableOpacity onPress={() => setUserSearchText("")}>
                  <X size={16} color={TEXT_MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Lista de contatos encontrados */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {usersQuery.isLoading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
            ) : (usersQuery.data || []).length === 0 ? (
              <Text style={{ color: TEXT_SUB, textAlign: "center", marginTop: 32 }}>
                {userSearchText.trim()
                  ? "Nenhum utilizador encontrado."
                  : "Digite o nome para pesquisar contatos."}
              </Text>
            ) : (
              (usersQuery.data || [])
                .filter((u) => u.id !== myId)
                .map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => startChatWith(u)}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: CARD,
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: BORDER,
                    }}
                  >
                    <ArmutraAvatar
                      uri={mediaUrl(u.avatar_url || u.foto_perfil)}
                      name={u.name || u.nome}
                      size={42}
                      borderRadius={21}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: TEXT_MAIN, fontSize: 15 }}>
                        {u.name || u.nome}
                      </Text>
                      <Text style={{ color: TEXT_SUB, fontSize: 12, marginTop: 2 }}>
                        {[u.profession, u.city || u.province, u.user_type]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
