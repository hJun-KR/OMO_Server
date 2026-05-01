import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onCheckDuplicate: () => void;
};

export function IdInputBox({ value, onChangeText, onCheckDuplicate }: Props) {
  const isFilled = value.length > 0;
  const buttonBorderColor = isFilled ? "#FF007F" : "#E2E2E2";
  const buttonBgColor = isFilled ? "#FF007F" : "#FFFFFF";
  const buttonTextColor = isFilled ? "#FFFFFF" : "#A6A6A6";

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="아이디를 입력해 주세요."
        placeholderTextColor="#A6A6A6"
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^a-zA-Z0-9]/g, ""))}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="ascii-capable"
      />
      <Pressable
        style={[
          styles.button,
          { borderColor: buttonBorderColor, backgroundColor: buttonBgColor },
        ]}
        onPress={onCheckDuplicate}
      >
        <Text style={[styles.buttonText, { color: buttonTextColor }]}>
          중복확인
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
    paddingVertical: 0,
  },
  button: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  buttonText: {
    fontFamily: "PretendardSemiBold",
    fontSize: 13,
  },
});
