/** Paleta Armutra — verde primary único + neutros (sem azul/índigo/roxo) */
export const ACCENT = "#16A34A";
export const ACCENT_LIGHT = "#DCFCE7";
export const ACCENT_SOFT = "#ECFDF5";
export const ACCENT_DARK = "#15803D";
export const ACCENT_MUTED = "#BBF7D0";

export const TEXT_MAIN = "#111827";
export const TEXT_SUB = "#6B7280";
export const TEXT_MUTED = "#9CA3AF";
export const BG = "#FFFFFF";
export const BG_SOFT = "#F9FAFB";
export const CARD = "#FFFFFF";
export const BORDER = "#E5E7EB";
export const CHIP_ACTIVE = "#111827";
export const BLACK = "#111827";

/** Objeto `colors` para componentes que importam { colors } */
export const colors = {
  primary: ACCENT,
  primaryDark: ACCENT_DARK,
  primaryLight: ACCENT_LIGHT,
  primarySoft: ACCENT_SOFT,
  primaryMuted: ACCENT_MUTED,
  text: TEXT_MAIN,
  textSecondary: TEXT_SUB,
  textMuted: TEXT_MUTED,
  background: BG_SOFT,
  surface: CARD,
  border: BORDER,
  black: BLACK,
  white: "#FFFFFF",
};

export const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
};

/** Padding horizontal interno dos cards do feed (usado também para imagens full-bleed) */
export const FEED_CARD_PADDING = 16;

/** Card de feed em largura total (edge-to-edge), separado por faixas do fundo */
export const feedCardStyle = {
  width: "100%",
  alignSelf: "stretch",
  backgroundColor: CARD,
  borderRadius: 0,
  paddingHorizontal: FEED_CARD_PADDING,
  paddingVertical: 16,
  marginBottom: 8,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: BORDER,
};

/** Imagem que ocupa toda a largura do card (anula o padding horizontal) */
export const feedCardImageBleed = {
  marginHorizontal: -FEED_CARD_PADDING,
  borderRadius: 0,
};

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/** Badges de tipo de emprego — só variações de verde */
export function jobTypeBadgeStyle(_jobType = "") {
  return { bg: ACCENT_LIGHT, color: ACCENT_DARK };
}

/** Alias usado em alguns componentes */
export function jobTypeTagStyle() {
  return jobTypeBadgeStyle();
}

export function contentTypeBadgeStyle() {
  return jobTypeBadgeStyle();
}
