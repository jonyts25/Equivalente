import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from "@/lib/env";
import { getProfileByUserId, isValidUserRole } from "@/lib/auth/context";
import { roleHomePath } from "@/lib/auth/roles";
import type { UserRole } from "@/types/database";
import { authDebugLog } from "@/lib/auth/debug";

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/manifest.json", "/manifest.webmanifest"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith("/auth/"));
}

function roleHome(role: UserRole): string {
  return roleHomePath(role);
}

function pathAllowedForRole(pathname: string, role: UserRole): boolean {
  if (role === "admin") return pathname.startsWith("/admin") || pathname === "/";
  if (role === "nutritionist")
    return pathname.startsWith("/nutriologo") || pathname === "/";
  if (role === "patient") return pathname.startsWith("/paciente") || pathname === "/";
  return false;
}

function isDevAiApi(pathname: string): boolean {
  return pathname.startsWith("/api/ai/");
}

function isDevAiApiPublic(pathname: string): boolean {
  if (process.env.ENABLE_OLLAMA_DEV_API !== "true") return false;
  return pathname === "/api/ai/health" || pathname === "/api/ai/equivalente";
}

function isContextualAiApi(pathname: string): boolean {
  return (
    pathname === "/api/ai/equivalente/contextual" ||
    pathname === "/api/ai/equivalente/progress-analysis"
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isDevAiApi(pathname) && isDevAiApiPublic(pathname)) {
    return NextResponse.next();
  }

  if (!hasSupabaseConfig()) {
    if (isPublicPath(pathname)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath(pathname)) {
    if (user && pathname === "/login") {
      const { data: profile, error: profileError } = await getProfileByUserId(supabase, user.id);
      if (profileError) {
        authDebugLog("middleware:login-profile-error", {
          userId: user.id,
          email: user.email,
          profileError: profileError.message,
        });
      } else if (profile?.role && isValidUserRole(profile.role)) {
        return NextResponse.redirect(new URL(roleHomePath(profile.role), request.url));
      }
    }
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile, error: profileError } = await getProfileByUserId(supabase, user.id);

  if (profileError) {
    authDebugLog("middleware:profile-error", {
      userId: user.id,
      email: user.email,
      profileError: profileError.message,
    });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", encodeURIComponent(`Error al cargar perfil: ${profileError.message}`));
    return NextResponse.redirect(url);
  }

  const role = isValidUserRole(profile?.role) ? profile.role : undefined;

  if (!role) {
    authDebugLog("middleware:no-role", {
      userId: user.id,
      email: user.email,
      profile,
    });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "error",
      encodeURIComponent("Tu cuenta no tiene perfil configurado. Pide al administrador que asigne tu rol.")
    );
    return NextResponse.redirect(url);
  }

  if (isContextualAiApi(pathname)) {
    if (role === "patient") {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
    return supabaseResponse;
  }

  if (!pathAllowedForRole(pathname, role)) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
