
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Status = "Pendente" | "Aprovada" | "Recusada";

type Solicitacao = {
  id: string;
  userId: string;
  empresa: string;
  responsavel: string;
  email: string;
  telefone: string;
  data: string;
  status: Status;
  motivoRecusa?: string;
};

type SolicitacaoBanco = {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

function formatarData(data: string) {
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function converterSolicitacao(item: SolicitacaoBanco): Solicitacao {
  const statusMap: Record<SolicitacaoBanco["status"], Status> = {
    pending: "Pendente",
    approved: "Aprovada",
    rejected: "Recusada",
  };

  return {
    id: item.id,
    userId: item.user_id,
    empresa: item.business_name,
    responsavel: item.contact_name,
    email: item.email,
    telefone: item.phone,
    data: formatarData(item.created_at),
    status: statusMap[item.status],
    motivoRecusa: item.rejection_reason ?? undefined,
  };
}

export default function SolicitacoesPage() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"Todas" | Status>("Todas");
  const [selecionada, setSelecionada] = useState<Solicitacao | null>(null);
  const [recusando, setRecusando] = useState<Solicitacao | null>(null);
  const [motivo, setMotivo] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const carregarSolicitacoes = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const { data, error } = await supabase
        .from("restaurant_requests")
        .select(`
          id,
          user_id,
          business_name,
          contact_name,
          email,
          phone,
          status,
          rejection_reason,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar solicitações:", error);
        setErro("Não foi possível carregar as solicitações.");
        return;
      }

      const registros = (data ?? []) as SolicitacaoBanco[];

      setSolicitacoes(registros.map(converterSolicitacao));
    } catch (error) {
      console.error("Erro inesperado:", error);
      setErro("Ocorreu um erro ao consultar as solicitações.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const pendentes = solicitacoes.filter(
    (item) => item.status === "Pendente"
  ).length;

  const aprovadas = solicitacoes.filter(
    (item) => item.status === "Aprovada"
  ).length;

  const recusadas = solicitacoes.filter(
    (item) => item.status === "Recusada"
  ).length;

  const filtradas = useMemo(() => {
    return solicitacoes.filter((item) => {
      const correspondeBusca =
        item.empresa.toLowerCase().includes(busca.toLowerCase()) ||
        item.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
        item.email.toLowerCase().includes(busca.toLowerCase());

      const correspondeFiltro =
        filtro === "Todas" || item.status === filtro;

      return correspondeBusca && correspondeFiltro;
    });
  }, [solicitacoes, busca, filtro]);

  async function aprovar(item: Solicitacao) {
    const confirmar = window.confirm(
      `Deseja realmente aprovar o cadastro de ${item.empresa}? O restaurante e o acesso do proprietário serão criados.`
    );

    if (!confirmar) return;

    setProcessandoId(item.id);
    setErro("");

    try {
      const { error } = await supabase.rpc(
        "approve_restaurant_request",
        {
          request_id: item.id,
        }
      );

      if (error) {
        console.error("Erro ao aprovar solicitação:", error);
        setErro(error.message || "Não foi possível aprovar a solicitação.");
        return;
      }

      setSelecionada(null);

      await carregarSolicitacoes();

      alert("Solicitação aprovada! O restaurante e o acesso do proprietário foram criados.");
    } catch (error) {
      console.error("Erro inesperado na aprovação:", error);
      setErro("Ocorreu um erro ao aprovar a solicitação.");
    } finally {
      setProcessandoId(null);
    }
  }

  function abrirRecusa(item: Solicitacao) {
    setSelecionada(null);
    setRecusando(item);
    setMotivo("");
    setErro("");
  }

  async function confirmarRecusa() {
    if (!recusando || !motivo.trim()) {
      setErro("Informe o motivo da recusa.");
      return;
    }

    setProcessandoId(recusando.id);
    setErro("");

    try {
      const { error } = await supabase.rpc(
        "reject_restaurant_request",
        {
          request_id: recusando.id,
          rejection_message: motivo.trim(),
        }
      );

      if (error) {
        console.error("Erro ao recusar solicitação:", error);
        setErro(error.message || "Não foi possível recusar a solicitação.");
        return;
      }

      setRecusando(null);
      setMotivo("");

      await carregarSolicitacoes();

      alert("Solicitação recusada com sucesso.");
    } catch (error) {
      console.error("Erro inesperado na recusa:", error);
      setErro("Ocorreu um erro ao recusar a solicitação.");
    } finally {
      setProcessandoId(null);
    }
  }

  function corStatus(status: Status) {
    if (status === "Aprovada") {
      return "bg-green-100 text-green-700";
    }

    if (status === "Recusada") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">

        <a
          href="/superadmin"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Voltar ao painel
        </a>

        <header className="mb-8 mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">
                Solicitações de cadastro
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Analise, aprove ou recuse os pedidos de cadastro.
              </p>
            </div>

            <button
              onClick={carregarSolicitacoes}
              disabled={carregando}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {carregando ? "Atualizando..." : "Atualizar lista"}
            </button>
          </div>
        </header>

        {/* Mensagem de erro */}

        {erro && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {/* Indicadores */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendentes</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {pendentes}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Aprovadas</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {aprovadas}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Recusadas</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {recusadas}
            </p>
          </div>
        </section>

        {/* Pesquisa e filtros */}

        <section className="mb-6 rounded-2xl border bg-white p-5 shadow-sm">
          <input
            type="text"
            placeholder="Pesquisar empresa, responsável ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <div className="flex flex-wrap gap-2">
            {(["Todas", "Pendente", "Aprovada", "Recusada"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFiltro(status)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    filtro === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              )
            )}
          </div>
        </section>

        {/* Lista */}

        <section className="space-y-4">
          {carregando && (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <p className="font-semibold">Carregando solicitações...</p>
            </div>
          )}

          {!carregando && filtradas.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600">
                    {item.empresa.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{item.empresa}</h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${corStatus(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {item.responsavel}
                    </p>

                    <p className="text-sm text-slate-500">
                      {item.email}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.telefone}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Data da solicitação</p>
                  <p className="text-sm font-semibold">{item.data}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelecionada(item)}
                    className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Detalhes
                  </button>

                  {item.status === "Pendente" && (
                    <>
                      <button
                        onClick={() => aprovar(item)}
                        disabled={processandoId === item.id}
                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {processandoId === item.id ? "Aguarde..." : "Aprovar"}
                      </button>

                      <button
                        onClick={() => abrirRecusa(item)}
                        disabled={processandoId === item.id}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Recusar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {item.status === "Recusada" && item.motivoRecusa && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  <strong>Motivo da recusa:</strong> {item.motivoRecusa}
                </div>
              )}
            </article>
          ))}

          {!carregando && filtradas.length === 0 && (
            <div className="rounded-2xl border bg-white p-12 text-center">
              <p className="font-semibold">
                Nenhuma solicitação encontrada.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Tente alterar a pesquisa ou o filtro.
              </p>
            </div>
          )}
        </section>

        {/* Modal de detalhes */}

        {selecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Detalhes da solicitação
                </h2>

                <button
                  onClick={() => setSelecionada(null)}
                  className="text-2xl text-slate-400"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {[
                  ["Empresa", selecionada.empresa],
                  ["Responsável", selecionada.responsavel],
                  ["E-mail", selecionada.email],
                  ["Telefone", selecionada.telefone],
                  ["Data", selecionada.data],
                  ["Situação", selecionada.status],
                  ["ID da solicitação", selecionada.id],
                ].map(([nome, valor]) => (
                  <div key={nome} className="border-b pb-2">
                    <p className="text-xs text-slate-500">{nome}</p>
                    <p className="break-all text-sm font-semibold">{valor}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {selecionada.status === "Pendente" && (
                  <>
                    <button
                      onClick={() => abrirRecusa(selecionada)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Recusar
                    </button>

                    <button
                      onClick={() => aprovar(selecionada)}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Aprovar
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelecionada(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de recusa */}

        {recusando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-xl font-bold">
                Recusar solicitação
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Empresa: {recusando.empresa}
              </p>

              <label className="mt-5 block text-sm font-semibold">
                Motivo da recusa
              </label>

              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Informe o motivo da recusa..."
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500"
              />

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setRecusando(null);
                    setErro("");
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmarRecusa}
                  disabled={!motivo.trim() || processandoId === recusando.id}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {processandoId === recusando.id
                    ? "Aguarde..."
                    : "Confirmar recusa"}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Administração da plataforma
        </footer>
      </div>
    </main>
  );
}
