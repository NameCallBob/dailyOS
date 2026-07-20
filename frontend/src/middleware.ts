import { NextResponse, type NextRequest } from "next/server";

import { MODE_COOKIE, TOKEN_COOKIE } from "@/lib/mode";

/**
 * 路由守門：
 * - (app) 內任何頁面：沒有 daios_mode → 導回 "/"。
 * - daios_mode === "auth" 但沒有 daios_token → 導向 "/login"。
 * 依 nav.ts 命名，(app) 內所有頁面共用同一組路徑前綴清單。
 */

const APP_PATH_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/calendar",
  "/focus",
  "/notes",
  "/habits",
  "/body",
  "/nutrition",
  "/sleep",
  "/symptoms",
  "/meds",
  "/workouts",
  "/rehab",
  "/timeline",
  "/settings",
];

function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAppPath(pathname)) {
    return NextResponse.next();
  }

  const mode = request.cookies.get(MODE_COOKIE)?.value;

  if (mode !== "trial" && mode !== "auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (mode === "auth") {
    const token = request.cookies.get(TOKEN_COOKIE)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/focus/:path*",
    "/notes/:path*",
    "/habits/:path*",
    "/body/:path*",
    "/nutrition/:path*",
    "/sleep/:path*",
    "/symptoms/:path*",
    "/meds/:path*",
    "/workouts/:path*",
    "/rehab/:path*",
    "/timeline/:path*",
    "/settings/:path*",
  ],
};
