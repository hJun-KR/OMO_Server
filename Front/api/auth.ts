type User = {
  userId: string;
  password: string;
  selectedStyle: string;
  name: string;
  height: number;
  weight: number;
};

const users: User[] = [];

export async function isUserIdTaken(userId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150));
  return users.some((u) => u.userId === userId);
}

type SignupResult =
  | { success: true }
  | { success: false; reason: "duplicate" };

export async function mockSignup(user: User): Promise<SignupResult> {
  await new Promise((r) => setTimeout(r, 200));
  if (users.some((u) => u.userId === user.userId)) {
    return { success: false, reason: "duplicate" };
  }
  users.push(user);
  return { success: true };
}

type LoginResult =
  | { success: true }
  | { success: false; reason: "invalid" };

export async function mockLogin(
  userId: string,
  password: string,
): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 200));
  const found = users.find(
    (u) => u.userId === userId && u.password === password,
  );
  return found ? { success: true } : { success: false, reason: "invalid" };
}
