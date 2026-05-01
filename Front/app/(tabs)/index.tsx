import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        <Text style={styles.accent}>오모</Text>에 오신 것을 환영합니다
      </Text>
      <Text style={styles.subtitle}>로그인 완료</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "PretendardBold",
    fontSize: 22,
    color: "#212020",
    marginBottom: 12,
  },
  accent: {
    fontFamily: "Chab",
    color: "#FF007F",
  },
  subtitle: {
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#A6A6A6",
  },
});
