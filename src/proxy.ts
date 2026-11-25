import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

/**
 * すべての画面の手前で動くチェック。
 * ログインしていなければログイン画面へ、ログイン済みでログイン画面を開いたらトップへ移動させる。
 * （権限の細かいチェックは、各画面とサーバー側の処理でも必ず行う）
 */
export default auth((request) => {
  const isLoggedIn = Boolean(request.auth?.user);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  // ログイン処理そのもの（/api/auth）と、画像などの部品は対象外
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
