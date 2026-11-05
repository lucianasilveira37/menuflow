
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

type Subscription = {
  status: string
  trial_started_at: string | null
  trial_ends_at: string | null
  current_period_end: string | null
}

type Restaurant = {
  id: string
  name: string
}

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
  {
    title: 'Financeiro',
    description: 'Controle despesas e acompanhe os gastos do restaurante.',
    href: '/painel/financeiro',
    icon: '💰',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Assinatura e Planos',
    description: 'Consulte seu plano, período grátis e cobranças.',
    href: '/painel/assinatura',
    icon: '⭐',
    color: 'bg-indigo-50 text-indigo-700',
  },
]

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getDaysRemaining(date: string) {
  const end = new Date(date).getTime()
  const now = Date.now()

  return Math.max(0, Math.ceil((end - now) / 86400000))
}

export default function DashboardPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [subscription, setSubscription] =
    useState<Subscription | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Faça login novamente para acessar o painel.')
      }

      // Identifica o restaurante do proprietário.
      const { data: membership, error: membershipError } =
        await supabase
          .from('memberships')
          .select('restaurant_id')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

      if (membershipError) {
        throw new Error(membershipError.message)
      }

      if (!membership) {
        throw new Error(
          'Não encontramos um restaurante vinculado à sua conta.'
        )
      }

      const restaurantId = membership.restaurant_id

      // Busca o nome do restaurante.
      const { data: restaurantData, error: restaurantError } =
        await supabase
          .from('restaurants')
          .select('id, name')
          .eq('id', restaurantId)
          .single()

      if (restaurantError) {
        throw new Error(restaurantError.message)
      }

      setRestaurant(restaurantData as Restaurant)

      // Busca a assinatura mais recente do restaurante.
      const { data: subscriptionData, error: subscriptionError } =
        await supabase
          .from('restaurant_subscriptions')
          .select(
            'status, trial_started_at, trial_ends_at, current_period_end'
          )
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (subscriptionError) {
        throw new Error(subscriptionError.message)
      }

      setSubscription(
        (subscriptionData as Subscription | null) || null
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o painel.'
      )
    } finally {
      setLoading(false)
    }
  }

  const isTrial = subscription?.status === 'trialing'
  const hasTrialEnd = Boolean(subscription?.trial_ends_at)

  const daysRemaining =
    isTrial && hasTrialEnd
      ? getDaysRemaining(subscription!.trial_ends_at!)
      : null

  const trialExpired =
    isTrial && daysRemaining === 0

  const showFiveDayAlert =
    isTrial &&
    daysRemaining !== null &&
    daysRemaining > 1 &&
    daysRemaining <= 5

  const showOneDayAlert =
    isTrial &&
    daysRemaining === 1

  const showExpiredAlert =
    trialExpired

  const showTrialAlert =
    isTrial && hasTrialEnd

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
              {(restaurant?.name || 'L').charAt(0).toUpperCase()}
            </div>

            <div>
              <p className="text-sm font-semibold">
                {restaurant?.name || 'Minha loja'}
              </p>
              <p className="text-xs text-slate-500">
                Painel do restaurante
              </p>
            </div>
          </div>
        </header>

        {/* ERRO */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CARREGAMENTO */}
        {loading && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Carregando informações da assinatura...
          </div>
        )}

        {/* AVISO DO TESTE GRÁTIS */}
        {!loading && showTrialAlert && (
          <section
            className={`mb-8 rounded-2xl border p-5 shadow-sm md:p-6 ${
              showExpiredAlert
                ? 'border-red-200 bg-red-50'
                : showOneDayAlert
                  ? 'border-orange-300 bg-orange-50'
                  : showFiveDayAlert
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                  {showExpiredAlert
                    ? '⏰'
                    : showOneDayAlert
                      ? '⚠️'
                      : '🎉'}
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Período de teste grátis
                  </span>

                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    {showExpiredAlert
                      ? 'Seu período gratuito terminou'
                      : showOneDayAlert
                        ? 'Seu teste grátis termina amanhã!'
                        : showFiveDayAlert
                          ? `Faltam ${daysRemaining} dias para terminar seu teste`
                          : 'Seu restaurante está em período gratuito'}
                  </h3>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    {showExpiredAlert
                      ? 'Seu período de teste chegou ao fim. Consulte nossos planos para continuar com sua assinatura.'
                      : showOneDayAlert
                        ? 'Escolha um plano para continuar aproveitando todos os recursos do MenuFlow.'
                        : showFiveDayAlert
                          ? 'Conheça nossos planos e escolha o melhor para seu restaurante antes do fim do período gratuito.'
                          : 'Aproveite os recursos do MenuFlow durante seu período gratuito. Você pode conhecer os planos quando quiser.'}
                  </p>

                  {subscription?.trial_ends_at && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      {showExpiredAlert
                        ? 'Seu teste terminou em: '
                        : 'Data de término: '}
                      {formatDate(subscription.trial_ends_at)}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href="/painel/assinatura"
                  className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white transition md:w-auto ${
                    showExpiredAlert
                      ? 'bg-red-600 hover:bg-red-700'
                      : showOneDayAlert
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Ver planos e contratar →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* PAGAMENTO PENDENTE */}
        {!loading && subscription?.status === 'awaiting_payment' && (
          <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Sua assinatura aguarda pagamento
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Consulte os detalhes da cobrança e acompanhe a confirmação do pagamento.
                </p>
              </div>

              <Link
                href="/painel/assinatura"
                className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-700"
              >
                Consultar cobrança →
              </Link>
            </div>
          </section>
        )}

        {/* ASSINATURA ATIVA */}
        {!loading && subscription?.status === 'active' && (
          <section className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h3 className="text-lg font-bold text-emerald-900">
                  Sua assinatura está ativa!
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Seu restaurante está com a assinatura regularizada.
                  {subscription.current_period_end &&
                    ` Próximo vencimento: ${formatDate(subscription.current_period_end)}.`}
                </p>
              </div>

              <Link
                href="/painel/assinatura"
                className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                Minha assinatura →
              </Link>
            </div>
          </section>
        )}

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
            <h3 className="text-lg font-bold">
              Gerencie seu restaurante
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Escolha uma área para começar.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {menuItems
              .filter((item) => item.title !== 'Visão geral')
              .map((item) => (
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
