
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Plan = {
  id: string
  code: string
  name: string
  description: string | null
  monthly_price: number
  annual_price: number
  is_active: boolean
}

type Subscription = {
  id: string
  plan_id: string | null
  status: string
  billing_cycle: string | null
  trial_ends_at: string | null
  current_period_end: string | null
}

type Invoice = {
  id: string
  status: string
  amount: number
  payment_method: string | null
  created_at: string
}

export default function AssinaturaPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  const [selectedPlan, setSelectedPlan] = useState('')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card'>('pix')

  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      // 1. Verifica o usuário autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError

      if (!user) {
        throw new Error('Faça login para acessar sua assinatura.')
      }

      // 2. Busca os planos ativos
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, code, name, description, monthly_price, annual_price, is_active')
        .eq('is_active', true)
        .order('monthly_price', { ascending: true })

      if (plansError) throw plansError

      setPlans(plansData || [])

      // 3. Identifica o restaurante pela função segura do Supabase
      const {
        data: restaurantId,
        error: restaurantError,
      } = await supabase.rpc('restaurant_get_my_restaurant_id')

      if (restaurantError) throw restaurantError

      if (!restaurantId) {
        throw new Error(
          'Nenhum restaurante foi encontrado para esta conta. Confira se você entrou com o usuário proprietário.'
        )
      }

      // 4. Busca a assinatura do restaurante
      const { data: subscriptionData, error: subscriptionError } =
        await supabase
          .from('restaurant_subscriptions')
          .select(
            'id, plan_id, status, billing_cycle, trial_ends_at, current_period_end'
          )
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

      if (subscriptionError) throw subscriptionError

      setSubscription(subscriptionData)

      if (subscriptionData?.plan_id) {
        setSelectedPlan(subscriptionData.plan_id)
      } else {
        setSelectedPlan('')
      }

      if (subscriptionData?.billing_cycle === 'annual') {
        setBillingCycle('annual')
      } else {
        setBillingCycle('monthly')
      }

      // 5. Busca qualquer cobrança pendente dessa assinatura
      setInvoice(null)

      if (subscriptionData) {
        const { data: invoiceData, error: invoiceError } =
          await supabase
            .from('subscription_invoices')
            .select('id, status, amount, payment_method, created_at')
            .eq('subscription_id', subscriptionData.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (invoiceError) throw invoiceError

        setInvoice(invoiceData)
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados da assinatura.'

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  async function requestSubscription() {
    if (!selectedPlan) {
      setError('Escolha um plano antes de continuar.')
      return
    }

    if (invoice?.status === 'pending') {
      setError('Você já possui uma cobrança aguardando confirmação.')
      return
    }

    setRequesting(true)
    setError('')
    setMessage('')

    try {
      const { data, error: requestError } = await supabase.rpc(
        'restaurant_request_subscription',
        {
          p_plan_id: selectedPlan,
          p_billing_cycle: billingCycle,
          p_payment_method: paymentMethod,
        }
      )

      if (requestError) throw requestError

      setMessage(
        data?.message ||
          'Solicitação registrada! Aguarde a confirmação do pagamento pelo administrador.'
      )

      await loadData()
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Não foi possível solicitar a contratação.'

      setError(errorMessage)
    } finally {
      setRequesting(false)
    }
  }

  function money(value: number) {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      trialing: 'Em período de teste',
      active: 'Assinatura ativa',
      awaiting_payment: 'Aguardando pagamento',
      overdue: 'Pagamento em atraso',
      canceled: 'Cancelada',
    }

    return labels[status] || status
  }

  const currentPlan = plans.find(
    plan => plan.id === subscription?.plan_id
  )

  const chosenPlan = plans.find(
    plan => plan.id === selectedPlan
  )

  const hasPendingInvoice = invoice?.status === 'pending'

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">
          Carregando planos e assinatura...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <Link
            href="/painel"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Voltar ao painel
          </Link>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Assinatura e Planos
          </h1>

          <p className="mt-2 text-gray-600">
            Consulte sua assinatura e escolha o plano ideal para seu restaurante.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        {subscription && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Sua assinatura atual
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Plano</p>
                <p className="font-semibold text-gray-900">
                  {currentPlan?.name || 'Ainda não contratado'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Situação</p>
                <p className="font-semibold text-gray-900">
                  {statusLabel(subscription.status)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  {subscription.status === 'trialing'
                    ? 'Fim do teste grátis'
                    : 'Fim do período atual'}
                </p>

                <p className="font-semibold text-gray-900">
                  {subscription.trial_ends_at ||
                  subscription.current_period_end
                    ? new Date(
                        subscription.trial_ends_at ||
                          subscription.current_period_end!
                      ).toLocaleDateString('pt-BR')
                    : 'Não informado'}
                </p>
              </div>
            </div>
          </section>
        )}

        {hasPendingInvoice && (
          <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">
              Pagamento aguardando confirmação
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              Valor: {money(Number(invoice.amount))}.
              A assinatura só será ativada ou renovada depois da
              confirmação pelo administrador.
            </p          >
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Escolha seu plano
          </h2>

          <p className="mb-6 text-gray-600">
            Você pode solicitar a contratação durante ou depois do teste grátis.
          </p>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="font-medium text-gray-700">
              Cobrança:
            </span>

            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                billingCycle === 'monthly'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              Mensal
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                billingCycle === 'annual'
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              Anual
            </button>
          </div>

          {plans.length === 0 ? (
            <p className="rounded-lg bg-white p-5 text-gray-600">
              Nenhum plano ativo foi encontrado.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {plans.map(plan => {
                const price =
                  billingCycle === 'monthly'
                    ? Number(plan.monthly_price)
                    : Number(plan.annual_price)

                const selected = selectedPlan === plan.id

                return (
                  <article
                    key={plan.id}
                    className={`rounded-xl border bg-white p-6 shadow-sm ${
                      selected
                        ? 'border-blue-600 ring-2 ring-blue-100'
                        : 'border-gray-200'
                    }`}
                  >
                    <h3 className="text-xl font-bold text-gray-900">
                      {plan.name}
                    </h3>

                    {plan.description && (
                      <p className="mt-2 min-h-10 text-sm text-gray-600">
                        {plan.description}
                      </p>
                    )}

                    <p className="mt-5 text-3xl font-bold text-gray-900">
                      {money(price)}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {billingCycle === 'monthly'
                        ? 'por mês'
                        : 'por ano'}
                    </p>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`mt-6 w-full rounded-lg px-4 py-3 font-semibold ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {selected
                        ? 'Plano selecionado'
                        : 'Escolher este plano'}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Solicitar contratação
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Escolha a forma de pagamento. A solicitação ficará pendente
            até que o recebimento seja conferido pelo administrador.
          </p>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Forma de pagamento
            </label>

            <select
              value={paymentMethod}
              onChange={e =>
                setPaymentMethod(
                  e.target.value as 'pix' | 'cash' | 'card'
                )
              }
              className="w-full max-w-sm rounded-lg border border-gray-300 bg-white p-3 text-gray-800"
            >
              <option value="pix">PIX</option>
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
            </select>
          </div>

          {chosenPlan && (
            <div className="mt-5 rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Sua escolha
              </p>

              <p className="font-semibold text-gray-900">
                {chosenPlan.name} —{' '}
                {money(
                  billingCycle === 'monthly'
                    ? Number(chosenPlan.monthly_price)
                    : Number(chosenPlan.annual_price)
                )}
                {billingCycle === 'monthly' ? ' / mês' : ' / ano'}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={requestSubscription}
            disabled={
              !selectedPlan ||
              requesting ||
              hasPendingInvoice ||
              plans.length === 0
            }
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {requesting
              ? 'Enviando solicitação...'
              : hasPendingInvoice
                ? 'Aguardando confirmação'
                : 'Solicitar contratação'}
          </button>

          <p className="mt-4 text-xs text-gray-500">
            Selecionar uma forma de pagamento não significa que o
            pagamento foi realizado. A confirmação será feita pelo administrador.
          </p>
        </section>
      </div>
    </main>
  )
}
