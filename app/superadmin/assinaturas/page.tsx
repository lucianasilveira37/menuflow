
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Plano = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  is_active: boolean;
};

type Assinatura = {
  id: string;
  restaurant_id: string;
  plan_id: string | null;
  status: string;
  billing_cycle: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  restaurants: { name: string } | null;
  subscription_plans: {
    name: string;
    monthly_price: number;
    annual_price: number;
  } | null;
  subscription_invoices: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    due_date: string | null;
    paid_at: string | null;
    created_at: string;
  }[];
};

type Cobranca = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  subscription_id: string;
  restaurantName: string;
};

function moeda(valor: number, currency = "BRL") {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency,
  });
}

function dataFormatada(data: string | null) {
  if (!data) return "Não informado";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    trialing: "Teste grátis",
    active: "Ativa",
    awaiting_payment: "Aguardando pagamento",
    overdue: "Vencida",
    canceled: "Cancelada",
    pending: "Pendente",
    paid: "Pago",
    failed: "Falhou",
    refunded: "Estornado",
  };

  return labels[status] || status;
}

function statusCor(status: string) {
  const cores: Record<string, string> = {
    trialing: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    awaiting_payment: "bg-yellow-100 text-yellow-700",
    overdue: "bg-red-100 text-red-700",
    canceled: "bg-slate-100 text-slate-600",
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-purple-100 text-purple-700",
  };

  return cores[status] || "bg-slate-100 text-slate-600";
}

function cicloLabel(ciclo: string | null) {
  if (ciclo === "monthly") return "Mensal";
  if (ciclo === "annual") return "Anual";
  return "Não definido";
}

