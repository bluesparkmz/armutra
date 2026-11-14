import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { ArrowLeft, Send } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import { armutraApi, mediaUrl } from "@/utils/api";
import useAuth from "@/utils/auth/useAuth";
import { logError } from "@/utils/logger";
import { ACCENT, BG_SOFT, BORDER, CARD, TEXT_MAIN, TEXT_MUTED, TEXT_SUB } from "@/theme";

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

  const conversations = useQuery({
    queryKey: ["messages", "list", token],
    enabled: !!token,
    queryFn: () => armutraApi.getConversations(token),
  });

  const threadId = active?.id;
  const thread = useQuery({
    queryKey: ["messages", "thread", threadId],
    enabled: !!token && !!threadId,
    queryFn: () => armutraApi.getMessages(threadId, token),
  });

  const items = thread.data?.messages || [];

  useEffect(() => {
    if (!presetConversationId || active?.id) return;
    const found = (conversations.data || []).find((item) => item.id === presetConversationId);
    if (found) setActive(found);
  }, [presetConversationId, conversations.data, active?.id]);

  const send = useMutation({
    mutationFn: () =>
      armutraApi.sendMessage(
        { destinatario_user_id: active.outro_user_id, conteudo: draft.trim() },
        token
      ),
    onSuccess: (result) => {
      setDraft("");
      setActive((current) => ({ ...current, id: result.conversation_id }));
      queryClient.setQueryData(["messages", "thread", result.conversation_id], result);
      queryClient.invalidateQueries({ queryKey: ["messages", "list"] });
    },
    onError: (error) => logError("send-message", error),
  });

  const headerName = active?.outro_nome || "Mensagens";
  const list = useMemo(() => conversations.data || [], [conversations.data]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG_SOFT, paddingTop: insets.top }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity onPress={() => (active && !presetUserId ? setActive(null) : router.back())}>
          <ArrowLeft size={22} color={TEXT_MAIN} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: TEXT_MAIN }} numberOfLines={1}>
          {active ? headerName : "Mensagens"}
        </Text>
      </View>

      {!token ? (
        <Text style={{ padding: 20, color: TEXT_SUB }}>Entre na sua conta para ver as mensagens.</Text>
      ) : !active ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 24 }}>
          {conversations.isLoading ? (
            <ActivityIndicator color={ACCENT} />
          ) : list.length === 0 ? (
            <Text style={{ color: TEXT_SUB }}>Ainda não tem conversas.</Text>
          ) : (
            list.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActive(item)}
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
                <ArmutraAvatar uri={mediaUrl(item.outro_foto)} name={item.outro_nome} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: TEXT_MAIN }}>{item.outro_nome}</Text>
                  <Text numberOfLines={1} style={{ color: TEXT_SUB, marginTop: 2 }}>
                    {item.ultima_mensagem || "Sem mensagens"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 12 }}>
            {thread.isLoading && threadId ? <ActivityIndicator color={ACCENT} /> : null}
            {items.map((item) => {
              const mine = item.sender_id === myId;
              return (
                <View
                  key={item.id}
                  style={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    backgroundColor: mine ? ACCENT : CARD,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: mine ? 0 : 1,
                    borderColor: BORDER,
                  }}
                >
                  <Text style={{ color: mine ? "#fff" : TEXT_MAIN }}>{item.conteudo}</Text>
                </View>
              );
            })}
            {!threadId && (
              <Text style={{ color: TEXT_MUTED }}>Envie a primeira mensagem para {presetName}.</Text>
            )}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopWidth: 1,
              borderTopColor: BORDER,
              backgroundColor: CARD,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escreva uma mensagem"
              placeholderTextColor={TEXT_MUTED}
              style={{
                flex: 1,
                minHeight: 44,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 12,
                paddingHorizontal: 12,
                color: TEXT_MAIN,
              }}
            />
            <TouchableOpacity
              onPress={() => draft.trim() && send.mutate()}
              disabled={send.isPending}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: ACCENT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
