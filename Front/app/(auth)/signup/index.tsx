import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { isUserIdTaken, mockSignup } from "@/api/auth";
import { Step1Id } from "@/components/signup/Step1Id";
import { Step2Password } from "@/components/signup/Step2Password";
import { Step3Style } from "@/components/signup/Step3Style";
import { Step4Body } from "@/components/signup/Step4Body";
import { signupStyles as s } from "@/components/signup/styles";

export default function SignupScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const progress = useSharedValue(25);
  useEffect(() => {
    progress.value = withTiming(step * 25, { duration: 350 });
  }, [step, progress]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  const [userId, setUserId] = useState("");
  const [idChecked, setIdChecked] = useState<
    "ok" | "duplicate" | "empty" | null
  >(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<
    "empty" | "format" | null
  >(null);

  const [selectedStyle, setSelectedStyle] = useState("");
  const [styleOpen, setStyleOpen] = useState(false);
  const [name, setName] = useState("");

  const [height, setHeight] = useState(160);
  const [weight, setWeight] = useState(50);

  const handleCheckDuplicate = async () => {
    if (!userId) return;
    const taken = await isUserIdTaken(userId);
    setIdChecked(taken ? "duplicate" : "ok");
  };

  const isStepValid = (() => {
    if (step === 1) return userId.length > 0;
    if (step === 2) {
      return (
        password.length > 0 &&
        confirmPassword.length > 0 &&
        password === confirmPassword &&
        /[a-zA-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[~!@]/.test(password)
      );
    }
    if (step === 3) return selectedStyle.length > 0 && name.length > 0;
    return true;
  })();

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      return;
    }
    router.back();
  };

  const handleNext = async () => {
    if (step === 1 && !userId) {
      setIdChecked("empty");
      return;
    }
    if (step === 2 && (!password || !confirmPassword)) {
      setPasswordError("empty");
      return;
    }
    if (step === 2 && (!/[0-9]/.test(password) || !/[~!@]/.test(password))) {
      setPasswordError("format");
      return;
    }
    if (step === 2 && password !== confirmPassword) {
      return;
    }
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    const result = await mockSignup({
      userId,
      password,
      selectedStyle,
      name,
      height,
      weight,
    });
    if (result.success) {
      router.replace("/(auth)/login");
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backButton} onPress={handleBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#212020" />
        </Pressable>
        <View style={s.progressBg}>
          <Animated.View style={[s.progressFg, progressStyle]} />
        </View>
      </View>

      <View style={s.body}>
        {step === 1 && (
          <Step1Id
            userId={userId}
            onChangeUserId={(v) => {
              setUserId(v);
              setIdChecked(null);
            }}
            idChecked={idChecked}
            onCheckDuplicate={handleCheckDuplicate}
          />
        )}

        {step === 2 && (
          <Step2Password
            password={password}
            onChangePassword={(v) => {
              setPassword(v);
              setPasswordError(null);
            }}
            confirmPassword={confirmPassword}
            onChangeConfirmPassword={(v) => {
              setConfirmPassword(v);
              setPasswordError(null);
            }}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword((v) => !v)}
            showConfirm={showConfirm}
            onToggleShowConfirm={() => setShowConfirm((v) => !v)}
            passwordError={passwordError}
          />
        )}

        {step === 3 && (
          <Step3Style
            selectedStyle={selectedStyle}
            onChangeStyle={(v) => {
              setSelectedStyle(v);
              setStyleOpen(false);
            }}
            styleOpen={styleOpen}
            onToggleStyleOpen={() => setStyleOpen((v) => !v)}
            name={name}
            onChangeName={setName}
          />
        )}

        {step === 4 && (
          <Step4Body
            height={height}
            onChangeHeight={setHeight}
            weight={weight}
            onChangeWeight={setWeight}
          />
        )}
      </View>

      <View style={s.bottomGroup}>
        <Pressable
          style={[
            s.nextButton,
            { backgroundColor: isStepValid ? "#FF007F" : "#FFDDEC" },
          ]}
          onPress={handleNext}
        >
          <Text style={s.nextButtonText}>
            {step === 4 ? "완료" : "다음으로"}
          </Text>
        </Pressable>
        <View style={s.loginRow}>
          <Text style={s.loginText}>이미 계정이 있다면 </Text>
          <Text
            style={s.loginLink}
            onPress={() => router.push("/(auth)/login")}
          >
            로그인하기
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