export default function AssinaturasPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const [aba, setAba] = useState<"assinaturas" | "cobrancas">(
    "assinaturas"
  );

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregarDados = useCallback(async () => {
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
        throw new Error(
          "Acesso permitido somente para administradores da plataforma."
        );
      }

      const [planosResult, assinaturasResult] = await Promise.all([
        supabase
          .from("subscription_plans")
          .select(
            "id, code, name, description, monthly_price, annual_price, is_active"
          )
          .order("monthly_price", { ascending: true }),

        supabase
          .from("restaurant_subscriptions")
          .select(`
            id,
            restaurant_id,
            plan_id,
            status,
            billing_cycle,
            trial_started_at,
            trial_ends_at,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            created_at,
            restaurants (
              name
            ),
            subscription_plans (
              name,
              monthly_price,
              annual_price
            ),
            subscription_invoices (
              id,
              amount,
              currency,
              status,
              due_date,
              paid_at,
              created_at
            )
          `)
          .order("created_at", { ascending: false }),
      ]);

      if (planosResult.error) throw planosResult.error;
      if (assinaturasResult.error) throw assinaturasResult.error;

      const listaPlanos = (planosResult.data || []) as Plano[];
      const listaAssinaturas = (assinaturasResult.data || []) as unknown as Assinatura[];

      setPlanos(listaPlanos);
      setAssinaturas(listaAssinaturas);

      const listaCobrancas: Cobranca[] = [];

      listaAssinaturas.forEach((assinatura) => {
        (assinatura.subscription_invoices || []).forEach((cobranca) => {
          listaCobrancas.push({
            ...cobranca,
            subscription_id: assinatura.id,
            restaurantName:
              assinatura.restaurants?.name || "Restaurante não identificado",
          });
        });
      });

      listaCobrancas.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setCobrancas(listaCobrancas);
    } catch (error: unknown) {
      console.error("Erro ao carregar assinaturas:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os dados."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const ativas = assinaturas.filter(
    (a) => a.status === "active"
  ).length;

  const testes = assinaturas.filter(
    (a) => a.status === "trialing"
  ).length;

  const vencidas = assinaturas.filter(
    (a) => a.status === "overdue"
  ).length;

  const aguardando = assinaturas.filter(
    (a) => a.status === "awaiting_payment"
  ).length;

  const filtradas = useMemo(() => {
    return assinaturas.filter((a) => {
      const nome = a.restaurants?.name || "";

      const correspondeBusca = nome
        .toLowerCase()
        .includes(busca.toLowerCase());

      const correspondeStatus =
        filtro === "Todas" || a.status === filtro;

      return correspondeBusca && correspondeStatus;
    });
  }, [assinaturas, busca, filtro]);

  const cobrancasFiltradas = useMemo(() => {
    return cobrancas.filter((c) =>
      c.restaurantName.toLowerCase().includes(busca.toLowerCase())
    );
  }, [cobrancas, busca]);

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
            <h1 className="text-3xl font-bold">Assinaturas</h1>
            <p className="mt-2 text-sm text-slate-500">
              Gerencie os planos e acompanhe as assinaturas dos restaurantes.
            </p>
          </div>

          <button
            onClick={carregarDados}
            disabled={carregando}
            className="rounded-xl border bg-white px-5 py-3 text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {carregando ? "Atualizando..." : "Atualizar dados"}
          </button>
        </header>

        {erro && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {carregando ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">
            Carregando informações do Supabase...
          </div>
        ) : (
          <>
            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  titulo: "Assinaturas ativas",
                  numero: ativas,
                  cor: "text-green-600",
                },
                {
                  titulo: "Em teste grátis",
                  numero: testes,
                  cor: "text-blue-600",
                },
                {
                  titulo: "Vencidas",
                  numero: vencidas,
                  cor: "text-red-600",
                },
                {
                  titulo: "Aguardando pagamento",
                  numero: aguardando,
                  cor: "text-yellow-600",
                },
              ].map((card) => (
                <div
                  key={card.titulo}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <p className="text-sm text-slate-500">
                    {card.titulo}
                  </p>
                  <p className={`mt-2 text-3xl font-bold ${card.cor}`}>
                    {card.numero}
                  </p>
                </div>
              ))}
            </section>

            <section className="mb-9">
              <h2 className="mb-4 text-xl font-bold">
                Planos disponíveis
              </h2>

              {planos.length === 0 ? (
                <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500">
                  Nenhum plano cadastrado.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {planos.map((plano) => (
                    <article
                      key={plano.id}
                      className="rounded-2xl border bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold">
                          {plano.name}
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            plano.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {plano.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        {plano.description || "Sem descrição."}
                      </p>

                      <div className="mt-5">
                        <p className="text-sm text-slate-500">
                          Mensal
                        </p>
                        <p className="text-2xl font-bold">
                          {moeda(plano.monthly_price)}
                        </p>
                      </div>

                      <div className="mt-4 border-t pt-4">
                        <p className="text-sm text-slate-500">
                          Anual
                        </p>
                        <p className="text-xl font-bold text-blue-700">
                          {moeda(plano.annual_price)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="mb-9 rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h2 className="text-lg font-bold text-blue-900">
                Período de teste grátis
              </h2>

              <p className="mt-2 text-sm text-blue-800">
                Cada restaurante aprovado pode iniciar um período de
                teste grátis de 7 dias, contado a partir da aprovação.
              </p>

              <div className="mt-4 rounded-xl bg-white p-4">
                <p className="text-xs text-slate-500">
                  Duração do teste
                </p>
                <p className="mt-1 text-2xl font-bold">7 dias</p>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-xl font-bold">
                Gestão financeira
              </h2>

              <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar restaurante..."
                  className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />

                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setAba("assinaturas")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      aba === "assinaturas"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Assinaturas
                  </button>

                  <button
                    onClick={() => setAba("cobrancas")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                      aba === "cobrancas"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Histórico de cobranças
                  </button>
                </div>

                {aba === "assinaturas" && (
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Todas", value: "Todas" },
                      { label: "Teste grátis", value: "trialing" },
                      { label: "Ativa", value: "active" },
                      { label: "Vencida", value: "overdue" },
                      {
                        label: "Aguardando pagamento",
                        value: "awaiting_payment",
                      },
                      { label: "Cancelada", value: "canceled" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setFiltro(item.value)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          filtro === item.value
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {aba === "assinaturas" ? (
                <div className="space-y-4">
                  {filtradas.map((item) => {
                    const valor =
                      item.billing_cycle === "annual"
                        ? item.subscription_plans?.annual_price
                        : item.subscription_plans?.monthly_price;

                    return (
                      <article
                        key={item.id}
                        className="rounded-2xl border bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                          <div>
                            <h3 className="font-bold">
                              {item.restaurants?.name ||
                                "Restaurante não identificado"}
                            </h3>

                            <span
                              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusCor(
                                item.status
                              )}`}
                            >
                              {statusLabel(item.status)}
                            </span>

                            <p className="mt-3 text-sm text-slate-500">
                              Plano:{" "}
                              {item.subscription_plans?.name ||
                                "Não contratado"}
                            </p>

                            <p className="text-sm text-slate-500">
                              Ciclo: {cicloLabel(item.billing_cycle)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Valor do plano
                            </p>
                            <p className="font-bold">
                              {valor != null
                                ? moeda(valor)
                                : "Não definido"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Início do teste
                            </p>
                            <p className="font-bold">
                              {dataFormatada(item.trial_started_at)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-400">
                              Fim do teste
                            </p>
                            <p className="font-bold">
                              {dataFormatada(item.trial_ends_at)}
                            </p>
                          </div>
                        </div>

                        {item.current_period_end && (
                          <p className="mt-4 border-t pt-3 text-sm text-slate-500">
                            Próximo vencimento do período:{" "}
                            <strong>
                              {dataFormatada(item.current_period_end)}
                            </strong>
                          </p>
                        )}

                        {item.cancel_at_period_end && (
                          <p className="mt-3 text-sm font-medium text-orange-600">
                            Cancelamento programado para o fim do período.
                          </p>
                        )}
                      </article>
                    );
                  })}

                  {filtradas.length === 0 && (
                    <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
                      Nenhuma assinatura encontrada.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {cobrancasFiltradas.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                          <h3 className="font-bold">
                            {item.restaurantName}
                          </h3>
                          <span
                            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusCor(
                              item.status
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Valor
                          </p>
                          <p className="font-bold">
                            {moeda(item.amount, item.currency)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Vencimento
                          </p>
                          <p className="font-bold">
                            {dataFormatada(item.due_date)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">
                            Pagamento
                          </p>
                          <p className="font-bold">
                            {dataFormatada(item.paid_at)}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}

                  {cobrancasFiltradas.length === 0 && (
                    <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
                      Nenhuma cobrança registrada.
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="mt-8 border-t pt-5 text-xs text-slate-400">
          MenuFlow · Administração da plataforma
        </footer>
      </div>
    </main>
  );
}
