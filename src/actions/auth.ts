"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "メールアドレスとパスワードを入力してください。", email };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "メールアドレスかパスワードが違います。もう一度お確かめください。", email };
    }
    // ログイン成功時の画面移動は、そのまま通す
    throw error;
  }
  return {};
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
