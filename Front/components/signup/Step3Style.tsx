import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { signupStyles as s } from "./styles";

export const STYLE_OPTIONS = ["캐주얼", "스트릿", "미니멀", "러블리", "포멀"];

type Props = {
  selectedStyle: string;
  onChangeStyle: (v: string) => void;
  styleOpen: boolean;
  onToggleStyleOpen: () => void;
  name: string;
  onChangeName: (v: string) => void;
};

export function Step3Style({
  selectedStyle,
  onChangeStyle,
  styleOpen,
  onToggleStyleOpen,
  name,
  onChangeName,
}: Props) {
  return (
    <>
      <Text style={s.title}>
        <Text style={s.titleAccent}>오모</Text> 에서 사용할{"\n"}
        스타일을 선택하고 이름을 입력해 주세요.
      </Text>
      <View style={s.inputGroup}>
        <View>
          <Pressable
            style={[s.input, local.dropdownButton]}
            onPress={onToggleStyleOpen}
          >
            <Text
              style={[
                local.dropdownText,
                !selectedStyle && local.placeholderText,
              ]}
            >
              {selectedStyle || "스타일을 선택해 주세요."}
            </Text>
            <Ionicons
              name={styleOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#A6A6A6"
            />
          </Pressable>
          {styleOpen && (
            <View style={local.dropdownList}>
              {STYLE_OPTIONS.map((opt, i) => (
                <Pressable
                  key={opt}
                  style={[
                    local.dropdownItem,
                    i < STYLE_OPTIONS.length - 1 && local.dropdownItemDivider,
                  ]}
                  onPress={() => onChangeStyle(opt)}
                >
                  <Text
                    style={[
                      local.dropdownItemText,
                      selectedStyle === opt && local.dropdownItemSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <TextInput
          style={s.input}
          placeholder="이름을 입력해 주세요."
          placeholderTextColor="#A6A6A6"
          value={name}
          onChangeText={onChangeName}
        />
      </View>
    </>
  );
}

const local = StyleSheet.create({
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
  },
  placeholderText: {
    color: "#A6A6A6",
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: 12,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dropdownItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F2",
  },
  dropdownItemText: {
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
  },
  dropdownItemSelected: {
    fontFamily: "PretendardSemiBold",
    color: "#FF007F",
  },
});
