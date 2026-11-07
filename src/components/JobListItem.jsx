import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronRight, MapPin } from "lucide-react-native";
import ArmutraAvatar from "@/components/ArmutraAvatar";
import {
  ACCENT_DARK,
  ACCENT_LIGHT,
  BORDER,
  CARD,
  TEXT_MAIN,
  TEXT_MUTED,
  TEXT_SUB,
} from "@/theme";

/**
 * Linha compacta de vaga — largura total, sem botões grandes.
 * Toda a linha é clicável; o avatar abre o perfil da empresa.
 */
export default function JobListItem({
  title,
  company,
  logo,
  location,
  jobType,
  salary,
  postedAt,
  onPress,
  onPressCompany,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
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
      <TouchableOpacity
        onPress={onPressCompany}
        disabled={!onPressCompany}
        activeOpacity={0.8}
      >
        <ArmutraAvatar uri={logo} name={company} size={44} borderRadius={10} />
      </TouchableOpacity>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{ flex: 1, fontSize: 15, fontWeight: "600", color: TEXT_MAIN }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {!!postedAt && (
            <Text style={{ fontSize: 11, color: TEXT_MUTED, marginLeft: 8 }}>{postedAt}</Text>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
          <Text style={{ fontSize: 13, color: TEXT_SUB, flexShrink: 1 }} numberOfLines={1}>
            {company}
          </Text>
          {!!location && (
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginLeft: 8 }}>
              <MapPin size={12} color={TEXT_MUTED} />
              <Text
                style={{ fontSize: 12, color: TEXT_MUTED, marginLeft: 2, flexShrink: 1 }}
                numberOfLines={1}
              >
                {location}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
          {!!salary && (
            <Text
              style={{ fontSize: 13, fontWeight: "700", color: ACCENT_DARK, flexShrink: 1 }}
              numberOfLines={1}
            >
              {salary}
            </Text>
          )}
          {!!jobType && (
            <View
              style={{
                backgroundColor: ACCENT_LIGHT,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: ACCENT_DARK }}>{jobType}</Text>
            </View>
          )}
        </View>
      </View>

      <ChevronRight size={18} color={TEXT_MUTED} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
}
