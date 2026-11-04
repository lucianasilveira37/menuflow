
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;

  const isRestaurantPanel =
    pathname === "/painel" || pathname.startsWith("/painel/");

  const isMaintenancePage = pathname === "/manutencao";

  if (isRestaurantPanel && !isMaintenancePage) {
    const { data, error } = await supabase.rpc(
      "get_public_platform_settings"
    );

    if (!error && data?.[0]?.maintenance_mode === true) {
      const maintenanceUrl = request.nextUrl.clone();
      maintenanceUrl.pathname = "/manutencao";
      maintenanceUrl.search = "";

      const response = NextResponse.redirect(maintenanceUrl);

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });

      return response;
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
