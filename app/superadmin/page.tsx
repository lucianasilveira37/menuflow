
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const menu = [
  { id: "inicio", label: "Visão geral", icon: "▦" },
  { id: "empresas", label: "Empresas", icon: "▣" },
  { id: "solicitacoes", label: "Solicitações", icon: "◷" },
  { id: "assinaturas", label: "Assinaturas", icon: "▤" },
  { id: "financeiro", label: "Financeiro", icon: "R$" },
  { id: "configuracoes", label: "Configurações", icon: "⚙" },
];

const indicadores = [
  { titulo: "Empresas cadastradas", valor: "0", detalhe: "Total de empresas", icon: "▣" },
  { titulo: "Aguardando aprovação", valor: "0", detalhe: "Solicitações pendentes", icon: "◷" },
  { titulo: "Assinaturas ativas", valor: "0", detalhe: "Planos em funcionamento", icon: "▤" },
  { titulo: "Pagamentos pendentes", valor: "0", detalhe: "Aguardando confirmação", icon: "R$" },
];

export default function SuperAdminPage() {
  const router = useRouter();
  const [aba, setAba] = useState("inicio");

  const titulo = menu.find((item) => item.id === aba)?.label ?? "Visão geral";

  function navegar(itemId: string) {
    if (itemId === "empresas") {
      router.push("/superadmin/empresas");
      return;
    }
    if (itemId === "solicitacoes") {
  router.push("/superadmin/solicitacoes");
  return;
}
    if (itemId === "assinaturas") {
  router.push("/superadmin/assinaturas");
  return;
}
if (itemId === "financeiro") {
  router.push("/superadmin/financeiro");
  return;
}

if (itemId === "configuracoes") {
  router.push("/superadmin/configuracoes");
  return;
}
    setAba(itemId);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 md:flex">
      <aside className="w-full bg-[#111827] p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight">
            Menu<span className="text-blue-400">Flow</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">Painel do Superadministrador</p>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Administração
        </p>

        <nav className="space-y-2">
          {menu.map((item) => (
            <button
              key={item.id}
              onClick={() => navegar(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                aba === item.id
                  ? "bg-blue-600 font-semibold text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-sm font-semibold">Área administrativa</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Controle central da plataforma MenuFlow.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">MenuFlow / Superadministrador</p>
            <h2 className="mt-1 text-2xl font-bold">{titulo}</h2>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              S
            </div>
            <div>
              <p className="text-sm font-semibold">Superadministrador</p>
              <p className="text-xs text-slate-500">Área da plataforma</p>
            </div>
          </div>
        </header>

        {aba === "inicio" && (
          <>
            <div className="mb-7">
              <h3 className="text-lg font-bold">Visão geral</h3>
              <p className="mt-1 text-sm text-slate-500">
                Acompanhe os principais indicadores da plataforma.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {indicadores.map((item) => (
                <div key={item.titulo} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.titulo}</p>
                    <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-600">
                      {item.icon}
                    </span>
                  </div>
                  <p className="mt-5 text-3xl font-bold">{item.valor}</p>
                  <p className="mt-2 text-xs text-slate-400">{item.detalhe}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold">Acesso e aprovação</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Acompanhe as etapas de liberação das empresas.
                </p>
                <div className="mt-6 space-y-4">
                  {[
                    ["Aprovação da empresa", "Pendente / Aprovada"],
                    ["Situação do pagamento", "Pendente / Pago / Atrasado"],
                    ["Situação da assinatura", "Teste / Ativa / Vencida / Cancelada"],
                  ].map(([nome, descricao]) => (
                    <div key={nome} className="rounded-xl bg-slate-50 p-4">
                      <p className="text-sm font-semibold">{nome}</p>
                      <p className="mt-1 text-xs text-slate-500">{descricao}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold">Atividades recentes</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Eventos administrativos aparecerão aqui.
                </p>
                <div className="mt-8 flex min-h-40 flex-col items-center justify-center text-center">
                  <span className="text-3xl text-slate-300">◷</span>
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    Nenhuma atividade registrada.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    O histórico será integrado posteriormente.
                  </p>
                </div>
              </section>
            </div>
          </>
        )}

        {aba !== "inicio" && (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-xl font-bold">{titulo}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Este módulo será implementado em uma próxima etapa, com integração segura ao banco de dados.
            </p>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Painel administrativo · Versão inicial
        </footer>
      </main>
    </div>
  );
}
