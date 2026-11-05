"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type OrderItem = {
  id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

type Order = {
  id: string
  table_id: string | null
  restaurant_tables?: {
    name: string
  } | null
  customer_name: string | null
  customer_phone: string | null
  delivery_address: string | null
  delivery_neighborhood: string | null
  delivery_neighborhood_id: string | null
  order_type: string
  status: string
  subtotal: number
  delivery_fee: number
  total: number
  payment_method: string | null
  payment_status: string
  payment_amount: number | null
  paid_at: string | null
  created_at: string
  order_items: OrderItem[]
}

const menuItems = [
  { title: 'Visão geral', href: '/painel', icon: '▦' },
  { title: 'Produtos', href: '/painel/produtos', icon: '🍕' },
  { title: 'Categorias', href: '/painel/categorias', icon: '▤' },
  { title: 'Pedidos', href: '/painel/pedidos', icon: '🧾' },
  { title: 'Mesas', href: '/painel/mesas', icon: '🪑' },
  { title: 'Loja', href: '/painel/loja', icon: '🏪' },
  { title: 'Financeiro', href: '/painel/financeiro', icon: '💰' },
]

const statuses = [
  { value: 'received', label: 'Recebido' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready', label: 'Pronto' },
  { value: 'out_for_delivery', label: 'Saiu para entrega' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
]

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'received', label: 'Recebidos' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'ready', label: 'Prontos' },
  { value: 'out_for_delivery', label: 'Em entrega' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'cancelled', label: 'Cancelados' },
]

const primaryButton =
  'rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

