import { useRouter } from "expo-router";
import { StyleSheet, View, Text, Pressable } from "react-native";

export default function Start() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoKorean}>오모</Text>
        <Text style={styles.logoEnglish}>
          <Text style={styles.logoAccent}>O</Text>h{" "}
          <Text style={styles.logoAccent}>M</Text>y{" "}
          <Text style={styles.logoAccent}>O</Text>utfit
        </Text>
      </View>

      <View style={styles.bottomBox}>
        <Pressable
          style={styles.startButton}
          onPress={() => router.push("/(auth)/signup")}
        >
          <Text style={styles.startButtonText}>시작하기</Text>
        </Pressable>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>이미 계정이 있다면 </Text>
          <Text
            style={styles.loginLink}
            onPress={() => router.push("/(auth)/login")}
          >
            로그인하기
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },

  logoBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },

  logoKorean: {
    fontFamily: "Chab",
    fontSize: 48,
    color: "#FF007F",
    letterSpacing: -2,
    marginBottom: 2,
  },

  logoEnglish: {
    fontFamily: "Chab",
    fontSize: 24,
    color: "#212020",
    letterSpacing: -1,
  },

  logoAccent: {
    color: "#FF007F",
  },

  bottomBox: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  startButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#FF007F",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },

  startButtonText: {
    fontFamily: "PretendardSemiBold",
    color: "#FFFFFF",
    fontSize: 18,
  },

  loginRow: {
    fontFamily: "PretendardMedium",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loginText: {
    fontSize: 14,
    color: "#212020",
  },

  loginLink: {
    fontSize: 14,
    color: "#FF007F",
    textDecorationLine: "underline",
  },
});
