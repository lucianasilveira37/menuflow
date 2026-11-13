
import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServer } from "../lib/supabase-server";

async function SuperAdminAuth({
  children,
}: {
  children: ReactNode;
}) {
  await connection();

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

export default function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div>Verificando acesso...</div>}>
      <SuperAdminAuth>{children}</SuperAdminAuth>
    </Suspense>
  );
}
