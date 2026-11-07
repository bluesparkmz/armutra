import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Sparkles } from "lucide-react-native";
import { colors, radius } from "@/theme";

export default function PromoBanner({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        backgroundColor: colors.primaryLight,
        borderRadius: radius.xl,
        padding: 20,
        flexDirection: "row",
        alignItems: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.primaryMuted,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} color={colors.primary} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.5 }}>
            ARMUTRA
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, lineHeight: 24 }}>
          Talentos e vagas, prontos para trabalhar
        </Text>
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.85}
          style={{
            marginTop: 14,
            alignSelf: "flex-start",
            backgroundColor: colors.black,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: radius.pill,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: "700", fontSize: 13 }}>Explorar</Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.primary + "22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 36 }}>💼</Text>
      </View>
    </TouchableOpacity>
  );
}
