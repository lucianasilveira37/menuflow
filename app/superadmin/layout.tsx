
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "../lib/supabase-server";

export const instant = false;

export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/painel");
  }

  return <>{children}</>;
}
