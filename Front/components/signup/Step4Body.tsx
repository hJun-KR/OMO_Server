import { StyleSheet, Text, View } from "react-native";

import { WheelPicker } from "./WheelPicker";
import { signupStyles as s } from "./styles";

export const HEIGHTS = Array.from({ length: 121 }, (_, i) => i + 100); // 100~220cm
export const WEIGHTS = Array.from({ length: 121 }, (_, i) => i + 30); // 30~150kg

type Props = {
  height: number;
  onChangeHeight: (v: number) => void;
  weight: number;
  onChangeWeight: (v: number) => void;
};

export function Step4Body({
  height,
  onChangeHeight,
  weight,
  onChangeWeight,
}: Props) {
  return (
    <>
      <Text style={[s.title, local.title]}>신체 사이즈를 알려주세요.</Text>
      <Text style={[s.subTitle, local.subTitle]}>키와 몸무게</Text>
      <View style={local.pickerRow}>
        <WheelPicker
          values={HEIGHTS}
          value={height}
          onChange={onChangeHeight}
          unit="cm"
        />
        <WheelPicker
          values={WEIGHTS}
          value={weight}
          onChange={onChangeWeight}
          unit="kg"
        />
      </View>
    </>
  );
}

const local = StyleSheet.create({
  title: {
    marginBottom: 60,
  },
  subTitle: {
    marginBottom: 40,
  },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
});
