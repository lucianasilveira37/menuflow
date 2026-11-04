
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Restaurante = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  is_open: boolean;
  is_suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  deleted_at: string | null;
  deletion_reason: string | null;
  created_at: string;
  city: string | null;
  state: string | null;
};

type Membership = {
  restaurant_id: string;
  user_id: string;
  role: string;
};

type Solicitacao = {
  user_id: string;
  contact_name: string;
  email: string;
  phone: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

type Empresa = {
  id: string;
  nome: string;
  slug: string;
  responsavel: string;
  email: string;
  telefone: string;
  endereco: string;
  cadastro: string;
  aprovacao: string;
  pagamento: string;
  assinatura: string;
  operacao: string;
  logo: string | null;
  descricao: string;
  motivoRejeicao: string | null;
  isSuspended: boolean;
  deletedAt: string | null;
  suspensionReason: string | null;
  deletionReason: string | null;
};

type Historico = {
  id: string;
  restaurant_id: string | null;
  restaurant_name: string;
  admin_user_id: string;
  action: string;
  reason: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AcaoAdmin =
  | "suspended"
  | "reactivated"
  | "subscription_canceled"
  | "deleted";

const supabaseAdmin = supabase as any;

function Status({ valor }: { valor: string }) {
  const cores: Record<string, string> = {
    Aprovada: "bg-green-100 text-green-700",
    Aprovado: "bg-green-100 text-green-700",
    Pendente: "bg-yellow-100 text-yellow-700",
    Rejeitada: "bg-red-100 text-red-700",
    Rejeitado: "bg-red-100 text-red-700",
    Ativa: "bg-blue-100 text-blue-700",
    Aberto: "bg-green-100 text-green-700",
    Fechado: "bg-slate-100 text-slate-600",
    Suspensa: "bg-orange-100 text-orange-700",
    Excluída: "bg-red-100 text-red-700",
    "Não configurado": "bg-slate-100 text-slate-500",
    "Não configurada": "bg-slate-100 text-slate-500",
    "Sem solicitação": "bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        cores[valor] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {valor}
    </span>
  );
}

function formatarData(data: string | null) {
  if (!data) return "Não informado";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

function formatarAprovacao(status?: string) {
  if (!status) return "Sem solicitação";

  const valor = status.toLowerCase();

  if (["approved", "aprovada", "aprovado"].includes(valor)) {
    return "Aprovada";
  }

  if (["rejected", "rejeitada", "rejeitado"].includes(valor)) {
    return "Rejeitada";
  }

  if (
    ["pending", "pendente", "em_analise", "under_review"].includes(valor)
  ) {
    return "Pendente";
  }

  return status;
}

function acaoLabel(acao: string) {
  const labels: Record<string, string> = {
    suspended: "Empresa suspensa",
    reactivated: "Empresa reativada",
    subscription_canceled: "Assinatura cancelada",
    deleted: "Empresa excluída",
  };

  return labels[acao] || acao;
}

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todas");

  const [empresaSelecionada, setEmpresaSelecionada] =
    useState<Empresa | null>(null);

  const [acaoSelecionada, setAcaoSelecionada] =
    useState<AcaoAdmin | null>(null);

  const [motivo, setMotivo] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const [historico, setHistorico] = useState<Historico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erroHistorico, setErroHistorico] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");

  // =========================================
  // CARREGAR EMPRESAS
  // =========================================

  const carregarEmpresas = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Você precisa estar autenticado.");
      }

      const { data: admin, error: adminError } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!admin) {
        throw new Error("Acesso permitido somente ao Super Admin.");
      }

      const { data: restaurantes, error: restaurantesError } =
        await supabase
          .from("restaurants")
          .select(`
            id,
            name,
            slug,
            description,
            phone,
            address,
            logo_url,
            is_open,
            is_suspended,
            suspended_at,
            suspension_reason,
            deleted_at,
            deletion_reason,
            created_at,
            city,
            state
          `)
          .order("created_at", { ascending: false });

      if (restaurantesError) throw restaurantesError;

      const { data: memberships, error: membershipsError } =
        await supabase
          .from("memberships")
          .select("restaurant_id, user_id, role");

      if (membershipsError) throw membershipsError;

      const vinculos = (memberships ?? []) as Membership[];

      const userIds = [...new Set(vinculos.map((m) => m.user_id))];

      let solicitacoes: Solicitacao[] = [];

      if (userIds.length > 0) {
        const { data, error: solicitacoesError } = await supabase
          .from("restaurant_requests")
          .select(`
            user_id,
            contact_name,
            email,
            phone,
            status,
            rejection_reason,
            created_at
          `)
          .in("user_id", userIds)
          .order("created_at", { ascending: false });

        if (solicitacoesError) throw solicitacoesError;

        solicitacoes = (data ?? []) as Solicitacao[];
      }

      const lista: Empresa[] = (restaurantes ?? []).map(
        (restaurante: Restaurante) => {
          const vinculosRestaurante = vinculos.filter(
            (m) => m.restaurant_id === restaurante.id
          );

          const responsavel =
            vinculosRestaurante.find((m) => m.role === "owner") ??
            vinculosRestaurante[0];

          const solicitacao = responsavel
            ? solicitacoes.find(
                (s) => s.user_id === responsavel.user_id
              )
            : undefined;

          let operacao = restaurante.is_open ? "Aberto" : "Fechado";

          if (restaurante.deleted_at) {
            operacao = "Excluída";
          } else if (restaurante.is_suspended) {
            operacao = "Suspensa";
          }

          return {
            id: restaurante.id,
            nome: restaurante.name,
            slug: restaurante.slug,
            responsavel: solicitacao?.contact_name || "Não informado",
            email: solicitacao?.email || "Não informado",
            telefone:
              solicitacao?.phone ||
              restaurante.phone ||
              "Não informado",
            endereco: [
              restaurante.address,
              restaurante.city,
              restaurante.state,
            ]
              .filter(Boolean)
              .join(" - ") || "Não informado",
            cadastro: formatarData(restaurante.created_at),
            aprovacao: formatarAprovacao(solicitacao?.status),
            pagamento: "Não configurado",
            assinatura: "Não configurada",
            operacao,
            logo: restaurante.logo_url,
            descricao: restaurante.description || "Sem descrição",
            motivoRejeicao: solicitacao?.rejection_reason || null,
            isSuspended: restaurante.is_suspended,
            deletedAt: restaurante.deleted_at,
            suspensionReason: restaurante.suspension_reason,
            deletionReason: restaurante.deletion_reason,
          };
        }
      );

      setEmpresas(lista);
    } catch (error: unknown) {
      console.error("Erro ao carregar empresas:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as empresas."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarEmpresas();
  }, [carregarEmpresas]);

  // =========================================
  // CARREGAR HISTÓRICO
  // =========================================

  const carregarHistorico = useCallback(async (restaurantId: string) => {
    setCarregandoHistorico(true);
    setErroHistorico("");

    try {
      const { data, error } = await supabase
        .from("restaurant_admin_history")
        .select(`
          id,
          restaurant_id,
          restaurant_name,
          admin_user_id,
          action,
          reason,
          details,
          created_at
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHistorico((data ?? []) as Historico[]);
    } catch (error: unknown) {
      console.error("Erro ao carregar histórico:", error);

      setHistorico([]);
      setErroHistorico(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o histórico."
      );
    } finally {
      setCarregandoHistorico(false);
    }
  }, []);

  function abrirDetalhes(empresa: Empresa) {
    setEmpresaSelecionada(empresa);
    setHistorico([]);
    carregarHistorico(empresa.id);
  }

  // =========================================
  // ABRIR AÇÃO ADMINISTRATIVA
  // =========================================

  function abrirAcao(acao: AcaoAdmin) {
    setAcaoSelecionada(acao);
    setMotivo("");
    setConfirmacao("");
    setErro("");
  }

  function fecharAcao() {
    if (processando) return;

    setAcaoSelecionada(null);
    setMotivo("");
    setConfirmacao("");
  }

  // =========================================
  // EXECUTAR AÇÕES NO SUPABASE
  // =========================================

  async function executarAcao() {
    if (!empresaSelecionada || !acaoSelecionada) return;

    if (motivo.trim().length < 5) {
      setErro("Informe um motivo com pelo menos 5 caracteres.");
      return;
    }

    if (
      acaoSelecionada === "deleted" &&
      confirmacao.trim() !== "EXCLUIR EMPRESA"
    ) {
      setErro('Digite exatamente "EXCLUIR EMPRESA" para confirmar.');
      return;
    }

    setProcessando(true);
    setErro("");
    setMensagem("");

    try {
      let resultado;

      const argumentos = {
        p_restaurant_id: empresaSelecionada.id,
        p_reason: motivo.trim(),
      };

      switch (acaoSelecionada) {
        case "suspended":
          resultado = await supabaseAdmin.rpc(
            "admin_suspend_restaurant",
            argumentos
          );
          break;

        case "reactivated":
          resultado = await supabaseAdmin.rpc(
            "admin_reactivate_restaurant",
            argumentos
          );
          break;

        case "subscription_canceled":
          resultado = await supabaseAdmin.rpc(
            "admin_cancel_restaurant_subscription",
            argumentos
          );
          break;

        case "deleted":
          resultado = await supabaseAdmin.rpc(
            "admin_delete_restaurant",
            {
              ...argumentos,
              p_confirmation: confirmacao.trim(),
            }
          );
          break;
      }

      if (resultado?.error) {
        throw resultado.error;
      }

      const mensagens: Record<AcaoAdmin, string> = {
        suspended: "Empresa suspensa com sucesso.",
        reactivated: "Empresa reativada com sucesso.",
        subscription_canceled: "Assinatura cancelada com sucesso.",
        deleted: "Empresa excluída com segurança.",
      };

      setMensagem(mensagens[acaoSelecionada]);

      setAcaoSelecionada(null);
      setEmpresaSelecionada(null);
      setMotivo("");
      setConfirmacao("");

      await carregarEmpresas();
    } catch (error: unknown) {
      console.error("Erro na ação administrativa:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível executar a operação."
      );
    } finally {
      setProcessando(false);
    }
  }

  // =========================================
  // FILTROS E CONTADORES
  // =========================================

  const empresasFiltradas = useMemo(() => {
    return empresas.filter((empresa) => {
      const termo = busca.toLowerCase();

      const correspondeBusca =
        empresa.nome.toLowerCase().includes(termo) ||
        empresa.email.toLowerCase().includes(termo) ||
        empresa.responsavel.toLowerCase().includes(termo);

      const correspondeFiltro =
        filtro === "Todas" ||
        empresa.aprovacao === filtro ||
        empresa.operacao === filtro;

      return correspondeBusca && correspondeFiltro;
    });
  }, [empresas, busca, filtro]);

  const aprovadas = empresas.filter(
    (e) => e.aprovacao === "Aprovada" && !e.deletedAt
  ).length;

  const pendentes = empresas.filter(
    (e) => e.aprovacao === "Pendente" && !e.deletedAt
  ).length;

  const rejeitadas = empresas.filter(
    (e) => e.aprovacao === "Rejeitada" && !e.deletedAt
  ).length;

  const suspensas = empresas.filter(
    (e) => e.isSuspended && !e.deletedAt
  ).length;

  const excluidas = empresas.filter(
    (e) => !!e.deletedAt
  ).length;

  const nomeAcao = acaoSelecionada
    ? {
        suspended: "Suspender empresa",
        reactivated: "Reativar empresa",
        subscription_canceled: "Cancelar assinatura",
        deleted: "Excluir empresa",
      }[acaoSelecionada]
    : "";

  // =========================================
  // TELA
  // =========================================

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl">

        <a
          href="/superadmin"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Voltar ao painel
        </a>

        <header className="mb-8 mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">
              Empresas cadastradas
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Gerencie empresas, assinaturas e ações administrativas.
            </p>
          </div>

          <button
            onClick={carregarEmpresas}
            disabled={carregando}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {carregando ? "Atualizando..." : "↻ Atualizar"}
          </button>
        </header>

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Erro:</strong> {erro}
          </div>
        )}

        {/* INDICADORES */}

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              titulo: "Total de empresas",
              valor: empresas.length,
              cor: "text-slate-800",
            },
            {
              titulo: "Aprovadas",
              valor: aprovadas,
              cor: "text-green-600",
            },
            {
              titulo: "Pendentes",
              valor: pendentes,
              cor: "text-yellow-600",
            },
            {
              titulo: "Suspensas",
              valor: suspensas,
              cor: "text-orange-600",
            },
            {
              titulo: "Excluídas",
              valor: excluidas,
              cor: "text-red-600",
            },
          ].map((item) => (
            <div
              key={item.titulo}
              className="rounded-2xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">
                {item.titulo}
              </p>

              <p className={`mt-2 text-3xl font-bold ${item.cor}`}>
                {item.valor}
              </p>
            </div>
          ))}
        </section>

        {/* LISTA DE EMPRESAS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row">
            <div>
              <h2 className="text-lg font-bold">
                Lista de empresas
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Dados carregados diretamente do Supabase.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Pesquisar empresa ou responsável..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500"
              />

              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="Todas">Todas as situações</option>
                <option value="Aprovada">Aprovadas</option>
                <option value="Pendente">Pendentes</option>
                <option value="Rejeitada">Rejeitadas</option>
                <option value="Aberto">Operação aberta</option>
                <option value="Fechado">Operação fechada</option>
                <option value="Suspensa">Suspensas</option>
                <option value="Excluída">Excluídas</option>
              </select>
            </div>
          </div>

          {carregando ? (
            <div className="py-16 text-center text-slate-500">
              Carregando empresas do Supabase...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Responsável</th>
                    <th className="p-4">Cadastro</th>
                    <th className="p-4">Aprovação</th>
                    <th className="p-4">Assinatura</th>
                    <th className="p-4">Operação</th>
                    <th className="p-4">Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {empresasFiltradas.map((empresa) => (
                    <tr
                      key={empresa.id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <p className="font-semibold">
                          {empresa.nome}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {empresa.slug}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-medium">
                          {empresa.responsavel}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {empresa.email}
                        </p>
                      </td>

                      <td className="p-4 text-slate-600">
                        {empresa.cadastro}
                      </td>

                      <td className="p-4">
                        <Status valor={empresa.aprovacao} />
                      </td>

                      <td className="p-4">
                        <Status valor={empresa.assinatura} />
                      </td>

                      <td className="p-4">
                        <Status valor={empresa.operacao} />
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => abrirDetalhes(empresa)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-100"
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {empresasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-slate-500"
                      >
                        Nenhuma empresa encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-5 text-xs text-slate-400">
            Exibindo {empresasFiltradas.length} de {empresas.length} empresas.
          </p>
        </section>

        {/* DETALHES DA EMPRESA */}

        {empresaSelecionada && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    Gerenciar empresa
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {empresaSelecionada.nome}
                  </p>
                </div>

                <button
                  onClick={() => setEmpresaSelecionada(null)}
                  className="text-2xl text-slate-400 hover:text-slate-700"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">

                {[
                  ["Empresa", empresaSelecionada.nome],
                  ["ID", empresaSelecionada.id],
                  ["Slug", empresaSelecionada.slug],
                  ["Responsável", empresaSelecionada.responsavel],
                  ["E-mail", empresaSelecionada.email],
                  ["Telefone", empresaSelecionada.telefone],
                  ["Endereço", empresaSelecionada.endereco],
                  ["Data do cadastro", empresaSelecionada.cadastro],
                  ["Descrição", empresaSelecionada.descricao],
                ].map(([nome, valor]) => (
                  <div
                    key={nome}
                    className="border-b border-slate-100 pb-3"
                  >
                    <p className="text-xs text-slate-500">
                      {nome}
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold">
                      {valor}
                    </p>
                  </div>
                ))}

                <div className="flex flex-wrap gap-3 pt-2">
                  <div>
                    <p className="mb-2 text-xs text-slate-500">
                      Aprovação
                    </p>
                    <Status valor={empresaSelecionada.aprovacao} />
                  </div>

                  <div>
                    <p className="mb-2 text-xs text-slate-500">
                      Operação
                    </p>
                    <Status valor={empresaSelecionada.operacao} />
                  </div>
                </div>

                {empresaSelecionada.suspensionReason && (
                  <div className="rounded-xl bg-orange-50 p-3">
                    <p className="text-xs font-semibold text-orange-700">
                      Motivo da suspensão
                    </p>
                    <p className="mt-1 text-sm text-orange-700">
                      {empresaSelecionada.suspensionReason}
                    </p>
                  </div>
                )}

                {empresaSelecionada.deletionReason && (
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-700">
                      Motivo da exclusão
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      {empresaSelecionada.deletionReason}
                    </p>
                  </div>
                )}

                {empresaSelecionada.motivoRejeicao && (
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-700">
                      Motivo da rejeição
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      {empresaSelecionada.motivoRejeicao}
                    </p>
                  </div>
                )}
              </div>

              {/* AÇÕES ADMINISTRATIVAS */}

              <div className="mt-7 border-t pt-5">
                <h3 className="mb-3 font-bold">
                  Ações administrativas
                </h3>

                {empresaSelecionada.deletedAt ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Esta empresa está excluída logicamente. Os dados históricos foram preservados e as ações administrativas estão bloqueadas.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {empresaSelecionada.isSuspended ? (
                      <button
                        onClick={() => abrirAcao("reactivated")}
                        className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        Reativar empresa
                      </button>
                    ) : (
                      <button
                        onClick={() => abrirAcao("suspended")}
                        className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600"
                      >
                        Suspender empresa
                      </button>
                    )}

                    <button
                      onClick={() =>
                        abrirAcao("subscription_canceled")
                      }
                      className="rounded-xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-white hover:bg-yellow-600"
                    >
                      Cancelar assinatura
                    </button>

                    <button
                      onClick={() => abrirAcao("deleted")}
                      className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 sm:col-span-2"
                    >
                      Excluir empresa
                    </button>
                  </div>
                )}
              </div>

              {/* HISTÓRICO */}

              <div className="mt-8 border-t pt-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">
                    Histórico administrativo
                  </h3>

                  <button
                    onClick={() =>
                      carregarHistorico(empresaSelecionada.id)
                    }
                    disabled={carregandoHistorico}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Atualizar histórico
                  </button>
                </div>

                {carregandoHistorico ? (
                  <p className="py-5 text-center text-sm text-slate-500">
                    Carregando histórico...
                  </p>
                ) : erroHistorico ? (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {erroHistorico}
                  </div>
                ) : historico.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Nenhuma ação administrativa registrada para esta empresa.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historico.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col justify-between gap-2 sm:flex-row">
                          <p className="text-sm font-bold">
                            {acaoLabel(item.action)}
                          </p>

                          <p className="text-xs text-slate-400">
                            {formatarDataHora(item.created_at)}
                          </p>
                        </div>

                        <p className="mt-2 text-sm text-slate-600">
                          <strong>Motivo:</strong> {item.reason}
                        </p>

                        <p className="mt-2 break-all text-xs text-slate-400">
                          Administrador: {item.admin_user_id}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => setEmpresaSelecionada(null)}
                className="mt-7 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Fechar detalhes
              </button>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DAS AÇÕES */}

        {acaoSelecionada && empresaSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

              <h2 className="text-xl font-bold">
                {nomeAcao}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Empresa:{" "}
                <strong className="text-slate-800">
                  {empresaSelecionada.nome}
                </strong>
              </p>

              {acaoSelecionada === "deleted" && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <strong>Atenção!</strong>

                  <p className="mt-2">
                    A empresa será marcada como excluída e perderá o acesso.
                    Os pedidos e pagamentos existentes serão preservados.
                    Esta ação não poderá ser desfeita por esta tela.
                  </p>
                </div>
              )}

              {acaoSelecionada === "subscription_canceled" && (
                <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  A assinatura será marcada como cancelada imediatamente no
                  MenuFlow. Isso não cancela automaticamente uma cobrança
                  recorrente no provedor de pagamento.
                </div>
              )}

              <label className="mt-5 block text-sm font-semibold">
                Motivo da operação
              </label>

              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={4}
                placeholder="Descreva o motivo desta operação..."
                disabled={processando}
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
              />

              {acaoSelecionada === "deleted" && (
                <>
                  <label className="mt-4 block text-sm font-semibold text-red-700">
                    Digite EXCLUIR EMPRESA para confirmar
                  </label>

                  <input
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    placeholder="EXCLUIR EMPRESA"
                    disabled={processando}
                    className="mt-2 w-full rounded-xl border border-red-200 p-3 text-sm outline-none focus:border-red-500 disabled:bg-slate-100"
                  />
                </>
              )}

              {erro && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  onClick={fecharAcao}
                  disabled={processando}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Voltar
                </button>

                <button
                  onClick={executarAcao}
                  disabled={
                    processando ||
                    motivo.trim().length < 5 ||
                    (acaoSelecionada === "deleted" &&
                      confirmacao.trim() !== "EXCLUIR EMPRESA")
                  }
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    acaoSelecionada === "deleted"
                      ? "bg-red-600 hover:bg-red-700"
                      : acaoSelecionada === "suspended"
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {processando ? "Processando..." : "Confirmar operação"}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-xs text-slate-400">
          MenuFlow · Administração da plataforma
        </footer>
      </div>
    </main>
  );
}
