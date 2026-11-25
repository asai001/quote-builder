import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * ログインの共通設定（データベースを使わない部分）。
 * 画面に入る前のチェック（src/proxy.ts）と、本体の設定（src/auth.ts）の両方で使う。
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  // ログイン状態は暗号化した Cookie（JWT）で持つ。12時間たつと自動でログアウトになる
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  providers: [],
  logger: {
    // パスワードの打ち間違いはよくあることなので、エラーとして記録しない（それ以外は記録する）
    error(error) {
      if ((error as { type?: string }).type === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: Role }).role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
