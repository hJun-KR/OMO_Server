import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import { signupStyles as s } from "./styles";

type Props = {
  password: string;
  onChangePassword: (v: string) => void;
  confirmPassword: string;
  onChangeConfirmPassword: (v: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  showConfirm: boolean;
  onToggleShowConfirm: () => void;
  passwordError: "empty" | "format" | null;
};

const filterPassword = (text: string) => text.replace(/[^a-zA-Z0-9~!@]/g, "");

export function Step2Password({
  password,
  onChangePassword,
  confirmPassword,
  onChangeConfirmPassword,
  showPassword,
  onToggleShowPassword,
  showConfirm,
  onToggleShowConfirm,
  passwordError,
}: Props) {
  const validFormat =
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[~!@]/.test(password);
  const mismatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;
  const match =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword &&
    validFormat;

  return (
    <>
      <Text style={s.title}>
        <Text style={s.titleAccent}>오모</Text> 에서 사용하실{"\n"}
        비밀번호를 입력해 주세요.
      </Text>
      <View style={s.inputGroup}>
        <View style={s.passwordWrapper}>
          <TextInput
            style={[s.input, s.passwordInput]}
            placeholder="비밀번호를 입력해 주세요."
            placeholderTextColor="#A6A6A6"
            value={password}
            onChangeText={(t) => onChangePassword(filterPassword(t))}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="ascii-capable"
          />
          <Pressable
            style={s.eyeButton}
            onPress={onToggleShowPassword}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color="#A6A6A6"
            />
          </Pressable>
        </View>
        <View style={s.passwordWrapper}>
          <TextInput
            style={[s.input, s.passwordInput]}
            placeholder="비밀번호를 다시 입력해 주세요."
            placeholderTextColor="#A6A6A6"
            value={confirmPassword}
            onChangeText={(t) => onChangeConfirmPassword(filterPassword(t))}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="ascii-capable"
          />
          <Pressable
            style={s.eyeButton}
            onPress={onToggleShowConfirm}
            hitSlop={8}
          >
            <Ionicons
              name={showConfirm ? "eye" : "eye-off"}
              size={20}
              color="#A6A6A6"
            />
          </Pressable>
        </View>
      </View>
      <Text style={s.helperText}>
        ⓘ 특수문자를 포함해 8자리 이상 입력해주세요.
      </Text>
      {passwordError === "empty" && (
        <Text style={s.errorText}>ⓘ 비밀번호를 입력해 주세요.</Text>
      )}
      {passwordError === "format" && (
        <Text style={s.errorText}>
          ⓘ 특수문자(~, !, @)와 숫자를 포함해 주세요.
        </Text>
      )}
      {mismatch && (
        <Text style={s.errorText}>ⓘ 비밀번호가 일치하지 않습니다.</Text>
      )}
      {match && (
        <Text style={s.successText}>비밀번호가 일치합니다.</Text>
      )}
    </>
  );
}
