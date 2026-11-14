import React, { useMemo } from "react";
import { View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { ACCENT } from "@/theme";
import {
  getDefaultDistrict,
  getDistrictsByProvince,
  provinceOptions,
} from "@/data/mozambiqueLocationsData";

export default function LocationFields({
  province,
  city,
  onProvinceChange,
  onCityChange,
  inputStyle,
  rowStyle,
}) {
  const isStacked = rowStyle?.flexDirection === "column";
  const districtOptions = useMemo(() => {
    const districts = getDistrictsByProvince(province);
    if (city && !districts.includes(city)) {
      return [city, ...districts];
    }
    return districts;
  }, [province, city]);

  const pickerStyle = {
    color: "#0F172A",
    minHeight: inputStyle?.minHeight || 52,
  };

  const fieldStyle = [
    inputStyle,
    { flex: isStacked ? undefined : 1, paddingHorizontal: 0, paddingVertical: 0 },
  ];

  const handleProvinceChange = (nextProvince) => {
    onProvinceChange(nextProvince);
    onCityChange(getDefaultDistrict(nextProvince));
  };

  return (
    <View style={[{ flexDirection: "row", gap: 10 }, rowStyle]}>
      <View style={fieldStyle}>
        <Picker
          selectedValue={province}
          onValueChange={handleProvinceChange}
          dropdownIconColor={ACCENT}
          style={pickerStyle}
        >
          <Picker.Item label="Provincia" value="" />
          {provinceOptions.map((option) => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>
      <View style={fieldStyle}>
        <Picker
          selectedValue={city}
          onValueChange={onCityChange}
          dropdownIconColor={ACCENT}
          enabled={districtOptions.length > 0}
          style={{
            ...pickerStyle,
            color: city ? "#0F172A" : "#94A3B8",
          }}
        >
          <Picker.Item label="Cidade/Distrito" value="" />
          {districtOptions.map((option) => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>
    </View>
  );
}
