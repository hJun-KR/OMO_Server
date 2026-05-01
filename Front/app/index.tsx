import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";

export default function Intro() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/start");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

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
    marginBottom: 40,
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
});
