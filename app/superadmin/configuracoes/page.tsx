
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Plano = {
  id: string;
  code: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  is_active: boolean;
};

type Configuracoes = {
  id: string;
  platform_name: string;
  platform_description: string;
  support_email: string;
  support_phone: string;
  website: string;
  trial_days: number;
  announcement: string;
  announcement_active: boolean;
  maintenance_mode: boolean;
};

const configuracaoInicial: Configuracoes = {
  id: "global",
  platform_name: "MenuFlow",
  platform_description: "Sistema completo de gestão para restaurantes.",
  support_email: "suporte@menuflow.com.br",
  support_phone: "",
  website: "",
  trial_days: 7,
  announcement: "",
  announcement_active: false,
  maintenance_mode: false,
};

function moeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes>(configuracaoInicial);
  const [planos, setPlanos] = useState<Plano[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    async function carregarConfiguracoes() {
      setCarregando(true);
      setErro("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setErro("Faça login para acessar as configurações.");
          return;
        }

        const { data: admin, error: adminError } = await supabase
          .from("platform_admins")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminError || !admin) {
          setErro("Você não tem permissão para acessar esta página.");
          return;
        }

        const { data: configuracao, error: configError } = await supabase
          .from("platform_settings")
          .select("*")
          .eq("id", "global")
          .maybeSingle();

        if (configError) throw configError;

        if (configuracao) {
          setConfig(configuracao as Configuracoes);
        }

        const { data: dadosPlanos, error: planosError } = await supabase
          .from("subscription_plans")
          .select("id, code, name, monthly_price, annual_price, is_active")
          .order("monthly_price", { ascending: true });

        if (planosError) throw planosError;

        setPlanos((dadosPlanos ?? []) as Plano[]);
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        setErro("Não foi possível carregar as configurações.");
      } finally {
        setCarregando(false);
      }
    }

    carregarConfiguracoes();
  }, []);

  function atualizarConfig(
    campo: keyof Configuracoes,
    valor: string | number | boolean
  ) {
    setConfig((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  function atualizarPlano(
    id: string,
    campo: "monthly_price" | "annual_price",
    valor: string
  ) {
    setPlanos((anteriores) =>
      anteriores.map((plano) =>
        plano.id === id
          ? {
              ...plano,
              [campo]: valor === "" ? 0 : Number(valor),
            }
          : plano
      )
    );
  }

  async function salvarConfiguracoes() {
    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sua sessão expirou. Faça login novamente.");
      }

      const { data: admin, error: adminError } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminError || !admin) {
        throw new Error("Você não tem permissão para salvar configurações.");
      }

      if (
        !config.platform_name.trim() ||
        !config.support_email.trim()
      ) {
        throw new Error("Preencha o nome da plataforma e o e-mail de suporte.");
      }

      if (
        !Number.isInteger(Number(config.trial_days)) ||
        config.trial_days < 0 ||
        config.trial_days > 365
      ) {
        throw new Error("O teste grátis deve ter entre 0 e 365 dias.");
      }

      for (const plano of planos) {
        if (
          !Number.isFinite(Number(plano.monthly_price)) ||
          !Number.isFinite(Number(plano.annual_price)) ||
          Number(plano.monthly_price) < 0 ||
          Number(plano.annual_price) < 0
        ) {
          throw new Error(`Verifique os valores do plano ${plano.name}.`);
        }
      }

      const { error: configError } = await supabase
        .from("platform_settings")
        .upsert(
          {
            id: "global",
            platform_name: config.platform_name.trim(),
            platform_description: config.platform_description,
            support_email: config.support_email.trim(),
            support_phone: config.support_phone,
            website: config.website,
            trial_days: Number(config.trial_days),
            announcement: config.announcement,
            announcement_active: config.announcement_active,
            maintenance_mode: config.maintenance_mode,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (configError) throw configError;

      for (const plano of planos) {
        const { error: planoError } = await supabase
          .from("subscription_plans")
          .update({
            monthly_price: Number(plano.monthly_price),
            annual_price: Number(plano.annual_price),
            updated_at: new Date().toISOString(),
          })
          .eq("id", plano.id);

        if (planoError) {
          throw new Error(
            `Erro ao atualizar o plano ${plano.name}: ${planoError.message}`
          );
        }
      }

      setMensagem("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-10 text-center text-slate-500">
          Carregando configurações...
        </div>
      </main>
    );
  }

  if (erro && planos.length === 0 && !config.platform_name) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-6 text-red-700">
          {erro}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-5 text-slate-800 md:p-8">
      <div className="mx-auto max-w-5xl">
        <a
          href="/superadmin"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Voltar ao painel
        </a>

        <header className="mb-8 mt-5">
          <h1 className="text-3xl font-bold">Configurações gerais</h1>
          <p className="mt-2 text-sm text-slate-500">
            Administre a identidade, os planos e as configurações do MenuFlow.
          </p>
        </header>

        {erro && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {erro}
          </div>
        )}

        {mensagem && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
            {mensagem}
          </div>
        )}

        {/* IDENTIDADE */}

        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Identidade da plataforma</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Informações principais do MenuFlow.
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Nome da plataforma
              </label>
              <input
                value={config.platform_name}
                onChange={(e) =>
                  atualizarConfig("platform_name", e.target.value)
                }
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Descrição
              </label>
              <textarea
                value={config.platform_description}
                onChange={(e) =>
                  atualizarConfig("platform_description", e.target.value)
                }
                rows={3}
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* CONTATO */}

        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Contato e suporte</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Canais de atendimento da plataforma.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                E-mail de suporte
              </label>
              <input
                type="email"
                value={config.support_email}
                onChange={(e) =>
                  atualizarConfig("support_email", e.target.value)
                }
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Telefone / WhatsApp
              </label>
              <input
                value={config.support_phone}
                onChange={(e) =>
                  atualizarConfig("support_phone", e.target.value)
                }
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Site
              </label>
              <input
                value={config.website}
                onChange={(e) =>
                  atualizarConfig("website", e.target.value)
                }
                className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* PLANOS */}

        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Configuração dos planos</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Os valores serão atualizados na tabela de planos de assinatura.
          </p>

          {planos.length === 0 ? (
            <p className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
              Nenhum plano foi encontrado na tabela subscription_plans.
            </p>
          ) : (
            <div className="space-y-5">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <h3 className="mb-4 font-bold">{plano.name}</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Valor mensal (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plano.monthly_price}
                        onChange={(e) =>
                          atualizarPlano(
                            plano.id,
                            "monthly_price",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {moeda(plano.monthly_price)}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Valor anual (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={plano.annual_price}
                        onChange={(e) =>
                          atualizarPlano(
                            plano.id,
                            "annual_price",
                            e.target.value
                          )
                        }
                        className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {moeda(plano.annual_price)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* TESTE GRÁTIS */}

        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Período de teste grátis</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Duração do período de avaliação para novas empresas.
          </p>

          <div className="max-w-sm">
            <label className="mb-2 block text-sm font-semibold">
              Quantidade de dias
            </label>

            <input
              type="number"
              min="0"
              max="365"
              value={config.trial_days}
              onChange={(e) =>
                atualizarConfig(
                  "trial_days",
                  Number(e.target.value)
                )
              }
              className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Configuração atual: {config.trial_days} dias de teste.
            </p>
          </div>
        </section>

        {/* AVISOS */}

        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Avisos da plataforma</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Configure um comunicado geral para os usuários.
          </p>

          <label className="mb-2 block text-sm font-semibold">
            Mensagem do aviso
          </label>

          <textarea
            value={config.announcement}
            onChange={(e) =>
              atualizarConfig("announcement", e.target.value)
            }
            rows={4}
            placeholder="Digite aqui um comunicado..."
            className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
          />

          <label className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.announcement_active}
              onChange={(e) =>
                atualizarConfig("announcement_active", e.target.checked)
              }
              className="h-5 w-5"
            />
            <span className="text-sm font-semibold">
              Ativar aviso
            </span>
          </label>

          {config.announcement_active && config.announcement.trim() && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="mb-1 text-xs font-bold text-blue-700">
                PRÉVIA DO AVISO
              </p>
              <p className="text-sm text-blue-900">
                {config.announcement}
              </p>
            </div>
          )}
        </section>

        {/* MANUTENÇÃO */}

        <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Modo de manutenção</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            Controle o estado de manutenção da plataforma.
          </p>

          <div className="flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">Manutenção do sistema</p>
              <p className="mt-1 text-sm text-slate-500">
                {config.maintenance_mode
                  ? "Modo de manutenção marcado como ativo."
                  : "Plataforma marcada como disponível."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                atualizarConfig(
                  "maintenance_mode",
                  !config.maintenance_mode
                )
              }
              className={`rounded-xl px-5 py-3 text-sm font-semibold text-white ${
                config.maintenance_mode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {config.maintenance_mode
                ? "Desativar manutenção"
                : "Ativar manutenção"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            O estado é salvo no banco. A aplicação do bloqueio geral
            nas demais páginas precisa ser implementada separadamente.
          </p>
        </section>

        {/* SALVAR */}

        <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center">
          <div>
            <p className="font-bold">Salvar configurações</p>
            <p className="mt-1 text-sm text-slate-500">
              As alterações serão gravadas no Supabase.
            </p>
          </div>

          <button
            onClick={salvarConfiguracoes}
            disabled={salvando}
            className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>

        <footer className="mt-8 border-t pt-5 text-xs text-slate-400">
          MenuFlow · Administração da plataforma
        </footer>
      </div>
    </main>
  );
}
