import React, { useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { BG_SOFT } from "@/theme";

const MIN_RATIO = 0.5; // limite para imagens muito altas
const MAX_RATIO = 2.5; // limite para imagens muito largas
const DEFAULT_RATIO = 4 / 3;

/**
 * Imagem em largura total que respeita a proporção original (nunca corta).
 * - A largura é sempre 100% do contentor.
 * - A altura é calculada em JS (largura / proporção) e limitada por `maxHeight`.
 *   Não se usa aspectRatio + maxHeight no estilo porque o layout encolheria
 *   a largura e deixaria um espaço à direita.
 * - Imagens mais altas que `maxHeight` ocupam a largura toda e são cortadas
 *   (cover) até essa altura; as restantes aparecem inteiras (contain).
 */
export default function FullWidthImage({ uri, ratio, maxHeight, style }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadedRatio, setLoadedRatio] = useState(null);

  const raw = ratio || loadedRatio || DEFAULT_RATIO;
  const aspectRatio = Math.min(Math.max(raw, MIN_RATIO), MAX_RATIO);

  let height;
  let capped = false;
  if (containerWidth > 0) {
    height = containerWidth / aspectRatio;
    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      capped = true;
    }
  }

  return (
    <View
      style={[{ width: "100%" }, style]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Image
        source={{ uri }}
        contentFit={capped ? "cover" : "contain"}
        transition={150}
        onLoad={(event) => {
          const { width, height: h } = event?.source || {};
          if (width && h) setLoadedRatio(width / h);
        }}
        style={
          height
            ? { width: "100%", height, backgroundColor: BG_SOFT }
            : { width: "100%", aspectRatio, backgroundColor: BG_SOFT }
        }
      />
    </View>
  );
}
