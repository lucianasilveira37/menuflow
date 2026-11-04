
'use client'

import { useEffect, useRef, useState } from 'react'
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
  created_at: string
  order_items: OrderItem[]
}

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

      // Busca os pedidos sem depender do relacionamento automático das mesas.
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

      // Busca os nomes das mesas diretamente pelo ID.
      const tableIds = [
        ...new Set(
          ordersData
            .map(order => order.table_id)
            .filter((id): id is string => Boolean(id))
        ),
      ]

      let tablesMap: Record<string, string> = {}

      if (tableIds.length > 0) {
        const { data: tablesData, error: tablesError } = await supabase
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

      // Acrescenta o nome da mesa a cada pedido.
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
        (payload) => {
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
      .subscribe((status) => {
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

  function formatPrice(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString('pt-BR')
  }

  function getOrderTypeLabel(orderType: string) {
    if (orderType === 'delivery') return '🛵 Entrega'
    if (orderType === 'pickup') return '🏪 Retirada'
    if (orderType === 'table') return '🍽️ Mesa'
    return orderType
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
      return { backgroundColor: '#dcfce7', color: '#15803d' }
    }

    if (order.status === 'ready') {
      return { backgroundColor: '#dbeafe', color: '#1d4ed8' }
    }

    if (order.status === 'out_for_delivery') {
      return { backgroundColor: '#ede9fe', color: '#6d28d9' }
    }

    if (order.status === 'preparing') {
      return { backgroundColor: '#fef3c7', color: '#92400e' }
    }

    if (order.status === 'cancelled') {
      return { backgroundColor: '#fee2e2', color: '#b91c1c' }
    }

    return { backgroundColor: '#ffedd5', color: '#c2410c' }
  }

  const filteredOrders = orders.filter(order =>
    filter === 'all' ? true : order.status === filter
  )

  function countOrders(status: string) {
    return orders.filter(order => order.status === status).length
  }

  if (loading) {
    return (
      <main className="dashboard-content">
        Carregando pedidos...
      </main>
    )
  }

  return (
    <main className="dashboard-content">
      <div className="dashboard-topbar">
        <div>
          <h1>Pedidos</h1>
          <p>Acompanhe e gerencie os pedidos do seu restaurante.</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={enableSound}
            className="btn-primary"
          >
            {soundEnabled ? '🔔 Som ativado' : '🔕 Ativar som'}
          </button>

          <button
            type="button"
            onClick={() => loadOrders(true)}
            className="btn-primary"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="dashboard-stats">
        <div className="stat-card">
          <span>Total de pedidos</span>
          <strong>{orders.length}</strong>
        </div>

        <div className="stat-card">
          <span>Recebidos</span>
          <strong>{countOrders('received')}</strong>
        </div>

        <div className="stat-card">
          <span>Em preparo</span>
          <strong>{countOrders('preparing')}</strong>
        </div>

        <div className="stat-card">
          <span>Prontos</span>
          <strong>
            {orders.filter(order => order.status === 'ready').length}
          </strong>
        </div>

        <div className="stat-card">
          <span>Em entrega</span>
          <strong>{countOrders('out_for_delivery')}</strong>
        </div>
      </div>

      <section className="dashboard-section">
        <h2>Histórico de pedidos</h2>

        <div className="order-filters">
          {filters.map(item => (
            <button
              key={item.value}
              type="button"
              className={
                filter === item.value
                  ? 'order-filter active'
                  : 'order-filter'
              }
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span>
                {item.value === 'all'
                  ? orders.length
                  : countOrders(item.value)}
              </span>
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <p>Nenhum pedido encontrado nesse filtro.</p>
        ) : (
          <div className="orders-list">
            {filteredOrders.map(order => {
              const whatsappNumber = (order.customer_phone || '')
                .replace(/\D/g, '')

              const isDelivery = order.order_type === 'delivery'
              const isPickup = order.order_type === 'pickup'
              const isTable = order.order_type === 'table'
              const tableName = order.restaurant_tables?.name

              return (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <div className="order-title">
                      <h3>Pedido #{order.id.slice(0, 8)}</h3>

                      <span
                        className="order-status-badge"
                        style={getStatusColors(order)}
                      >
                        {getStatusLabel(order)}
                      </span>
                    </div>

                    <span>{formatDate(order.created_at)}</span>
                    <strong>{formatPrice(order.total)}</strong>
                  </div>

                  <div className="order-customer">
                    <p>
                      <strong>Cliente:</strong>{' '}
                      {order.customer_name || 'Não informado'}
                    </p>

                    <p>
                      <strong>WhatsApp:</strong>{' '}
                      {order.customer_phone || 'Não informado'}
                    </p>

                    {whatsappNumber.length >= 12 && (
                      <p>
                        <a
                          href={`https://wa.me/${whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Conversar pelo WhatsApp
                        </a>
                      </p>
                    )}

                    <p>
                      <strong>Tipo do pedido:</strong>{' '}
                      {getOrderTypeLabel(order.order_type)}
                    </p>

                    {isTable && (
                      <div style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        margin: '12px 0',
                        fontWeight: 'bold',
                      }}>
                        🍽️ PEDIDO PARA MESA

                        <div style={{
                          fontSize: '20px',
                          marginTop: '4px',
                        }}>
                          {tableName || 'Mesa não identificada'}
                        </div>
                      </div>
                    )}

                    {isDelivery && (
                      <>
                        <p>
                          <strong>Bairro:</strong>{' '}
                          {order.delivery_neighborhood || 'Não informado'}
                        </p>

                        <p>
                          <strong>Endereço:</strong>{' '}
                          {order.delivery_address || 'Não informado'}
                        </p>
                      </>
                    )}

                    {isPickup && (
                      <p>
                        <strong>Modalidade:</strong> Retirada no local
                      </p>
                    )}
                  </div>

                  <div className="order-items">
                    <h4>Produtos</h4>

                    {order.order_items?.map(item => (
                      <div className="order-item" key={item.id}>
                        <span>
                          {item.quantity}x {item.product_name}
                        </span>

                        <strong>
                          {formatPrice(item.total_price)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="order-items">
                    <div className="order-item">
                      <span>Subtotal</span>
                      <strong>{formatPrice(order.subtotal)}</strong>
                    </div>

                    <div className="order-item">
                      <span>Taxa de entrega</span>
                      <strong>
                        {formatPrice(order.delivery_fee)}
                      </strong>
                    </div>

                    <div className="order-item">
                      <strong>Total</strong>
                      <strong>{formatPrice(order.total)}</strong>
                    </div>
                  </div>

                  <div className="order-status">
                    <strong>Ações do pedido</strong>

                    {order.status === 'received' && (
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginTop: '10px',
                      }}>
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => updateStatus(order.id, 'preparing')}
                          style={{
                            background: '#16a34a',
                            color: '#fff',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          Aceitar pedido
                        </button>

                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => {
                            if (window.confirm('Deseja realmente recusar este pedido?')) {
                              void updateStatus(order.id, 'cancelled')
                            }
                          }}
                          style={{
                            background: '#dc2626',
                            color: '#fff',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          Recusar pedido
                        </button>
                      </div>
                    )}

                    {order.status === 'preparing' && (
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginTop: '10px',
                      }}>
                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => updateStatus(order.id, 'ready')}
                          className="btn-primary"
                        >
                          {isPickup
                            ? 'Pronto para retirada'
                            : 'Marcar como pronto'}
                        </button>

                        <button
                          type="button"
                          disabled={updating === order.id}
                          onClick={() => {
                            if (window.confirm('Deseja realmente cancelar este pedido?')) {
                              void updateStatus(order.id, 'cancelled')
                            }
                          }}
                          style={{
                            background: '#dc2626',
                            color: '#fff',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancelar pedido
                        </button>
                      </div>
                    )}

                    {order.status === 'ready' && isDelivery && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() => updateStatus(order.id, 'out_for_delivery')}
                        className="btn-primary"
                        style={{ marginTop: '10px' }}
                      >
                        🛵 Saiu para entrega
                      </button>
                    )}

                    {order.status === 'ready' && isPickup && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="btn-primary"
                        style={{ marginTop: '10px' }}
                      >
                        Confirmar retirada
                      </button>
                    )}

                    {order.status === 'ready' && !isDelivery && !isPickup && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="btn-primary"
                        style={{ marginTop: '10px' }}
                      >
                        Concluir pedido
                      </button>
                    )}

                    {order.status === 'out_for_delivery' && (
                      <button
                        type="button"
                        disabled={updating === order.id}
                        onClick={() => updateStatus(order.id, 'completed')}
                        className="btn-primary"
                        style={{ marginTop: '10px' }}
                      >
                        Confirmar entrega
                      </button>
                    )}

                    {order.status === 'completed' && (
                      <p>
                        {isDelivery
                          ? '✅ Pedido entregue ao cliente.'
                          : '✅ Pedido concluído.'}
                      </p>
                    )}

                    {order.status === 'cancelled' && (
                      <p>Pedido cancelado.</p>
                    )}

                    {updating === order.id && (
                      <p>Salvando alteração...</p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
