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

export default function ArmutraAvatar({ uri, name, size = 44, borderRadius, style, online = false }) {
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

  const face =
    error || !imageUri ? (
      <View
        style={[
          baseStyle,
          {
            backgroundColor: bgColor,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.38 }}>
          {initials}
        </Text>
      </View>
    ) : (
      <Image
        source={{ uri: imageUri }}
        style={baseStyle}
        contentFit="cover"
        onError={() => setError(true)}
      />
    );

  return (
    <View style={[{ width: size, height: size }, style]}>
      {face}
      {online ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: Math.max(10, Math.round(size * 0.22)),
            height: Math.max(10, Math.round(size * 0.22)),
            borderRadius: 99,
            backgroundColor: "#16A34A",
            borderWidth: 2,
            borderColor: "#fff",
          }}
        />
      ) : null}
    </View>
  );
}
