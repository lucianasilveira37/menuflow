
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type StatusPagamento =
  | "Pago"
  | "Pendente"
  | "Atrasado"
  | "Falhou"
  | "Cancelado"
  | "Estornado";

type Pagamento = {
  id: string;
  empresa: string;
  plano: string;
  valor: number;
  vencimento: string | null;
  dataPagamento: string | null;
  forma: string;
  status: StatusPagamento;
  periodoInicio: string | null;
  periodoFim: string | null;
  criadoEm: string;
};

type FaturaBanco = {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  provider: string | null;
  created_at: string;
  subscription: {
    restaurant: {
      name: string;
    } | null;
    plan: {
      name: string;
    } | null;
  } | null;
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataFormatada(data: string | null) {
  if (!data) return "-";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
  });
}

function statusPagamento(
  status: string,
  vencimento: string | null
): StatusPagamento {
  if (status === "paid") return "Pago";
  if (status === "failed") return "Falhou";
  if (status === "canceled") return "Cancelado";
  if (status === "refunded") return "Estornado";

  if (
    status === "pending" &&
    vencimento &&
    new Date(vencimento).getTime() < Date.now()
  ) {
    return "Atrasado";
  }

  return "Pendente";
}

export default function FinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"Todos" | StatusPagamento>("Todos");
  const [selecionado, setSelecionado] = useState<Pagamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarFinanceiro() {
      setCarregando(true);
      setErro("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setErro("Faça login para acessar o financeiro.");
          return;
        }

        const { data: admin, error: adminError } = await supabase
          .from("platform_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminError || !admin) {
          setErro("Você não tem permissão para acessar o financeiro.");
          return;
        }

        const { data, error: faturasError } = await supabase
          .from("subscription_invoices")
          .select(`
            id,
            amount,
            status,
            due_date,
            paid_at,
            period_start,
            period_end,
            provider,
            created_at,
            subscription:restaurant_subscriptions!inner (
              restaurant:restaurants!inner (
                name
              ),
              plan:subscription_plans (
                name
              )
            )
          `)
          .order("created_at", { ascending: false });

        if (faturasError) {
          throw faturasError;
        }

        const faturas = (data ?? []) as unknown as FaturaBanco[];

        const resultado: Pagamento[] = faturas.map((fatura) => ({
          id: fatura.id,
          empresa:
            fatura.subscription?.restaurant?.name ?? "Restaurante não identificado",
          plano: fatura.subscription?.plan?.name ?? "Plano não identificado",
          valor: Number(fatura.amount || 0),
          vencimento: fatura.due_date,
          dataPagamento: fatura.paid_at,
          forma: fatura.provider || "Não informado",
          status: statusPagamento(fatura.status, fatura.due_date),
          periodoInicio: fatura.period_start,
          periodoFim: fatura.period_end,
          criadoEm: fatura.created_at,
        }));

        setPagamentos(resultado);
      } catch (error) {
        console.error("Erro ao carregar financeiro:", error);
        setErro("Não foi possível carregar as cobranças. Tente novamente.");
      } finally {
        setCarregando(false);
      }
    }

    carregarFinanceiro();
  }, []);

  const recebidos = pagamentos
    .filter((p) => p.status === "Pago")
    .reduce((total, p) => total + p.valor, 0);

  const pendentes = pagamentos
    .filter((p) => p.status === "Pendente")
    .reduce((total, p) => total + p.valor, 0);

  const atrasados = pagamentos
    .filter((p) => p.status === "Atrasado")
    .reduce((total, p) => total + p.valor, 0);

  const totalRecebidos = pagamentos.filter(
    (p) => p.status === "Pago"
  ).length;

  const filtrados = useMemo(() => {
    return pagamentos.filter((p) => {
      const correspondeBusca = p.empresa
        .toLowerCase()
        .includes(busca.toLowerCase());

      const correspondeFiltro =
        filtro === "Todos" || p.status === filtro;

      return correspondeBusca && correspondeFiltro;
    });
  }, [pagamentos, busca, filtro]);

  function corStatus(status: StatusPagamento) {
    if (status === "Pago") return "bg-green-100 text-green-700";
    if (status === "Pendente") return "bg-yellow-100 text-yellow-700";
    if (status === "Atrasado") return "bg-red-100 text-red-700";
    if (status === "Falhou") return "bg-orange-100 text-orange-700";
    if (status === "Estornado") return "bg-purple-100 text-purple-700";

    return "bg-slate-100 text-slate-700";
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
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="mt-2 text-sm text-slate-500">
            Acompanhe pagamentos, recebimentos e cobranças dos restaurantes.
          </p>
        </header>

        {erro && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total recebido</p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {moeda(recebidos)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pagamentos pendentes</p>
            <p className="mt-2 text-2xl font-bold text-yellow-600">
              {moeda(pendentes)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pagamentos atrasados</p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {moeda(atrasados)}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cobranças recebidas</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {totalRecebidos}
            </p>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Resumo financeiro</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Recebido</p>
              <p className="mt-1 text-xl font-bold text-green-600">
                {moeda(recebidos)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">A receber</p>
              <p className="mt-1 text-xl font-bold text-yellow-600">
                {moeda(pendentes)}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Em atraso</p>
              <p className="mt-1 text-xl font-bold text-red-600">
                {moeda(atrasados)}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold">
            Histórico de cobranças
          </h2>

          <div className="mb-5 rounded-2xl border bg-white p-5 shadow-sm">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar restaurante..."
              className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            />

            <div className="flex flex-wrap gap-2">
              {(
                [
                  "Todos",
                  "Pago",
                  "Pendente",
                  "Atrasado",
                  "Falhou",
                  "Cancelado",
                  "Estornado",
                ] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltro(status)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    filtro === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {carregando ? (
            <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
              Carregando financeiro...
            </div>
          ) : (
            <div className="space-y-4">
              {filtrados.map((p) => (
                <article
                  key={p.id}
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <h3 className="font-bold">{p.empresa}</h3>

                      <span
                        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${corStatus(p.status)}`}
                      >
                        {p.status}
                      </span>

                      <p className="mt-3 text-sm text-slate-500">
                        Plano: {p.plano}
                      </p>

                      <p className="text-sm text-slate-500">
                        Provedor: {p.forma}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Valor</p>
                      <p className="text-lg font-bold">{moeda(p.valor)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Vencimento</p>
                      <p className="font-semibold">
                        {dataFormatada(p.vencimento)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Pagamento: {dataFormatada(p.dataPagamento)}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelecionado(p)}
                      className="rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Detalhes
                    </button>
                  </div>
                </article>
              ))}

              {filtrados.length === 0 && (
                <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
                  Nenhuma cobrança encontrada.
                </div>
              )}
            </div>
          )}
        </section>

        {selecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Detalhes da cobrança
                </h2>

                <button
                  onClick={() => setSelecionado(null)}
                  className="text-2xl text-slate-400"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {[
                  ["Restaurante", selecionado.empresa],
                  ["Plano", selecionado.plano],
                  ["Valor", moeda(selecionado.valor)],
                  ["Provedor", selecionado.forma],
                  ["Vencimento", dataFormatada(selecionado.vencimento)],
                  ["Data do pagamento", dataFormatada(selecionado.dataPagamento)],
                  ["Início do período", dataFormatada(selecionado.periodoInicio)],
                  ["Fim do período", dataFormatada(selecionado.periodoFim)],
                  ["Situação", selecionado.status],
                ].map(([nome, valor]) => (
                  <div key={nome} className="border-b pb-2">
                    <p className="text-xs text-slate-500">{nome}</p>
                    <p className="text-sm font-semibold">{valor}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelecionado(null)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 border-t pt-5 text-xs text-slate-400">
          MenuFlow · Administração da plataforma
        </footer>
      </div>
    </main>
  );
}
