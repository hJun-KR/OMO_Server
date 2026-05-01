import { StyleSheet } from "react-native";

export const signupStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 8,
    marginBottom: 48,
  },

  backButton: {
    alignSelf: "flex-start",
    marginLeft: -4,
    marginBottom: 16,
  },

  headerLabel: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#A6A6A6",
    marginBottom: 8,
  },

  progressBg: {
    height: 4,
    backgroundColor: "#EFEFEF",
    borderRadius: 2,
    overflow: "hidden",
  },

  progressFg: {
    height: "100%",
    backgroundColor: "#FF007F",
    borderRadius: 2,
  },

  body: {
    flex: 1,
  },

  title: {
    fontFamily: "PretendardBold",
    fontSize: 20,
    color: "#212020",
    lineHeight: 30,
    marginBottom: 20,
  },

  titleAccent: {
    fontFamily: "Chab",
    color: "#FF007F"
  },

  subTitle: {
    fontFamily: "PretendardSemiBold",
    fontSize: 18,
    color: "#212020",
    textAlign: "center",
    marginBottom: 24,
  },

  inputGroup: {
    gap: 12,
  },

  inputRow: {
    flexDirection: "row",
    gap: 8,
  },

  input: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    paddingHorizontal: 16,
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
    backgroundColor: "#FFFFFF",
  },

  inputFlex: {
    flex: 1,
  },

  errorText: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#FF007F",
    marginTop: 8,
  },

  successText: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#34C759",
    marginTop: 8,
  },

  helperText: {
    fontFamily: "PretendardMedium",
    fontSize: 13,
    color: "#A6A6A6",
    marginTop: 8,
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

  bottomGroup: {
    marginTop: "auto",
    marginBottom: 24,
  },

  nextButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#FF007F",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  nextButtonText: {
    fontFamily: "PretendardSemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  loginText: {
    fontFamily: "PretendardMedium",
    fontSize: 14,
    color: "#212020",
  },

  loginLink: {
    fontFamily: "PretendardSemiBold",
    fontSize: 14,
    color: "#FF007F",
    textDecorationLine: "underline",
  },
});