const dangerButton =
  'rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [soundEnabled, setSoundEnabled] = useState(false)

  const soundEnabledRef = useRef(false)
  const knownOrderIds = useRef<Set<string> | null>(null)
  const audioContext = useRef<AudioContext | null>(null)

  function playNotification() {
    if (!soundEnabledRef.current) return

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }).webkitAudioContext

      if (!AudioContextClass) return

      if (!audioContext.current) {
        audioContext.current = new AudioContextClass()
      }

      const context = audioContext.current

      if (context.state === 'suspended') {
        void context.resume()
      }

      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.connect(gain)
      gain.connect(context.destination)

      oscillator.type = 'sine'
      oscillator.frequency.value = 880

      gain.gain.setValueAtTime(0.3, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        context.currentTime + 0.5
      )

      oscillator.start()
      oscillator.stop(context.currentTime + 0.5)
    } catch (err) {
      console.error('Erro ao reproduzir alerta:', err)
    }
  }

  async function enableSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }).webkitAudioContext

      if (!AudioContextClass) {
        setError('Seu navegador não suporta áudio.')
        return
      }

      if (!audioContext.current) {
        audioContext.current = new AudioContextClass()
      }

      await audioContext.current.resume()

      soundEnabledRef.current = true
      setSoundEnabled(true)

      playNotification()
      setError('')
    } catch (err) {
      console.error('Erro ao ativar som:', err)
      setError('Não foi possível ativar o som.')
    }
  }

  async function loadOrders(showLoading = false) {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setError('Faça login para visualizar os pedidos.')
        return
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from('memberships')
          .select('restaurant_id')
          .eq('user_id', authData.user.id)
          .limit(1)
          .single()

      if (membershipError || !membership) {
        setError('Não foi possível encontrar seu restaurante.')
        return
      }

      const { data, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          table_id,
          customer_name,
          customer_phone,
          delivery_address,
          delivery_neighborhood,
          delivery_neighborhood_id,
          order_type,
          status,
          subtotal,
          delivery_fee,
          total,
          payment_method,
          payment_status,
          payment_amount,
          paid_at,
          created_at,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('restaurant_id', membership.restaurant_id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        setError('Erro ao carregar pedidos: ' + ordersError.message)
        return
      }

      const ordersData = data || []

      const tableIds = [
        ...new Set(
          ordersData
            .map(order => order.table_id)
            .filter((id): id is string => Boolean(id))
        ),
      ]

      let tablesMap: Record<string, string> = {}

      if (tableIds.length > 0) {
        const { data: tablesData, error: tablesError } =
          await supabase
            .from('restaurant_tables')
            .select('id, name')
            .eq('restaurant_id', membership.restaurant_id)
            .in('id', tableIds)

        if (tablesError) {
          console.error('Erro ao buscar mesas:', tablesError)
        } else {
          tablesMap = Object.fromEntries(
            (tablesData || []).map(table => [
              table.id,
              table.name,
            ])
          )
        }
      }

      const newOrders: Order[] = ordersData.map(order => ({
        ...order,
        restaurant_tables: order.table_id
          ? {
              name:
                tablesMap[order.table_id] ||
                'Mesa não identificada',
            }
          : null,
      }))

      const currentIds = new Set(newOrders.map(order => order.id))

      if (knownOrderIds.current === null) {
        knownOrderIds.current = currentIds
      } else {
        const hasNewOrder = newOrders.some(
          order => !knownOrderIds.current!.has(order.id)
        )

        if (hasNewOrder) {
          playNotification()
        }

        knownOrderIds.current = currentIds
      }

      setOrders(newOrders)
      setError('')
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err)
      setError('Ocorreu um erro ao carregar os pedidos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders(true)

    const channel = supabase
      .channel('pedidos-em-tempo-real')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        payload => {
          const newOrder = payload.new as { id?: string }

          if (
            newOrder.id &&
            knownOrderIds.current !== null &&
            !knownOrderIds.current.has(newOrder.id)
          ) {
            playNotification()
            knownOrderIds.current.add(newOrder.id)
          }

          void loadOrders()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        () => {
          void loadOrders()
        }
      )
      .subscribe(status => {
        console.log('Status do Realtime:', status)

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          setError(
            'Erro na conexão em tempo real. Verifique o Supabase.'
          )
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId)
    setError('')

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (error) {
        setError('Não foi possível atualizar: ' + error.message)
        return
      }

      setOrders(current =>
        current.map(order =>
          order.id === orderId
            ? { ...order, status }
            : order
        )
      )
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      setError('Ocorreu um erro ao atualizar o pedido.')
    } finally {
      setUpdating(null)
    }
  }

  async function confirmPayment(order: Order) {
    if (
      order.payment_status !== 'pending' ||
      order.status === 'cancelled'
    ) {
      return
    }

    const confirmed = window.confirm(
      `Confirma que recebeu o pagamento de ${formatPrice(order.total)}?`
    )

    if (!confirmed) return

    setUpdating(order.id)
    setError('')

    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_amount: order.total,
          paid_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('payment_status', 'pending')
        .select('id')
        .maybeSingle()

      if (error) {
        setError(
          'Não foi possível confirmar o pagamento: ' + error.message
        )
        return
      }

      if (!data) {
        setError(
          'O pagamento já foi atualizado ou o pedido não está disponível.'
        )
        await loadOrders()
        return
      }

      await loadOrders()
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err)
      setError('Ocorreu um erro ao confirmar o pagamento.')
    } finally {
      setUpdating(null)
    }
  }

  function formatPrice(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function getOrderTypeLabel(orderType: string) {
    if (orderType === 'delivery') return '🛵 Entrega'
    if (orderType === 'pickup') return '🏪 Retirada'
    if (orderType === 'table') return '🍽️ Mesa'
    return orderType
  }

  function getPaymentMethodLabel(method: string | null) {
    if (method === 'pix') return 'PIX'
    if (method === 'cash') return 'Dinheiro'
    if (method === 'card') return 'Cartão'
    return 'Não informado'
  }

  function getPaymentStatusLabel(status: string) {
    if (status === 'paid') return '✓ Pagamento confirmado'
    if (status === 'refunded') return 'Pagamento estornado'
    return 'Aguardando pagamento'
  }

  function getStatusLabel(order: Order) {
    if (order.status === 'ready' && order.order_type === 'pickup') {
      return 'Pronto para retirada'
    }

    if (order.status === 'ready' && order.order_type === 'delivery') {
      return 'Pronto para entrega'
    }

    return statuses.find(
      item => item.value === order.status
    )?.label || order.status
  }

  function getStatusColors(order: Order) {
    if (order.status === 'completed') {
      return 'bg-emerald-100 text-emerald-800'
    }

    if (order.status === 'ready') {
      return 'bg-blue-100 text-blue-800'
    }

    if (order.status === 'out_for_delivery') {
      return 'bg-violet-100 text-violet-800'
    }

    if (order.status === 'preparing') {
      return 'bg-amber-100 text-amber-800'
    }

    if (order.status === 'cancelled') {
      return 'bg-red-100 text-red-800'
    }

    return 'bg-orange-100 text-orange-800'
  }

  function getOrderCardColors(order: Order) {
    if (order.status === 'completed') {
      return 'border-emerald-200 bg-emerald-50'
    }

    if (order.status === 'ready') {
      return 'border-blue-200 bg-blue-50'
    }

    if (order.status === 'out_for_delivery') {
      return 'border-violet-200 bg-violet-50'
    }

    if (order.status === 'preparing') {
      return 'border-amber-200 bg-amber-50'
    }

    if (order.status === 'cancelled') {
      return 'border-red-200 bg-red-50'
    }

    return 'border-orange-200 bg-orange-50'
  }

  function countOrders(status: string) {
    return orders.filter(order => order.status === status).length
  }

  const filteredOrders = orders.filter(order =>
    filter === 'all' ? true : order.status === filter
  )

  const statCards = [
    {
      label: 'Total de pedidos',
      value: orders.length,
      icon: '🧾',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Recebidos',
      value: countOrders('received'),
      icon: '📥',
      color: 'bg-orange-50 text-orange-700',
    },
    {
      label: 'Em preparo',
      value: countOrders('preparing'),
      icon: '👨‍🍳',
      color: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Prontos',
      value: countOrders('ready'),
      icon: '✅',
      color: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Em entrega',
      value: countOrders('out_for_delivery'),
      icon: '🛵',
      color: 'bg-violet-50 text-violet-700',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 md:flex">

      {/* MENU LATERAL */}
      <aside className="w-full bg-[#111827] p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Menu<span className="text-blue-400">Flow</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Painel do restaurante
          </p>
        </div>

        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gerenciamento
        </div>

        <nav className="space-y-1">
          {menuItems.map(item => {
            const active = item.href === '/painel/pedidos'

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active
                    ? 'bg-blue-600 font-semibold text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.title}
              </Link>
            )
          })}
        </nav>

        <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="mb-2 text-sm font-semibold text-white">
            Central de pedidos
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Acompanhe novos pedidos e atualize o andamento dos atendimentos.
          </p>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="min-w-0 flex-1 p-4 md:p-7">

        {/* CABEÇALHO */}
        <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="mb-2 text-sm text-slate-500">
              MenuFlow <span className="mx-1">/</span> Gerenciamento
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Pedidos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Acompanhe e gerencie os pedidos do seu restaurante.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={enableSound}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                soundEnabled
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {soundEnabled ? '🔔 Som ativado' : '🔕 Ativar som'}
            </button>

            <button
              type="button"
              onClick={() => loadOrders(true)}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Atualizando...' : '↻ Atualizar'}
            </button>
          </div>
        </div>

        {/* ERRO */}
        {error && (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* INDICADORES */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {statCards.map(card => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {card.label}
                </span>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${card.color}`}>
                  {card.icon}
                </span>
              </div>

              <div className="mt-2 text-2xl font-bold text-slate-900">
                {card.value}
              </div>
            </div>
          ))}
        </div>

        {/* HISTÓRICO E FILTROS */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Histórico de pedidos
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {filteredOrders.length} pedido(s) encontrado(s)
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {filters.map(item => (
            <button
              key={item.value}
              type="button"
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                filter === item.value
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                  filter === item.value
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.value === 'all'
                  ? orders.length
                  : countOrders(item.value)}
              </span>
            </button>
          ))}
        </div>

        {/* GRADE DE PEDIDOS */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
            Carregando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
            <div className="mb-3 text-4xl">🧾</div>
            <h4 className="font-semibold text-slate-800">
              Nenhum pedido encontrado
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Não existem pedidos nesse filtro no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredOrders.map(order => {
              const whatsappNumber = (order.customer_phone || '')
                .replace(/\D/g, '')

              const isDelivery = order.order_type === 'delivery'
              const isPickup = order.order_type === 'pickup'
              const isTable = order.order_type === 'table'
              const tableName = order.restaurant_tables?.name

              return (
                <article
                  key={order.id}
                  className={`flex min-w-0 flex-col overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getOrderCardColors(order)}`}
                >
                  {/* CABEÇALHO DO CARD */}
                  <div className="border-b border-black/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-extrabold text-slate-900">
                          Pedido #{order.id.slice(0, 8)}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-600">
                          {formatDate(order.created_at)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${getStatusColors(order)}`}
                      >
                        {getStatusLabel(order)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white/70 px-3 py-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        Total do pedido
                      </span>
                      <strong className="text-lg font-extrabold text-slate-900">
                        {formatPrice(order.total)}
                      </strong>
                    </div>
                  </div>

                  {/* INFORMAÇÕES DO CLIENTE */}
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Cliente
                      </span>
                      <span className="max-w-[65%] truncate text-right text-xs font-bold text-slate-800">
                        {order.customer_name || 'Não informado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        WhatsApp
                      </span>
                      <span className="truncate text-right text-xs text-slate-700">
                        {order.customer_phone || 'Não informado'}
                      </span>
                    </div>

                    {whatsappNumber.length >= 12 && (
                      <a
                        href={`https://wa.me/${whatsappNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-200"
                      >
                        💬 Conversar pelo WhatsApp
                      </a>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Tipo
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {getOrderTypeLabel(order.order_type)}
                      </span>
                    </div>

                    {/* PAGAMENTO */}
                    <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Forma de pagamento
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {getPaymentMethodLabel(order.payment_method)}
                      </p>

                      <p
                        className={`mt-1 text-xs font-bold ${
                          order.payment_status === 'paid'
                            ? 'text-emerald-700'
                            : order.payment_status === 'refunded'
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {getPaymentStatusLabel(order.payment_status)}
                      </p>

                      {order.payment_status === 'paid' && (
                        <>
                          <p className="mt-1 text-xs text-slate-600">
                            Valor recebido: {formatPrice(order.payment_amount ?? 0)}
                          </p>

                          {order.paid_at && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Recebido em: {formatDate(order.paid_at)}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {isTable && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-100/70 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase text-emerald-800">
                          🍽️ Pedido para mesa
                        </p>
                        <p className="mt-0.5 text-sm font-extrabold text-emerald-950">
                          {tableName || 'Mesa não identificada'}
                        </p>
                      </div>
                    )}

                    {isDelivery && (
                      <div className="space-y-1 rounded-lg border border-violet-200 bg-violet-100/70 p-2.5">
                        <p className="text-[10px] font-bold uppercase text-violet-800">
                          📍 Endereço de entrega
                        </p>
                        <p className="break-words text-xs text-violet-950">
                          <strong>Bairro:</strong>{' '}
                          {order.delivery_neighborhood || 'Não informado'}
                        </p>
                        <p className="break-words text-xs text-violet-950">
                          <strong>Endereço:</strong>{' '}
                          {order.delivery_address || 'Não informado'}
                        </p>
                      </div>
                    )}

                    {isPickup && (
                      <div className="rounded-lg bg-blue-100/80 px-3 py-2 text-xs font-semibold text-blue-800">
                        🏪 Cliente fará retirada no local
                      </div>
                    )}
                  </div>

                  {/* PRODUTOS */}
                  <div className="mx-3 rounded-lg border border-black/5 bg-white/65 p-3">
                    <h5 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                      Produtos ({order.order_items?.length || 0})
                    </h5>

                    <div className="space-y-2">
                      {order.order_items?.length ? (
                        order.order_items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-xs font-bold text-slate-800">
                                {item.quantity}x {item.product_name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                {formatPrice(item.unit_price)} cada
                              </p>
                            </div>

                            <strong className="shrink-0 text-xs text-slate-800">
                              {formatPrice(item.total_price)}
                            </strong>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">
                          Nenhum produto informado.
                        </p>
                      )}
                    </div>

                    {/* RESUMO FINANCEIRO */}
                    <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-2">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Subtotal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Taxa de entrega</span>
                        <span>{formatPrice(order.delivery_fee)}</span>
                      </div>

                      <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                        <span>Total</span>
                        <span>{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* AÇÕES */}
                  <div className="mt-auto p-3">
                    {updating === order.id && (
                      <p className="mb-2 text-center text-[11px] font-semibold text-blue-700">
                        Salvando alteração...
                      </p>
                    )}

                    {order.payment_status === 'pending' &&
                      order.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => void confirmPayment(order)}
                          className="mb-3 w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          ✓ Confirmar pagamento recebido
                        </button>
                      )}

                    {order.status === 'received' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() =>
                            updateStatus(order.id, 'preparing')
                          }
                          className="rounded-lg bg-emerald-600 px-2 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          ✓ Aceitar
                        </button>

                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Deseja realmente recusar este pedido?'
                              )
                            ) {
                              void updateStatus(order.id, 'cancelled')
                            }
                          }}
                          className={dangerButton}
                        >
                          ✕ Recusar
                        </button>
                      </div>
                    )}

                    {order.status === 'preparing' && (
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() =>
                            updateStatus(order.id, 'ready')
                          }
                          className={primaryButton}
                        >
                          {isPickup
                            ? '✓ Pronto para retirada'
                            : '✓ Marcar como pronto'}
                        </button>

                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Deseja realmente cancelar este pedido?'
                              )
                            ) {
                              void updateStatus(order.id, 'cancelled')
                            }
                          }}
                          className="rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancelar pedido
                        </button>
                      </div>
                    )}

                    {order.status === 'ready' && isDelivery && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() =>
                          updateStatus(order.id, 'out_for_delivery')
                        }
                        className={`${primaryButton} w-full`}
                      >
                        🛵 Saiu para entrega
                      </button>
                    )}

                    {order.status === 'ready' && isPickup && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() =>
                          updateStatus(order.id, 'completed')
                        }
                        className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✓ Confirmar retirada
                      </button>
                    )}

                    {order.status === 'ready' &&
                      !isDelivery &&
                      !isPickup && (
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() =>
                            updateStatus(order.id, 'completed')
                          }
                          className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          ✓ Concluir pedido
                        </button>
                      )}

                    {order.status === 'out_for_delivery' && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() =>
                          updateStatus(order.id, 'completed')
                        }
                        className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✓ Confirmar entrega
                      </button>
                    )}

                    {order.status === 'completed' && (
                      <div className="rounded-lg bg-emerald-100 px-3 py-2.5 text-center text-xs font-bold text-emerald-800">
                        ✅ {isDelivery
                          ? 'Pedido entregue ao cliente.'
                          : 'Pedido concluído.'}
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div className="rounded-lg bg-red-100 px-3 py-2.5 text-center text-xs font-bold text-red-800">
                        Pedido cancelado.
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}