import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mockLogin } from "@/api/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<"invalid" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    const result = await mockLogin(username, password);
    setSubmitting(false);
    if (result.success) {
      router.replace("/(tabs)");
    } else {
      setLoginError("invalid");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoKorean}>오모</Text>
        <Text style={styles.logoEnglish}>
          <Text style={styles.logoAccent}>O</Text>h{" "}
          <Text style={styles.logoAccent}>M</Text>y{" "}
          <Text style={styles.logoAccent}>O</Text>utfit
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          style={styles.input}
          placeholder="아이디를 입력해 주세요."
          placeholderTextColor="#999"
          value={username}
          onChangeText={(v) => {
            setUsername(v);
            setLoginError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="비밀번호를 입력해 주세요."
            placeholderTextColor="#999"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setLoginError(null);
            }}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={styles.eyeButton}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color="#E2E2E2"
            />
          </Pressable>
        </View>
      </View>

      {loginError === "invalid" && (
        <Text style={styles.errorText}>ⓘ 회원정보가 없습니다.</Text>
      )}

      <View style={styles.optionRow}>
        <Pressable
          style={styles.rememberRow}
          onPress={() => setRememberMe((v) => !v)}
          hitSlop={6}
        >
          <Ionicons
            name={rememberMe ? "checkbox" : "square-outline"}
            size={20}
            color={rememberMe ? "#FF007F" : "#A6A6A6"}
          />
          <Text style={styles.optionLabel}>로그인 저장</Text>
        </Pressable>

        <Pressable hitSlop={6} onPress={() => {}}>
          <Text style={styles.forgotText}>비밀번호 찾기</Text>
        </Pressable>
      </View>

      <View style={styles.bottomGroup}>
        <Pressable style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </Pressable>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>아직 계정이 없으시다면 </Text>
          <Text
            style={styles.signupLink}
            onPress={() => router.push("/(auth)/signup")}
          >
            회원가입하기
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  logoBox: {
    alignItems: "flex-start",
    marginTop: 120,
    marginBottom: 20,
  },

  logoKorean: {
    fontFamily: "Chab",
    fontSize: 30,
    color: "#FF007F",
    letterSpacing: -2,
    marginBottom: 2,
  },

  logoEnglish: {
    fontFamily: "Chab",
    fontSize: 22,
    color: "#212020",
    letterSpacing: -1,
  },

  logoAccent: {
    color: "#FF007F",
  },

  inputGroup: {
    gap: 12,
  },

  input: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingHorizontal: 16,
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
    backgroundColor: "#FFFFFF",
  },

  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },

  passwordInput: {
    paddingRight: 48,
  },

  eyeButton: {
    position: "absolute",
    right: 16,
    height: "100%",
    justifyContent: "center",
  },

  errorText: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#FF007F",
    marginTop: 8,
  },

  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  optionLabel: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#A6A6A6",
  },

  forgotText: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#FF007F",
  },

  bottomGroup: {
    marginTop: "auto",
    marginBottom: 24,
  },

  loginButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#FF007F",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    fontFamily: "PretendardSemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  signupText: {
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
  },

  signupLink: {
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#FF007F",
    textDecorationLine: "underline",
  },
});
