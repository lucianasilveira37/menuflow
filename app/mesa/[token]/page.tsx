
import { notFound } from "next/navigation";
import PublicMenu from "../../cardapio/[slug]/PublicMenu";
import { supabase } from "../../lib/supabase";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function MesaPage({ params }: Props) {
  const { token } = await params;

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
