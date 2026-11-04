
'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type OrderItem = {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number | string
  total_price: number | string
}

type OrderTracking = {
  id: string
  restaurant_id: string
  status: string
  order_type: 'delivery' | 'pickup' | 'table'
  delivery_neighborhood: string | null
  delivery_fee: number | string
  subtotal: number | string
  total: number | string
  items: OrderItem[]
}

type Category = {
  id: string
  name: string
  position: number
}

type Product = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  position: number
}

type CartItem = {
  product: Product
  quantity: number
}

const currency = (value: number | string) =>
  Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

function AcompanharPedidoContent() {
  const params = useParams()
  const searchParams = useSearchParams()

  const id = String(params.id)
  const token = searchParams.get('token')

  const [order, setOrder] = useState<OrderTracking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [cart, setCart] = useState<CartItem[]>([])
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  const canAddItems =
    order?.status === 'received' ||
    order?.status === 'confirmed'

  useEffect(() => {
    let active = true

    if (!token) {
      setError('Link de acompanhamento inválido ou incompleto.')
      setLoading(false)
      return
    }

    async function checkStatus() {
      const { data, error } = await supabase.rpc(
        'get_public_order_status',
        {
          p_order_id: id,
          p_tracking_token: token,
        }
      )

      if (!active) return

      if (error) {
        console.error('Erro ao consultar pedido:', error)
        setError('Não foi possível consultar o pedido. Tente novamente.')
        setLoading(false)
        return
      }

      if (!data) {
        setError('Pedido não encontrado ou link de acompanhamento inválido.')
        setOrder(null)
        setLoading(false)
        return
      }

      setOrder(data as OrderTracking)
      setError('')
      setLoading(false)
    }

    void checkStatus()

    const interval = setInterval(() => {
      void checkStatus()
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [id, token])

  // Carrega categorias e produtos somente enquanto o pedido aceita acréscimos.
  useEffect(() => {
    let active = true

    async function loadProducts() {
      if (!order?.restaurant_id || !canAddItems) {
        setCategories([])
        setProducts([])
        return
      }

      const [categoriesResult, productsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, position')
          .eq('restaurant_id', order.restaurant_id)
          .eq('is_active', true)
          .order('position', { ascending: true }),

        supabase
          .from('products')
          .select(
            'id, category_id, name, description, price, image_url, position'
          )
          .eq('restaurant_id', order.restaurant_id)
          .eq('is_available', true)
          .order('position', { ascending: true }),
      ])

      if (!active) return

      if (categoriesResult.error) {
        console.error('Erro ao carregar categorias:', categoriesResult.error)
      } else {
        setCategories((categoriesResult.data || []) as Category[])
      }

      if (productsResult.error) {
        console.error('Erro ao carregar produtos:', productsResult.error)
        setAddError('Não foi possível carregar os produtos disponíveis.')
      } else {
        setProducts((productsResult.data || []) as Product[])
      }
    }

    void loadProducts()

    return () => {
      active = false
    }
  }, [order?.restaurant_id, canAddItems])

  function addToCart(product: Product) {
    setAddError('')
    setAddSuccess('')

    setCart(current => {
      const existing = current.find(
        item => item.product.id === product.id
      )

      if (existing) {
        return current.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
            : item
        )
      }

      return [...current, { product, quantity: 1 }]
    })
  }

  function decreaseQuantity(productId: string) {
    setAddError('')
    setAddSuccess('')

    setCart(current =>
      current
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const filteredProducts = products.filter(product => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'none') return !product.category_id
    return product.category_id === selectedCategory
  })

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.product.price) * item.quantity,
    0
  )

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  )

  async function addItemsToOrder() {
    if (adding) return

    setAddError('')
    setAddSuccess('')

    if (!token || !order) {
      setAddError('Não foi possível identificar o pedido.')
      return
    }

    if (!canAddItems) {
      setAddError('Este pedido não aceita mais alterações.')
      return
    }

    if (cart.length === 0) {
      setAddError('Adicione pelo menos um produto.')
      return
    }

    setAdding(true)

    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }))

      const { data, error } = await supabase.rpc(
        'add_items_to_public_order',
        {
          p_order_id: id,
          p_tracking_token: token,
          p_items: items,
        }
      )

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.success) {
        throw new Error('Não foi possível adicionar os produtos.')
      }

      setCart([])
      setAddSuccess(
        'Produtos adicionados ao seu pedido com sucesso!'
      )

      // Atualiza imediatamente os valores e os itens do pedido.
      const { data: updatedOrder, error: refreshError } =
        await supabase.rpc('get_public_order_status', {
          p_order_id: id,
          p_tracking_token: token,
        })

      if (refreshError) {
        console.error('Erro ao atualizar pedido:', refreshError)
      } else if (updatedOrder) {
        setOrder(updatedOrder as OrderTracking)
      }
    } catch (error) {
      console.error('Erro ao adicionar produtos:', error)

      setAddError(
        error instanceof Error
          ? error.message
          : 'Não foi possível adicionar os produtos.'
      )
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <main className="public-menu">
        <section className="public-order-success">
          <div style={{ fontSize: '45px' }}>🍕</div>
          <h1>Carregando seu pedido...</h1>
          <p>Aguarde um instante.</p>
        </section>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="public-menu">
        <section className="public-order-success">
          <div style={{ fontSize: '40px' }}>⚠️</div>
          <h1>Acompanhamento do pedido</h1>
          <p role="alert">{error || 'Pedido não encontrado.'}</p>
        </section>
      </main>
    )
  }

  const isDelivery = order.order_type === 'delivery'
  const isPickup = order.order_type === 'pickup'

  const steps = [
    {
      value: 'received',
      label: 'Pedido recebido',
      description: 'O restaurante recebeu seu pedido.',
      icon: '📋',
    },
    {
      value: 'preparing',
      label: 'Em preparação',
      description: 'Seu pedido está sendo preparado.',
      icon: '👨‍🍳',
    },
    {
      value: 'ready',
      label: isPickup ? 'Pronto para retirada' : 'Pronto para entrega',
      description: isPickup
        ? 'Seu pedido está pronto. Você já pode retirá-lo!'
        : 'Seu pedido está pronto para sair para entrega.',
      icon: isPickup ? '🏪' : '🍕',
    },
    ...(isDelivery
      ? [
          {
            value: 'out_for_delivery',
            label: 'Saiu para entrega',
            description: 'Seu pedido está a caminho!',
            icon: '🛵',
          },
        ]
      : []),
    {
      value: 'completed',
      label: isDelivery ? 'Pedido entregue' : 'Retirada concluída',
      description: isDelivery
        ? 'Seu pedido foi entregue. Obrigado pela preferência!'
        : 'Seu pedido foi retirado. Obrigado pela preferência!',
      icon: '✅',
    },
  ]

  const currentStatus =
    order.status === 'confirmed' ? 'received' : order.status

  const currentIndex = steps.findIndex(
    step => step.value === currentStatus
  )

  const currentStep = steps[currentIndex]

  let statusLabel = currentStep?.label || order.status
  let statusMessage = currentStep?.description || ''

  if (order.status === 'confirmed') {
    statusLabel = 'Pedido confirmado'
    statusMessage = 'O restaurante confirmou o recebimento do seu pedido.'
  }

  if (order.status === 'cancelled') {
    statusLabel = 'Pedido cancelado'
    statusMessage = 'Este pedido foi cancelado pelo restaurante.'
  }

  return (
    <main className="public-menu">
      <section
        className="public-order-success"
        style={{
          maxWidth: '620px',
          margin: '30px auto',
          padding: '25px',
          borderRadius: '18px',
          background: '#ffffff',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>
          {order.status === 'cancelled'
            ? '❌'
            : isDelivery
              ? '🛵'
              : '🍕'}
        </div>

        <h1 style={{ marginBottom: '8px' }}>
          Acompanhe seu pedido
        </h1>

        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Pedido #{id.slice(0, 8)}
        </p>

        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            borderRadius: '12px',
            background: '#f9fafb',
            textAlign: 'left',
          }}
        >
          <p>
            <strong>Tipo:</strong>{' '}
            {isDelivery
              ? '🛵 Entrega'
              : isPickup
                ? '🏪 Retirada no local'
                : '🍽️ Consumo no local'}
          </p>

          {isDelivery && (
            <>
              <p style={{ marginTop: '8px' }}>
                <strong>Bairro:</strong>{' '}
                {order.delivery_neighborhood || 'Não informado'}
              </p>

              <p style={{ marginTop: '8px' }}>
                <strong>Taxa de entrega:</strong>{' '}
                {currency(order.delivery_fee)}
              </p>
            </>
          )}
        </div>

        {/* Produtos já vinculados ao pedido */}
        <div
          style={{
            marginTop: '25px',
            padding: '18px',
            borderRadius: '12px',
            background: '#f9fafb',
            textAlign: 'left',
          }}
        >
          <h2 style={{ marginBottom: '15px' }}>
            Seus produtos
          </h2>

          {order.items?.length ? (
            order.items.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '9px 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span>
                  {item.quantity}x {item.product_name}
                </span>

                <strong>{currency(item.total_price)}</strong>
              </div>
            ))
          ) : (
            <p>Nenhum produto encontrado.</p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '15px',
            }}
          >
            <strong>Subtotal</strong>
            <strong>{currency(order.subtotal)}</strong>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '8px',
            }}
          >
            <span>Taxa de entrega</span>
            <span>{currency(order.delivery_fee)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #d1d5db',
              fontSize: '18px',
            }}
          >
            <strong>Total</strong>
            <strong>{currency(order.total)}</strong>
          </div>
        </div>

        {/* Área de acréscimo de produtos */}
        {canAddItems && order.status !== 'cancelled' && (
          <section
            style={{
              marginTop: '25px',
              padding: '18px',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              background: '#f0fdf4',
              textAlign: 'left',
            }}
          >
            <h2 style={{ marginBottom: '8px', color: '#166534' }}>
              Quer adicionar mais alguma coisa?
            </h2>

            <p style={{ fontSize: '14px', color: '#166534' }}>
              Você ainda pode acrescentar produtos enquanto o restaurante
              não iniciar a preparação.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                margin: '18px 0',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '9px 13px',
                  borderRadius: '20px',
                  border: selectedCategory === 'all'
                    ? '2px solid #16a34a'
                    : '1px solid #d1d5db',
                  background: selectedCategory === 'all' ? '#dcfce7' : '#fff',
                  cursor: 'pointer',
                }}
              >
                Todos
              </button>

              {categories.map(category => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    padding: '9px 13px',
                    borderRadius: '20px',
                    border: selectedCategory === category.id
                      ? '2px solid #16a34a'
                      : '1px solid #d1d5db',
                    background: selectedCategory === category.id
                      ? '#dcfce7'
                      : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {category.name}
                </button>
              ))}

              {products.some(product => !product.category_id) && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('none')}
                  style={{
                    padding: '9px 13px',
                    borderRadius: '20px',
                    border: selectedCategory === 'none'
                      ? '2px solid #16a34a'
                      : '1px solid #d1d5db',
                    background: selectedCategory === 'none' ? '#dcfce7' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Outros
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <p>Nenhum produto disponível nesta categoria.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                  gap: '12px',
                }}
              >
                {filteredProducts.map(product => (
                  <article
                    key={product.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '125px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          height: '80px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f3f4f6',
                          color: '#6b7280',
                        }}
                      >
                        Sem imagem
                      </div>
                    )}

                    <div style={{ padding: '12px' }}>
                      <strong>{product.name}</strong>

                      {product.description && (
                        <p
                          style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            margin: '5px 0',
                          }}
                        >
                          {product.description}
                        </p>
                      )}

                      <strong>{currency(product.price)}</strong>

                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '10px',
                          padding: '9px',
                          border: 'none',
                          borderRadius: '7px',
                          background: '#16a34a',
                          color: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        + Adicionar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div
                style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: '#fff',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                }}
              >
                <h3 style={{ marginBottom: '12px' }}>
                  Produtos para acrescentar ({cartCount})
                </h3>

                {cart.map(item => (
                  <div
                    key={item.product.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 0',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <div>
                      <strong>{item.product.name}</strong>
                      <p style={{ fontSize: '13px', color: '#6b7280' }}>
                        {currency(item.product.price * item.quantity)}
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.product.id)}
                        aria-label={`Diminuir ${item.product.name}`}
                      >
                        −
                      </button>

                      <strong>{item.quantity}</strong>

                      <button
                        type="button"
                        onClick={() => addToCart(item.product)}
                        aria-label={`Aumentar ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '15px',
                    fontSize: '17px',
                  }}
                >
                  <strong>Valor adicional</strong>
                  <strong>{currency(cartTotal)}</strong>
                </div>

                {addError && (
                  <p
                    role="alert"
                    style={{ color: '#b91c1c', marginTop: '12px' }}
                  >
                    {addError}
                  </p>
                )}

                {addSuccess && (
                  <p
                    role="status"
                    style={{ color: '#15803d', marginTop: '12px' }}
                  >
                    {addSuccess}
                  </p>
                )}

                <button
                  type="button"
                  onClick={addItemsToOrder}
                  disabled={adding}
                  style={{
                    width: '100%',
                    marginTop: '15px',
                    padding: '13px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: adding ? 'wait' : 'pointer',
                    opacity: adding ? 0.7 : 1,
                  }}
                >
                  {adding
                    ? 'Adicionando produtos...'
                    : 'Confirmar acréscimo ao pedido'}
                </button>
              </div>
            )}

            {!addError && addSuccess && cart.length === 0 && (
              <p
                role="status"
                style={{ color: '#15803d', marginTop: '12px' }}
              >
                {addSuccess}
              </p>
            )}
          </section>
        )}

        {order.status === 'preparing' && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: '10px',
              background: '#fef3c7',
              color: '#92400e',
            }}
          >
            <strong>O restaurante já começou a preparar seu pedido.</strong>
            <p style={{ marginBottom: 0 }}>
              Não é mais possível acrescentar produtos.
            </p>
          </div>
        )}

        {['ready', 'out_for_delivery', 'completed'].includes(order.status) && (
          <div
            style={{
              marginTop: '20px',
              padding: '14px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#1e40af',
            }}
          >
            Seu pedido já avançou para uma etapa em que não aceita novos produtos.
          </div>
        )}

        {order.status === 'cancelled' ? (
          <div
            style={{
              marginTop: '25px',
              padding: '20px',
              borderRadius: '12px',
              background: '#fee2e2',
              color: '#991b1b',
            }}
          >
            <h2 style={{ marginBottom: '10px' }}>
              {statusLabel}
            </h2>

            <p>{statusMessage}</p>

            <p style={{ marginTop: '12px', fontSize: '14px' }}>
              Entre em contato com o restaurante para mais informações.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: '25px',
                marginBottom: '25px',
                padding: '18px',
                borderRadius: '12px',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
              }}
            >
              <h2 style={{ color: '#c2410c', marginBottom: '8px' }}>
                {statusLabel}
              </h2>

              <p style={{ color: '#7c2d12' }}>
                {statusMessage}
              </p>
            </div>

            <div style={{ textAlign: 'left', marginTop: '25px' }}>
              <h3 style={{ marginBottom: '20px' }}>
                Etapas do pedido
              </h3>

              {steps.map((step, index) => {
                const completed =
                  currentIndex >= 0 && index <= currentIndex

                const current = index === currentIndex

                return (
                  <div
                    key={step.value}
                    style={{
                      display: 'flex',
                      gap: '15px',
                      minHeight: '85px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        minWidth: '42px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: completed ? '#16a34a' : '#e5e7eb',
                        color: completed ? '#ffffff' : '#6b7280',
                        fontSize: '19px',
                        zIndex: 1,
                      }}
                    >
                      {completed ? '✓' : step.icon}
                    </div>

                    <div style={{ paddingBottom: '20px' }}>
                      <strong
                        style={{
                          color: current ? '#15803d' : '#374151',
                          display: 'block',
                        }}
                      >
                        {step.label}
                        {current ? ' • Atual' : ''}
                      </strong>

                      <span
                        style={{
                          color: '#6b7280',
                          fontSize: '13px',
                        }}
                      >
                        {step.description}
                      </span>
                    </div>

                    {index !== steps.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '20px',
                          top: '42px',
                          width: '2px',
                          height: '43px',
                          background: completed ? '#16a34a' : '#e5e7eb',
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: '20px',
            paddingTop: '15px',
            borderTop: '1px solid #e5e7eb',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          🔄 O acompanhamento é atualizado automaticamente.
        </div>
      </section>
    </main>
  )
}

export default function AcompanharPedido() {
  return (
    <Suspense
      fallback={
        <main className="public-menu">
          <section className="public-order-success">
            <div style={{ fontSize: '45px' }}>🍕</div>
            <h1>Carregando acompanhamento...</h1>
          </section>
        </main>
      }
    >
      <AcompanharPedidoContent />
    </Suspense>
  )
}
