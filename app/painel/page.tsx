
'use client'

import Link from 'next/link'

const menuItems = [
  {
    title: 'Visão geral',
    description: 'Acesse os principais recursos do seu restaurante.',
    href: '/painel',
    icon: '▦',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    title: 'Produtos',
    description: 'Cadastre, edite preços e organize seus produtos.',
    href: '/painel/produtos',
    icon: '🍕',
    color: 'bg-orange-50 text-orange-700',
  },
  {
    title: 'Categorias',
    description: 'Organize seu cardápio por categorias.',
    href: '/painel/categorias',
    icon: '▤',
    color: 'bg-violet-50 text-violet-700',
  },
  {
    title: 'Pedidos',
    description: 'Visualize e gerencie os pedidos recebidos.',
    href: '/painel/pedidos',
    icon: '🧾',
    color: 'bg-emerald-50 text-emerald-700',
    destaque: true,
  },
  {
    title: 'Mesas',
    description: 'Acompanhe mesas, comandas e contas.',
    href: '/painel/mesas',
    icon: '🪑',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    title: 'Loja',
    description: 'Configure os dados e o funcionamento da loja.',
    href: '/painel/loja',
    icon: '🏪',
    color: 'bg-sky-50 text-sky-700',
  },
]

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 md:flex">

      {/* MENU LATERAL */}
      <aside className="w-full bg-[#111827] p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight">
            Menu<span className="text-blue-400">Flow</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Painel do restaurante
          </p>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gerenciamento
        </p>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                item.title === 'Visão geral'
                  ? 'bg-blue-600 font-semibold text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="mt-10 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-sm font-semibold">Seu restaurante</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Gerencie seu cardápio, pedidos, mesas e configurações em um só lugar.
          </p>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="min-w-0 flex-1 p-5 md:p-8">

        {/* CABEÇALHO */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              MenuFlow / Painel do restaurante
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              Visão geral
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Bem-vindo! Aqui você encontra tudo para gerenciar sua loja.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
              L
            </div>
            <div>
              <p className="text-sm font-semibold">Minha loja</p>
              <p className="text-xs text-slate-500">Painel do restaurante</p>
            </div>
          </div>
        </header>

        {/* BOAS-VINDAS */}
        <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white shadow-sm md:p-8">
          <p className="text-sm font-medium text-blue-100">
            Bem-vindo ao MenuFlow
          </p>
          <h3 className="mt-2 text-2xl font-bold md:text-3xl">
            Seu restaurante, sob controle.
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
            Gerencie seu cardápio, acompanhe pedidos e organize o atendimento
            de maneira simples e prática.
          </p>
          <Link
            href="/painel/pedidos"
            className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Acessar pedidos →
          </Link>
        </section>

        {/* MÓDULOS */}
        <section>
          <div className="mb-5">
            <h3 className="text-lg font-bold">Gerencie seu restaurante</h3>
            <p className="mt-1 text-sm text-slate-500">
              Escolha uma área para começar.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {menuItems.filter((item) => item.title !== 'Visão geral').map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md ${
                  item.destaque
                    ? 'border-blue-200 ring-1 ring-blue-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${item.color}`}>
                    {item.icon}
                  </div>
                  <span className="text-lg text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600">
                    →
                  </span>
                </div>

                <h4 className="mt-5 text-lg font-bold">
                  {item.title}
                </h4>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <p className="mt-5 text-sm font-semibold text-blue-600">
                  Acessar módulo →
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* RODAPÉ */}
        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Painel do restaurante
        </footer>
      </main>
    </div>
  )
}
