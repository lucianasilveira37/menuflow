
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabase";

type Comanda = {
  id: string;
  status: "open" | "close_requested" | "closed";
  created_at: string;
  close_requested_at: string | null;
  closed_at: string | null;
};

type Mesa = {
  id: string;
  name: string;
  qr_token: string;
  is_active: boolean;
  created_at: string;
  table_tabs: Comanda[] | null;
};

export default function MesasPage() {
  const router = useRouter();

  const [restaurantId, setRestaurantId] = useState("");
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [nomeMesa, setNomeMesa] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [mesaQR, setMesaQR] = useState<Mesa | null>(null);
  const [imagemQR, setImagemQR] = useState("");

  const [editandoId, setEditandoId] = useState("");
  const [novoNome, setNovoNome] = useState("");

  const carregarMesas = useCallback(async (id: string) => {
    setCarregando(true);
    setErro("");

    const { data, error } = await supabase
      .from("restaurant_tables")
      .select(`
        id,
        name,
        qr_token,
        is_active,
        created_at,
        table_tabs (
          id,
          status,
          created_at,
          close_requested_at,
          closed_at
        )
      `)
      .eq("restaurant_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      setErro("Não foi possível carregar as mesas: " + error.message);
      setCarregando(false);
      return;
    }

    setMesas((data || []) as Mesa[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!ativo) return;

      if (authError || !authData.user) {
        router.replace("/");
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("memberships")
          .select("restaurant_id")
          .eq("user_id", authData.user.id)
          .in("role", ["owner", "admin", "staff"])
          .limit(1)
          .maybeSingle();

      if (!ativo) return;

      if (membershipError || !membership) {
        setErro("Não encontramos um restaurante vinculado a esta conta.");
        setCarregando(false);
        return;
      }

      setRestaurantId(membership.restaurant_id);
      await carregarMesas(membership.restaurant_id);
    }

    iniciar();

    return () => {
      ativo = false;
    };
  }, [router, carregarMesas]);

  async function adicionarMesa(e: React.FormEvent) {
    e.preventDefault();

    if (!restaurantId || !nomeMesa.trim()) return;

    setSalvando(true);
    setErro("");
    setSucesso("");

    const { error } = await supabase
      .from("restaurant_tables")
      .insert({
        restaurant_id: restaurantId,
        name: nomeMesa.trim(),
      });

    if (error) {
      setErro("Erro ao cadastrar mesa: " + error.message);
    } else {
      setNomeMesa("");
      setSucesso("Mesa cadastrada com sucesso!");
      await carregarMesas(restaurantId);
    }

    setSalvando(false);
  }

  async function alternarAtivacao(mesa: Mesa) {
    setErro("");
    setSucesso("");

    const { error } = await supabase
      .from("restaurant_tables")
      .update({ is_active: !mesa.is_active })
      .eq("id", mesa.id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      setErro("Não foi possível atualizar a mesa: " + error.message);
      return;
    }

    setSucesso(
      mesa.is_active
        ? "Mesa desativada."
        : "Mesa ativada com sucesso!"
    );

    await carregarMesas(restaurantId);
  }

  async function salvarNome(mesa: Mesa) {
    if (!novoNome.trim()) {
      setErro("Informe o nome da mesa.");
      return;
    }

    const { error } = await supabase
      .from("restaurant_tables")
      .update({ name: novoNome.trim() })
      .eq("id", mesa.id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      setErro("Erro ao renomear mesa: " + error.message);
      return;
    }

    setEditandoId("");
    setNovoNome("");
    setSucesso("Nome atualizado com sucesso!");

    await carregarMesas(restaurantId);
  }

  async function abrirQR(mesa: Mesa) {
    const endereco =
      `${window.location.origin}/mesa/${mesa.qr_token}`;

    try {
      const imagem = await QRCode.toDataURL(endereco, {
        width: 320,
        margin: 2,
      });

      setMesaQR(mesa);
      setImagemQR(imagem);
    } catch {
      setErro("Não foi possível gerar o QR Code.");
    }
  }

  async function copiarLink(mesa: Mesa) {
    const endereco =
      `${window.location.origin}/mesa/${mesa.qr_token}`;

    try {
      await navigator.clipboard.writeText(endereco);
      setSucesso("Link da mesa copiado!");
    } catch {
      setErro("Não foi possível copiar o link.");
    }
  }

  async function fecharComanda(comanda: Comanda) {
    const confirmar = window.confirm(
      "Confirma o fechamento desta comanda?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("table_tabs")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", comanda.id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      setErro("Não foi possível fechar a comanda: " + error.message);
      return;
    }

    setSucesso("Comanda fechada com sucesso!");
    await carregarMesas(restaurantId);
  }

  function obterStatus(mesa: Mesa) {
    if (!mesa.is_active) return "Inativa";

    const comandasAtivas = (mesa.table_tabs || []).filter(
      (comanda) =>
        comanda.status === "open" ||
        comanda.status === "close_requested"
    );

    if (
      comandasAtivas.some(
        (comanda) => comanda.status === "close_requested"
      )
    ) {
      return "Aguardando fechamento";
    }

    if (comandasAtivas.length > 0) return "Ocupada";

    return "Livre";
  }

  function dataFormatada(data: string) {
    return new Date(data).toLocaleString("pt-BR");
  }

  const totalOcupadas = mesas.filter(
    (mesa) => obterStatus(mesa) === "Ocupada"
  ).length;

  const totalLivres = mesas.filter(
    (mesa) => obterStatus(mesa) === "Livre"
  ).length;

  const totalAguardando = mesas.filter(
    (mesa) => obterStatus(mesa) === "Aguardando fechamento"
  ).length;

  if (carregando) {
    return (
      <main className="p-8">
        <p>Carregando mesas...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gerenciamento de Mesas
          </h1>

          <p className="mt-2 text-gray-600">
            Cadastre mesas, gerencie QR Codes e acompanhe comandas.
          </p>
        </div>

        {erro && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mb-4 rounded-lg bg-green-100 p-4 text-green-700">
            {sucesso}
          </div>
        )}

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total de mesas</p>
            <p className="mt-2 text-3xl font-bold">{mesas.length}</p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Livres</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {totalLivres}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Ocupadas</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {totalOcupadas}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Aguardando fechamento</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {totalAguardando}
            </p>
          </div>
        </div>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Cadastrar nova mesa
          </h2>

          <form
            onSubmit={adicionarMesa}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={nomeMesa}
              onChange={(e) => setNomeMesa(e.target.value)}
              placeholder="Ex.: Mesa 01, Varanda, Mesa 05..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-orange-500"
              required
            />

            <button
              type="submit"
              disabled={salvando || !restaurantId}
              className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {salvando ? "Cadastrando..." : "+ Cadastrar mesa"}
            </button>
          </form>

          <p className="mt-3 text-sm text-gray-500">
            O QR Code será criado automaticamente pelo banco de dados.
          </p>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Mesas cadastradas
            </h2>

            <button
              onClick={() => carregarMesas(restaurantId)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-100"
            >
              Atualizar
            </button>
          </div>

          {mesas.length === 0 ? (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold">
                Nenhuma mesa cadastrada
              </p>
              <p className="mt-2 text-gray-500">
                Cadastre sua primeira mesa para gerar o QR Code.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {mesas.map((mesa) => {
                const comandasAtivas = (mesa.table_tabs || []).filter(
                  (comanda) =>
                    comanda.status === "open" ||
                    comanda.status === "close_requested"
                );

                const status = obterStatus(mesa);

                return (
                  <div
                    key={mesa.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {editandoId === mesa.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              value={novoNome}
                              onChange={(e) => setNovoNome(e.target.value)}
                              className="w-full rounded border p-2"
                            />

                            <div className="flex gap-2">
                              <button
                                onClick={() => salvarNome(mesa)}
                                className="text-sm font-semibold text-green-700"
                              >
                                Salvar
                              </button>

                              <button
                                onClick={() => setEditandoId("")}
                                className="text-sm text-gray-500"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h3 className="truncate text-xl font-bold">
                              {mesa.name}
                            </h3>

                            <button
                              onClick={() => {
                                setEditandoId(mesa.id);
                                setNovoNome(mesa.name);
                              }}
                              className="mt-1 text-sm text-blue-600 hover:underline"
                            >
                              Renomear mesa
                            </button>
                          </>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          status === "Livre"
                            ? "bg-green-100 text-green-700"
                            : status === "Ocupada"
                            ? "bg-orange-100 text-orange-700"
                            : status === "Inativa"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mb-4 rounded-lg bg-gray-50 p-3">
                      <p className="text-sm text-gray-500">
                        Comandas ativas
                      </p>

                      <p className="text-2xl font-bold">
                        {comandasAtivas.length}
                      </p>
                    </div>

                    {comandasAtivas.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {comandasAtivas.map((comanda) => (
                          <div
                            key={comanda.id}
                            className="rounded-lg border p-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">
                                  {comanda.status === "open"
                                    ? "Comanda aberta"
                                    : "Fechamento solicitado"}
                                </p>

                                <p className="text-xs text-gray-500">
                                  {dataFormatada(comanda.created_at)}
                                </p>
                              </div>

                              {comanda.status === "close_requested" && (
                                <button
                                  onClick={() => fecharComanda(comanda)}
                                  className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                >
                                  Fechar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-4">
                      <button
                        onClick={() => abrirQR(mesa)}
                        disabled={!mesa.is_active}
                        className="w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Ver QR Code
                      </button>

                      <button
                        onClick={() => copiarLink(mesa)}
                        disabled={!mesa.is_active}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
                      >
                        Copiar link da mesa
                      </button>

                      <button
                        onClick={() => alternarAtivacao(mesa)}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold ${
                          mesa.is_active
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {mesa.is_active ? "Desativar mesa" : "Ativar mesa"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {mesaQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
              <h2 className="text-2xl font-bold">
                {mesaQR.name}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                QR Code para pedidos pela mesa
              </p>

              {imagemQR && (
                <img
                  src={imagemQR}
                  alt={`QR Code da ${mesaQR.name}`}
                  className="mx-auto my-5 w-64"
                />
              )}

              <p className="mb-4 break-all text-xs text-gray-500">
                {window.location.origin}/mesa/{mesaQR.qr_token}
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href={imagemQR}
                  download={`qrcode-${mesaQR.name.replace(/\s+/g, "-")}.png`}
                  className="rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white hover:bg-orange-700"
                >
                  Baixar QR Code
                </a>

                <a
                  href={`/mesa/${mesaQR.qr_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-300 px-4 py-3 font-semibold hover:bg-gray-50"
                >
                  Abrir página pública
                </a>

                <button
                  onClick={() => {
                    setMesaQR(null);
                    setImagemQR("");
                  }}
                  className="rounded-lg bg-gray-100 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
