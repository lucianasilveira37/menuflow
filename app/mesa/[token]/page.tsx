import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import PublicMenu from "../../cardapio/[slug]/PublicMenu";
import { supabase } from "../../lib/supabase";

type Props = {
  params: Promise<{ token: string }>;
};

async function MesaContent({ params }: Props) {
 const { token } = await params;
await connection();

  const { data, error } = await supabase.rpc(
    "get_public_table_info",
    { p_table_token: token }
  );

  if (error || !data?.restaurant_slug) {
    notFound();
  }

  return (
    <>
      <div className="bg-orange-600 px-4 py-3 text-center text-white">
        <p className="font-semibold">{data.table_name}</p>
        <p className="text-sm">
          Faça seu pedido pela mesa
        </p>
      </div>

      <PublicMenu
        slug={data.restaurant_slug}
        tableToken={token}
      />
    </>
  );
}

export default function MesaPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-center">
          Carregando mesa...
        </div>
      }
    >
      <MesaContent params={params} />
    </Suspense>
  );
}
