import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Run next-intl first to get locale-aware response
  const response = intlMiddleware(request);

  // Refresh Supabase session on every request (required for SSR auth)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /[locale]/admin — only admins
  const isAdminRoute = /^\/(cs|sk)\/admin(\/|$)/.test(pathname);
  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL(`/${pathname.split("/")[1]}/auth/login`, request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL(`/${pathname.split("/")[1]}`, request.url));
    }
  }

  // Protect /[locale]/oblibene — must be logged in
  const isFavoritesRoute = /^\/(cs|sk)\/oblibene(\/|$)/.test(pathname);
  if (isFavoritesRoute && !user) {
    const loginUrl = new URL(`/${pathname.split("/")[1]}/auth/login`, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|api|.*\\..*).*)"],
};
