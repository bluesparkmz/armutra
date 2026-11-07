import React, { useState } from "react";
import { FlatList, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { Check, ChevronDown, ChevronLeft, ChevronRight, MapPin, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDistrictsByProvince, provinceOptions } from "@/data/mozambiqueLocationsData";
import { ACCENT, ACCENT_DARK, ACCENT_LIGHT, BG, BORDER, TEXT_MAIN, TEXT_MUTED, TEXT_SUB } from "@/theme";

function Row({ label, selected, onPress, chevron }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
      }}
    >
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: selected ? "700" : "500",
          color: selected ? ACCENT_DARK : TEXT_MAIN,
        }}
      >
        {label}
      </Text>
      {selected && <Check size={18} color={ACCENT} />}
      {chevron && !selected && <ChevronRight size={16} color={TEXT_MUTED} />}
    </TouchableOpacity>
  );
}

/**
 * Filtro de localização: botão compacto + folha com províncias e, depois, cidades/distritos.
 * onChange(province, city) — strings vazias significam "todas".
 */
export default function LocationFilter({ province, city, onChange, style }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("province");

  const active = !!province;
  const label = city || province || "Localização";

  const openSheet = () => {
    setStep(province ? "city" : "province");
    setOpen(true);
  };
  const close = () => setOpen(false);

  const pickProvince = (value) => {
    if (!value) {
      onChange("", "");
      close();
      return;
    }
    onChange(value, "");
    setStep("city");
  };

  const pickCity = (value) => {
    onChange(province, value);
    close();
  };

  const districts = province ? getDistrictsByProvince(province) : [];

  const data =
    step === "province"
      ? [{ key: "all", label: "Todas as províncias", value: "" }].concat(
          provinceOptions.map((name) => ({ key: name, label: name, value: name }))
        )
      : [{ key: "all", label: `Toda a província de ${province}`, value: "" }].concat(
          districts.map((name) => ({ key: name, label: name, value: name }))
        );

  return (
    <View style={[{ paddingHorizontal: 20, flexDirection: "row" }, style]}>
      <TouchableOpacity
        onPress={openSheet}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          maxWidth: "100%",
          paddingLeft: 12,
          paddingRight: active ? 6 : 12,
          height: 38,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: active ? ACCENT : BORDER,
          backgroundColor: active ? ACCENT_LIGHT : BG,
        }}
      >
        <MapPin size={15} color={active ? ACCENT_DARK : TEXT_SUB} />
        <Text
          style={{
            flexShrink: 1,
            fontSize: 13,
            fontWeight: "600",
            color: active ? ACCENT_DARK : TEXT_SUB,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {active ? (
          <TouchableOpacity
            onPress={() => onChange("", "")}
            hitSlop={8}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={14} color={ACCENT_DARK} />
          </TouchableOpacity>
        ) : (
          <ChevronDown size={15} color={TEXT_SUB} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={close} />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "75%",
            backgroundColor: BG,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              height: 56,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
            }}
          >
            {step === "city" ? (
              <TouchableOpacity
                onPress={() => setStep("province")}
                activeOpacity={0.7}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, height: 40 }}
              >
                <ChevronLeft size={20} color={TEXT_MAIN} />
                <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN }}>{province}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: TEXT_MAIN, paddingHorizontal: 8 }}>
                Província
              </Text>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={close}
              activeOpacity={0.7}
              style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <X size={20} color={TEXT_SUB} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              if (step === "province") {
                const selected = item.value === "" ? !province : item.value === province;
                return (
                  <Row
                    label={item.label}
                    selected={selected}
                    chevron={item.value !== ""}
                    onPress={() => pickProvince(item.value)}
                  />
                );
              }
              const selected = item.value === "" ? !city : item.value === city;
              return <Row label={item.label} selected={selected} onPress={() => pickCity(item.value)} />;
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
