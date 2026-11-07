import React, { useState } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { ACCENT, ACCENT_DARK } from "@/theme";

/** Fallback initials — tons de verde (referência Armutra) */
const AVATAR_GREENS = [ACCENT, ACCENT_DARK, "#22C55E", "#10B981", "#059669"];

function normalizeUri(uri) {
  if (uri == null) return null;
  const value = String(uri).trim();
  return value.length > 0 ? value : null;
}

export default function ArmutraAvatar({ uri, name, size = 44, borderRadius, style }) {
  const [error, setError] = useState(false);
  const imageUri = normalizeUri(uri);
  const radius = borderRadius !== undefined ? borderRadius : size / 2;
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  const colorIndex = name ? name.charCodeAt(0) % AVATAR_GREENS.length : 0;
  const bgColor = AVATAR_GREENS[colorIndex];

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: "hidden",
  };

  if (error || !imageUri) {
    return (
      <View
        style={[
          baseStyle,
          {
            backgroundColor: bgColor,
            alignItems: "center",
            justifyContent: "center",
          },
          style,
        ]}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.38 }}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={[baseStyle, style]}
      contentFit="cover"
      onError={() => setError(true)}
    />
  );
}
