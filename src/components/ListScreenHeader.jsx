import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { ArrowLeft, Search, X } from "lucide-react-native";
import ScreenFixedHeader from "@/components/ScreenFixedHeader";
import { BG_SOFT, BORDER, PLACEHOLDER, TEXT_MAIN, TEXT_SUB } from "@/theme";

/** Só a barra superior fixa (~48px): voltar + título + lupa */
export default function ListScreenHeader({
  insets,
  title,
  onBack,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Pesquisar...",
}) {
  const [searchOpen, setSearchOpen] = useState(Boolean(searchValue));

  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange?.("");
  };

  return (
    <ScreenFixedHeader insets={insets} paddingBottom={0}>
      {searchOpen ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            height: 50,
            gap: 8,
          }}
        >
          <TouchableOpacity onPress={closeSearch} activeOpacity={0.8} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={22} color={TEXT_MAIN} strokeWidth={2} />
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: BG_SOFT,
              borderRadius: 12,
              paddingHorizontal: 12,
              height: 40,
              borderWidth: 1,
              borderColor: BORDER,
            }}
          >
            <Search size={17} color={TEXT_SUB} />
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder={searchPlaceholder}
              placeholderTextColor={PLACEHOLDER}
              autoFocus
              returnKeyType="search"
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 15,
                color: TEXT_MAIN,
                paddingVertical: 0,
              }}
            />
            {searchValue ? (
              <TouchableOpacity onPress={() => onSearchChange?.("")} hitSlop={8}>
                <X size={17} color={TEXT_SUB} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 4,
            height: 50,
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.8}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={22} color={TEXT_MAIN} strokeWidth={2} />
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 17,
              fontWeight: "700",
              color: TEXT_MAIN,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <TouchableOpacity
            onPress={openSearch}
            activeOpacity={0.8}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <Search size={22} color={TEXT_MAIN} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}
    </ScreenFixedHeader>
  );
}
