import { Text } from "react-native";

import { IdInputBox } from "./IdInputBox";
import { signupStyles as s } from "./styles";

type Props = {
  userId: string;
  onChangeUserId: (v: string) => void;
  idChecked: "ok" | "duplicate" | "empty" | null;
  onCheckDuplicate: () => void;
};

export function Step1Id({
  userId,
  onChangeUserId,
  idChecked,
  onCheckDuplicate,
}: Props) {
  return (
    <>
      <Text style={s.title}>
        <Text style={s.titleAccent}>오모</Text> 에서 사용하실{"\n"}
        아이디를 입력해 주세요.
      </Text>
      <IdInputBox
        value={userId}
        onChangeText={onChangeUserId}
        onCheckDuplicate={onCheckDuplicate}
      />
      {idChecked === "duplicate" && (
        <Text style={s.errorText}>ⓘ 이미 사용중인 아이디예요.</Text>
      )}
      {idChecked === "empty" && (
        <Text style={s.errorText}>ⓘ 아이디를 입력해 주세요.</Text>
      )}
      {idChecked === "ok" && (
        <Text style={s.successText}>사용 가능한 아이디입니다.</Text>
      )}
    </>
  );
}
