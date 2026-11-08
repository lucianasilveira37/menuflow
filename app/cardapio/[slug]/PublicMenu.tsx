
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Restaurant = {
  id: string
  name: string
  description: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  delivery_validation_mode: 'simple' | 'gps'
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

type Neighborhood = {
  id: string
  name: string
  delivery_fee: number
}

type CartItem = {
  product: Product
  quantity: number
}

function normalizeNeighborhoodName(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export default function PublicMenu({
  slug,
  tableToken,
}: {
  slug: string
  tableToken?: string
}) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')

  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery')
  const [neighborhoodInput, setNeighborhoodInput] = useState('')

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cash' | 'card'>('pix')

  const [orderError, setOrderError] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const [isStoreOpen, setIsStoreOpen] = useState(false)

  const router = useRouter()

  // Carrega restaurante, categorias, produtos e bairros.
  useEffect(() => {
    let active = true

    async function loadMenu() {
      try {
        setLoading(true)
        setError('')

        const { data: restaurantData, error: restaurantError } =
          await supabase
            .from('restaurants')
            .select(
              'id, name, description, phone, address, logo_url, delivery_validation_mode'
            )
            .eq('slug', slug)
            .maybeSingle()

        if (restaurantError) throw restaurantError

        if (!restaurantData) {
          if (active) setError('Restaurante não encontrado.')
          return
        }

        const deliveryMode =
          restaurantData.delivery_validation_mode === 'gps'
            ? 'gps'
            : 'simple'

        const { data: openStatus, error: openStatusError } =
          await supabase.rpc('is_restaurant_open', {
            p_restaurant_id: restaurantData.id,
          })

        if (openStatusError) throw openStatusError

        const [
          categoriesResult,
          productsResult,
          neighborhoodsResult,
        ] = await Promise.all([
          supabase
            .from('categories')
            .select('id, name, position')
            .eq('restaurant_id', restaurantData.id)
            .eq('is_active', true)
            .order('position', { ascending: true }),

          supabase
            .from('products')
            .select(
              'id, category_id, name, description, price, image_url, position'
            )
            .eq('restaurant_id', restaurantData.id)
            .eq('is_available', true)
            .order('position', { ascending: true }),

          supabase
            .from('delivery_neighborhoods')
            .select('id, name, delivery_fee')
            .eq('restaurant_id', restaurantData.id)
            .eq('is_active', true)
            .order('name', { ascending: true }),
        ])

        if (categoriesResult.error) throw categoriesResult.error
        if (productsResult.error) throw productsResult.error
        if (neighborhoodsResult.error) throw neighborhoodsResult.error

        if (!active) return

        setRestaurant({
          ...restaurantData,
          delivery_validation_mode: deliveryMode,
        } as Restaurant)

        setIsStoreOpen(openStatus === true)
        setCategories((categoriesResult.data || []) as Category[])
        setProducts((productsResult.data || []) as Product[])
        setNeighborhoods((neighborhoodsResult.data || []) as Neighborhood[])
      } catch (error) {
        console.error('Erro ao carregar cardápio:', error)

        if (active) {
          setError('Não foi possível carregar o cardápio.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadMenu()

    return () => {
      active = false
    }
  }, [slug])

  // Preenche os dados do cliente cadastrado.
  useEffect(() => {
    let active = true

    async function loadCustomerProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError) throw authError
        if (!user || !active) return

        const { data: profile, error: profileError } = await supabase
          .from('customer_profiles')
          .select(`
            full_name,
            document,
            phone,
            postal_code,
            street,
            address_number,
            complement,
            neighborhood,
            city,
            state
          `)
          .eq('user_id', user.id)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile || !active) return

        const addressParts = [
          profile.street,
          profile.address_number,
          profile.complement,
          profile.neighborhood,
          profile.city,
          profile.state,
          profile.postal_code
            ? `CEP: ${profile.postal_code}`
            : '',
        ].filter((part) => part && String(part).trim())

        setCustomerName(profile.full_name || '')
        setCustomerPhone(profile.phone || '')
        setDeliveryAddress(addressParts.join(', '))
        setNeighborhoodInput(profile.neighborhood || '')
      } catch (error) {
        console.error('Erro ao carregar cadastro do cliente:', error)
      }
    }

    loadCustomerProfile()

    return () => {
      active = false
    }
  }, [])

  // Atualiza o funcionamento da loja a cada 30 segundos.
  useEffect(() => {
    const restaurantId = restaurant?.id
    if (!restaurantId) return

    let active = true

    async function checkStoreStatus() {
      const { data, error } = await supabase.rpc('is_restaurant_open', {
        p_restaurant_id: restaurantId,
      })

      if (error) {
        console.error('Erro ao consultar funcionamento da loja:', error)
        return
      }

      if (active) setIsStoreOpen(data === true)
    }

    checkStoreStatus()

    const intervalId = setInterval(checkStoreStatus, 30000)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [restaurant?.id])

  const filteredProducts = products.filter((product) => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'none') return !product.category_id
    return product.category_id === selectedCategory
  })

  function formatPrice(price: number) {
    return Number(price).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatDeliveryFee(price: number) {
    const fee = Number(price)
    return fee === 0 ? 'Grátis' : formatPrice(fee)
  }

  // Adiciona produto e abre o carrinho.
  function addToCart(product: Product) {
    if (!isStoreOpen) return

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.product.id === product.id
      )

      if (existing) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentCart, { product, quantity: 1 }]
    })

    setCartOpen(true)
  }

  function decreaseQuantity(productId: string) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.product.price) * item.quantity,
    0
  )

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  )

  const selectedNeighborhood = neighborhoods.find(
    (neighborhood) =>
      normalizeNeighborhoodName(neighborhood.name) ===
      normalizeNeighborhoodName(neighborhoodInput)
  )

  const deliveryFee =
    orderType === 'delivery' && selectedNeighborhood
      ? Number(selectedNeighborhood.delivery_fee)
      : 0

  const finalTotal = cartTotal + deliveryFee

  const deliveryMode = restaurant?.delivery_validation_mode ?? 'simple'
  const requiresGps = deliveryMode === 'gps'

  // Finaliza o pedido.
  async function finishOrder() {
    if (savingOrder) return

    setOrderError('')

    const restaurantId = restaurant?.id

    if (!restaurantId) {
      setOrderError('Não foi possível identificar a loja.')
      return
    }

    if (!isStoreOpen) {
      setOrderError('Nossa loja está fechada no momento.')
      return
    }

    if (cart.length === 0) {
      setOrderError('Adicione produtos ao carrinho.')
      return
    }

    if (!customerName.trim()) {
      setOrderError('Informe seu nome.')
      return
    }

    if (!customerPhone.trim()) {
      setOrderError('Informe seu WhatsApp com DDD.')
      return
    }

    if (!tableToken && orderType === 'delivery') {
      if (!deliveryAddress.trim()) {
        setOrderError('Informe seu endereço de entrega.')
        return
      }

      if (!neighborhoodInput.trim()) {
        setOrderError('Digite o nome do seu bairro.')
        return
      }

      if (!selectedNeighborhood) {
        setOrderError(
          'Bairro não encontrado. Digite o nome de um bairro cadastrado para entrega.'
        )
        return
      }
    }

    setSavingOrder(true)

    try {
      const digits = customerPhone.replace(/\D/g, '')

      const normalizedPhone = digits.startsWith('55')
        ? digits
        : `55${digits}`

      const items = cart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }))

      let result: { data: any; error: any }

      if (tableToken) {
        result = await supabase.rpc(
          'create_public_table_order_with_tracking',
          {
            p_table_token: tableToken,
            p_items: items,
            p_customer_name: customerName.trim(),
            p_customer_phone: normalizedPhone,
          }
        )
      } else if (orderType === 'delivery') {
        if (!selectedNeighborhood) {
          throw new Error('Informe um bairro válido para entrega.')
        }

        if (deliveryMode === 'simple') {
          result = await supabase.rpc(
            'create_public_order_with_tracking',
            {
              p_restaurant_id: restaurantId,
              p_customer_name: customerName.trim(),
              p_customer_phone: normalizedPhone,
              p_order_type: 'delivery',
              p_neighborhood_id: selectedNeighborhood.id,
              p_delivery_address: deliveryAddress.trim(),
              p_items: items,
              p_payment_method: paymentMethod,
            }
          )
        } else {
          if (!navigator.geolocation) {
            throw new Error(
              'Seu navegador não oferece suporte à localização GPS.'
            )
          }

          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 15000,
                  maximumAge: 0,
                }
              )
            }
          ).catch((error: unknown) => {
            const geoError = error as GeolocationPositionError

            if (geoError.code === 1) {
              throw new Error(
                'Você precisa permitir o acesso à localização para confirmar uma entrega.'
              )
            }

            if (geoError.code === 2) {
              throw new Error(
                'Não foi possível identificar sua localização. Verifique o GPS do dispositivo.'
              )
            }

            if (geoError.code === 3) {
              throw new Error(
                'A localização demorou muito para responder. Tente novamente.'
              )
            }

            throw new Error('Não foi possível obter sua localização.')
          })

          result = await supabase.rpc(
            'create_public_order_with_tracking_and_location',
            {
              p_restaurant_id: restaurantId,
              p_customer_name: customerName.trim(),
              p_customer_phone: normalizedPhone,
              p_order_type: 'delivery',
              p_neighborhood_id: selectedNeighborhood.id,
              p_delivery_address: deliveryAddress.trim(),
              p_items: items,
              p_latitude: position.coords.latitude,
              p_longitude: position.coords.longitude,
              p_payment_method: paymentMethod,
            }
          )
        }
      } else {
        result = await supabase.rpc(
          'create_public_order_with_tracking',
          {
            p_restaurant_id: restaurantId,
            p_customer_name: customerName.trim(),
            p_customer_phone: normalizedPhone,
            p_order_type: 'pickup',
            p_neighborhood_id: null,
            p_delivery_address: null,
            p_items: items,
            p_payment_method: paymentMethod,
          }
        )
      }

      if (result.error) {
        console.error('Erro retornado pelo Supabase:', result.error)
        throw new Error(result.error.message)
      }

      const orderData = result.data as {
        id?: string
        tracking_token?: string
      } | null

      if (!orderData?.id || !orderData?.tracking_token) {
        throw new Error(
          'O pedido foi criado, mas não foi possível obter o token de acompanhamento.'
        )
      }

      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setDeliveryAddress('')
      setNeighborhoodInput('')
      setOrderType('delivery')
      setPaymentMethod('pix')
      setCartOpen(false)

      router.push(
        `/acompanhar/${orderData.id}?token=${encodeURIComponent(
          orderData.tracking_token
        )}`
      )
    } catch (error: unknown) {
      console.error('Erro ao salvar pedido:', error)

      setOrderError(
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao salvar o pedido.'
      )
    } finally {
      setSavingOrder(false)
    }
  }

  if (loading) {
    return (
      <main className="public-menu">
        <style>{publicMenuStyles}</style>
        <div className="pm-loading">
          <span className="pm-loader" />
          <p>Preparando seu cardápio...</p>
        </div>
      </main>
    )
  }

  if (error || !restaurant) {
    return (
      <main className="public-menu">
        <style>{publicMenuStyles}</style>
        <div className="pm-error-page">
          <span>🍽️</span>
          <h1>Cardápio indisponível</h1>
          <p>{error || 'Restaurante não encontrado.'}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="public-menu">
      <style>{publicMenuStyles}</style>

      <header className="public-menu-header">
        <div className="pm-header-content">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`Logo de ${restaurant.name}`}
              className="public-menu-logo"
            />
          ) : (
            <div className="pm-logo-placeholder">🍴</div>
          )}

          <div className="pm-header-text">
            <span className="pm-eyebrow">
              BEM-VINDO AO NOSSO CARDÁPIO
            </span>

            <h1>{restaurant.name}</h1>

            {restaurant.description && (
              <p className="pm-description">
                {restaurant.description}
              </p>
            )}

            <div className="pm-restaurant-details">
              {restaurant.phone && (
                <span>☎ {restaurant.phone}</span>
              )}

              {restaurant.address && (
                <span>📍 {restaurant.address}</span>
              )}
            </div>

            <span
              className={
                isStoreOpen
                  ? 'public-status open'
                  : 'public-status closed'
              }
            >
              <span className="pm-status-dot" />
              {isStoreOpen ? 'Aberto agora' : 'Fechado agora'}
            </span>
          </div>
        </div>
      </header>

      {!isStoreOpen && (
        <div className="pm-closed-notice" role="status">
          <span>⏰</span>
          <div>
            <strong>Estamos fechados no momento.</strong>
            <p>
              Você poderá fazer seu pedido quando a loja abrir novamente.
            </p>
          </div>
        </div>
      )}

      {/* Carrinho fixo */}
      <div className="public-cart-top">
        <button
          type="button"
          className="public-cart-toggle"
          onClick={() => setCartOpen((open) => !open)}
          aria-expanded={cartOpen}
        >
          <span className="pm-cart-icon">🛒</span>
          <span className="pm-cart-label">Meu pedido</span>
          <span className="public-cart-count">{cartCount}</span>
          <strong>{formatPrice(cartTotal)}</strong>
          <span className="pm-cart-chevron">
            {cartOpen ? '⌃' : '⌄'}
          </span>
        </button>
      </div>

      {/* Conteúdo do carrinho */}
      {cartOpen && (
        <section className="public-cart">
          <div className="pm-cart-heading">
            <div>
              <span className="pm-section-eyebrow">SEU PEDIDO</span>
              <h2>Meu carrinho</h2>
            </div>

            <button
              type="button"
              className="pm-close-cart"
              onClick={() => setCartOpen(false)}
              aria-label="Fechar carrinho"
            >
              ×
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="pm-empty-cart">
              <span>🛍️</span>
              <strong>Seu carrinho está vazio</strong>
              <p>Escolha seus produtos favoritos no cardápio.</p>
            </div>
          ) : (
            <>
              <div className="pm-cart-items">
                {cart.map((item) => (
                  <div
                    className="public-cart-item"
                    key={item.product.id}
                  >
                    <div className="public-cart-product">
                      <strong>{item.product.name}</strong>
                      <span>
                        {formatPrice(
                          Number(item.product.price) * item.quantity
                        )}
                      </span>
                    </div>

                    <div className="public-cart-controls">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(item.product.id)
                        }
                        aria-label={`Diminuir ${item.product.name}`}
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() => addToCart(item.product)}
                        disabled={!isStoreOpen}
                        aria-label={`Aumentar ${item.product.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="public-checkout">
                {!tableToken ? (
                  <>
                    <h3>Como deseja receber seu pedido?</h3>

                    <div className="pm-order-types">
                      <button
                        type="button"
                        className={
                          orderType === 'delivery'
                            ? 'pm-type-active'
                            : ''
                        }
                        onClick={() => {
                          setOrderType('delivery')
                          setOrderError('')
                        }}
                      >
                        <span>🛵</span>
                        Entrega
                      </button>

                      <button
                        type="button"
                        className={
                          orderType === 'pickup'
                            ? 'pm-type-active'
                            : ''
                        }
                        onClick={() => {
                          setOrderType('pickup')
                          setNeighborhoodInput('')
                          setOrderError('')
                        }}
                      >
                        <span>🏪</span>
                        Retirada
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pm-table-notice">
                    <strong>🍽️ Pedido na mesa</strong>
                    <p>
                      Seu pedido será enviado diretamente para a equipe
                      do restaurante.
                    </p>
                  </div>
                )}

                {!tableToken && orderType === 'delivery' && (
                  <>
                    {requiresGps ? (
                      <div className="pm-info-box pm-gps-info">
                        <strong>📍 Entrega com validação GPS</strong>
                        <p>
                          Será necessário permitir o acesso à localização
                          para confirmar a entrega.
                        </p>
                      </div>
                    ) : (
                      <div className="pm-info-box pm-simple-info">
                        <strong>✓ Entrega por bairro</strong>
                        <p>
                          Informe seu bairro cadastrado. Não é necessário
                          compartilhar sua localização GPS.
                        </p>
                      </div>
                    )}

                    <label htmlFor="delivery-address">
                      Endereço de entrega
                    </label>

                    <textarea
                      id="delivery-address"
                      placeholder="Rua, número, complemento, bairro e cidade"
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value)
                        setOrderError('')
                      }}
                      rows={3}
                    />

                    <label htmlFor="delivery-neighborhood">
                      Bairro
                    </label>

                    <input
                      id="delivery-neighborhood"
                      type="text"
                      placeholder="Digite o nome do seu bairro"
                      value={neighborhoodInput}
                      onChange={(e) => {
                        setNeighborhoodInput(e.target.value)
                        setOrderError('')
                      }}
                      autoComplete="off"
                    />

                    {neighborhoods.length === 0 && (
                      <p role="alert" className="pm-field-warning">
                        Nenhum bairro está disponível para entrega no
                        momento. Você pode escolher retirada no local.
                      </p>
                    )}
                  </>
                )}

                {!tableToken && orderType === 'pickup' && (
                  <div className="pm-pickup-info">
                    Você deverá retirar seu pedido no endereço da loja:
                    <strong>
                      {restaurant.address || restaurant.name}
                    </strong>
                  </div>
                )}

                <div className="pm-form-divider" />

                <h3>Seus dados</h3>

                <label htmlFor="customer-name">Seu nome</label>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="Digite seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />

                <label htmlFor="customer-phone">
                  Seu WhatsApp com DDD
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="Ex.: (88) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />

                {!tableToken && (
                  <div className="pm-payment">
                    <h3>Forma de pagamento</h3>

                    <div className="pm-payment-options">
                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="pix"
                          checked={paymentMethod === 'pix'}
                          onChange={() => setPaymentMethod('pix')}
                        />
                        <span>PIX</span>
                      </label>

                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={paymentMethod === 'cash'}
                          onChange={() => setPaymentMethod('cash')}
                        />
                        <span>Dinheiro</span>
                      </label>

                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                        />
                        <span>Cartão</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="pm-total-box">
                  <div className="public-cart-total">
                    <span>Subtotal</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>

                  <div className="public-cart-total">
                    <span>Taxa de entrega</span>
                    <strong>
                      {orderType === 'pickup'
                        ? 'Grátis'
                        : selectedNeighborhood
                          ? formatDeliveryFee(deliveryFee)
                          : 'Informe um bairro válido'}
                    </strong>
                  </div>

                  <div className="public-cart-total pm-grand-total">
                    <span>Total do pedido</span>
                    <strong>
                      {orderType === 'pickup' || selectedNeighborhood
                        ? formatPrice(finalTotal)
                        : '—'}
                    </strong>
                  </div>
                </div>

                {orderError && (
                  <p className="public-checkout-error" role="alert">
                    {orderError}
                  </p>
                )}

                <button
                  type="button"
                  className="public-whatsapp-button"
                  onClick={finishOrder}
                  disabled={
                    savingOrder ||
                    !isStoreOpen ||
                    (!tableToken &&
                      orderType === 'delivery' &&
                      neighborhoods.length === 0)
                  }
                >
                  {!isStoreOpen
                    ? 'Loja fechada'
                    : savingOrder
                      ? 'Enviando pedido...'
                      : tableToken
                        ? 'Enviar pedido à mesa'
                        : 'Confirmar pedido'}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Cardápio */}
      <section className="public-menu-content">
        <div className="pm-menu-heading">
          <div>
            <span className="pm-section-eyebrow">
              FEITO COM CARINHO
            </span>
            <h2>Nosso cardápio</h2>
            <p>Escolha seus favoritos e faça seu pedido.</p>
          </div>

          <span className="pm-menu-decoration">✦</span>
        </div>

        {/* Categorias */}
        <div className="public-category-filters">
          <button
            type="button"
            className={
              selectedCategory === 'all' ? 'selected' : ''
            }
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </button>

          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={
                selectedCategory === category.id ? 'selected' : ''
              }
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}

          {products.some((product) => !product.category_id) && (
            <button
              type="button"
              className={
                selectedCategory === 'none' ? 'selected' : ''
              }
              onClick={() => setSelectedCategory('none')}
            >
              Outros
            </button>
          )}
        </div>

        {/* Produtos */}
        {filteredProducts.length === 0 ? (
          <div className="public-empty">
            <span>🍽️</span>
            <p>Nenhum produto disponível nesta categoria.</p>
          </div>
        ) : (
          <div className="public-products-grid">
            {filteredProducts.map((product) => (
              <article
                className="public-product-card"
                key={product.id}
              >
                <div className="public-product-image">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="public-product-placeholder">
                      <span>🍴</span>
                      <small>Sem imagem</small>
                    </div>
                  )}
                </div>

                <div className="public-product-info">
                  <div>
                    <h3>{product.name}</h3>

                    {product.description && (
                      <p>{product.description}</p>
                    )}
                  </div>

                  <div className="pm-product-bottom">
                    <strong>{formatPrice(product.price)}</strong>

                    <button
                      type="button"
                      className="add-cart-button"
                      onClick={() => addToCart(product)}
                      disabled={!isStoreOpen}
                      aria-label={`Adicionar ${product.name} ao carrinho`}
                    >
                      {isStoreOpen ? '🛒' : 'Fechado'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="public-menu-footer">
        <span>✦</span>
        Cardápio digital criado com <strong>MenuFlow</strong>
      </footer>
    </main>
  )
}

const publicMenuStyles = `
  
.public-menu {
  --pm-orange: #f45b35;
  --pm-orange-dark: #df4828;
  --pm-purple: #6941c6;
  --pm-green: #75b843;
  --pm-cream: #fff5e8;
  --pm-text: #29232b;
  --pm-muted: #81737a;

  min-height: 100vh;
  padding-bottom: 105px;
  background: var(--pm-cream);
  color: var(--pm-text);
  font-family: Arial, Helvetica, sans-serif;
}

.public-menu * {
  box-sizing: border-box;
}

/* CABEÇALHO */
.public-menu-header {
  padding: 38px 20px;
  color: white;
  background: linear-gradient(125deg, #f45b35, #ff824e);
  border-radius: 0 0 30px 30px;
  box-shadow: 0 8px 25px rgba(244,91,53,.16);
}

.pm-header-content {
  display: flex;
  align-items: center;
  gap: 22px;
  width: min(100%, 1050px);
  margin: auto;
}

.public-menu-logo,
.pm-logo-placeholder {
  width: 115px;
  height: 115px;
  min-width: 115px;
  border-radius: 24px;
  object-fit: cover;
  background: white;
  border: 4px solid rgba(255,255,255,.8);
  box-shadow: 0 5px 15px rgba(0,0,0,.12);
}

.pm-logo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 43px;
}

.pm-header-text {
  min-width: 0;
}

.pm-eyebrow {
  color: #fff1df;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.7px;
}

.pm-header-text h1 {
  margin: 8px 0;
  font-size: 32px;
  font-weight: 900;
}

.pm-description {
  margin: 7px 0;
  color: white;
  font-size: 14px;
  line-height: 1.6;
}

.pm-restaurant-details {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 13px 0;
  color: white;
  font-size: 13px;
}

.public-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 30px;
  background: rgba(255,255,255,.2);
  font-size: 12px;
  font-weight: 800;
}

.pm-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #a8f078;
}

.public-status.closed .pm-status-dot {
  background: #ffcfbf;
}

/* AVISO DE LOJA FECHADA */
.pm-closed-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  width: min(calc(100% - 32px), 1050px);
  margin: 20px auto;
  padding: 16px;
  border: 1px solid #ffd9c7;
  border-radius: 16px;
  background: #fff0e8;
  color: #a64225;
}

.pm-closed-notice p {
  margin: 4px 0 0;
  font-size: 13px;
}

/* CONTEÚDO */
.public-menu-content {
  width: min(calc(100% - 32px), 1100px);
  margin: 38px auto;
}

.pm-menu-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 23px;
}

.pm-section-eyebrow {
  color: var(--pm-purple);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.5px;
}

.pm-menu-heading h2 {
  margin: 7px 0;
  color: var(--pm-text);
  font-size: 30px;
  font-weight: 900;
}

.pm-menu-heading p {
  margin: 0;
  color: var(--pm-muted);
  font-size: 14px;
}

.pm-menu-decoration {
  color: var(--pm-orange);
  font-size: 40px;
}

/* CATEGORIAS */
.public-category-filters {
  display: flex;
  gap: 11px;
  overflow-x: auto;
  padding: 5px 0 18px;
  margin-bottom: 14px;
  scrollbar-width: thin;
}

.public-category-filters button {
  flex-shrink: 0;
  padding: 12px 21px;
  border: 1px solid #f2dfd3;
  border-radius: 30px;
  background: white;
  color: #6941a5;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: .2s;
}

.public-category-filters button:hover {
  border-color: var(--pm-orange);
  color: var(--pm-orange);
  transform: translateY(-2px);
}

.public-category-filters button.selected {
  border-color: var(--pm-purple);
  background: var(--pm-purple);
  color: white;
  box-shadow: 0 5px 13px rgba(105,65,198,.2);
}

/* GRADE DE PRODUTOS */
.public-products-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

/* CARD */
.public-product-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  padding: 0;
  border: 1px solid #f3e5dc;
  border-radius: 22px;
  background: white;
  box-shadow: 0 4px 15px rgba(65,40,25,.055);
  transition: transform .25s, box-shadow .25s;
}

.public-product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 25px rgba(65,40,25,.12);
}

/* FOTO */
.public-product-image {
  width: 100%;
  min-width: 0;
  height: 205px;
  overflow: hidden;
  border-radius: 0;
  background: #fff0e8;
}

.public-product-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform .35s;
}

.public-product-card:hover .public-product-image img {
  transform: scale(1.04);
}

.public-product-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 7px;
  color: var(--pm-orange);
}

.public-product-placeholder span {
  font-size: 45px;
}

.public-product-placeholder small {
  font-size: 12px;
}

/* INFORMAÇÕES DO PRODUTO */
.public-product-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  justify-content: space-between;
  gap: 15px;
  width: 100%;
  padding: 17px;
}

.public-product-info h3 {
  margin: 0 0 9px;
  color: var(--pm-text);
  font-size: 18px;
  line-height: 1.35;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.public-product-info p {
  display: block;
  margin: 0;
  color: #81737a;
  font-size: 13px;
  line-height: 1.65;
  white-space: normal;
  overflow: visible;
  overflow-wrap: anywhere;
  -webkit-line-clamp: unset;
  line-clamp: unset;
}

/* PREÇO E BOTÃO */
.pm-product-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #f5eee9;
}

.pm-product-bottom strong {
  color: var(--pm-green);
  font-size: 20px;
  font-weight: 900;
}

.add-cart-button {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 43px;
  height: 43px;
  padding: 0;
  border: none;
  border-radius: 14px;
  background: var(--pm-orange);
  color: white;
  font-size: 28px;
  font-weight: 600;
  cursor: pointer;
  transition: .2s;
}
 

.add-cart-button:hover:not(:disabled) {
  background: var(--pm-orange-dark);
  transform: scale(1.06);
}

.add-cart-button:disabled {
  width: auto;
  min-width: 65px;
  padding: 0 10px;
  border-radius: 12px;
  background: #aab5ac;
  font-size: 11px;
  cursor: not-allowed;
}

/* SEM PRODUTOS */
.public-empty {
  padding: 45px 20px;
  border-radius: 20px;
  background: white;
  color: var(--pm-muted);
  text-align: center;
}

.public-empty span {
  display: block;
  margin-bottom: 10px;
  font-size: 42px;
}

/* CARRINHO FIXO */
.public-cart-top {
  position: fixed;
  z-index: 50;
  bottom: 16px;
  left: 50%;
  width: min(520px, calc(100% - 24px));
  transform: translateX(-50%);
}

.public-cart-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 62px;
  padding: 12px 19px;
  border: none;
  border-radius: 18px;
  background: linear-gradient(110deg, #f45b35, #ff824e);
  color: white;
  box-shadow: 0 10px 30px rgba(244,91,53,.3);
  cursor: pointer;
}

.pm-cart-label {
  font-weight: 900;
}

.public-cart-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 25px;
  height: 25px;
  border-radius: 50%;
  background: white;
  color: var(--pm-orange);
  font-size: 12px;
  font-weight: 900;
}

/* PAINEL DO CARRINHO */
.public-cart {
  position: fixed;
  z-index: 60;
  top: 16px;
  right: 16px;
  bottom: 16px;
  width: min(440px, calc(100vw - 32px));
  margin: 0;
  padding: 21px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid #f2dfd3;
  border-radius: 22px;
  background: white;
  box-shadow: 0 18px 60px rgba(41,35,43,.2);
}

.pm-cart-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.pm-cart-heading h2 {
  margin: 5px 0 0;
  color: var(--pm-orange);
  font-weight: 900;
}

.pm-close-cart {
  width: 37px;
  height: 37px;
  border: 0;
  border-radius: 50%;
  background: #fff0e8;
  color: var(--pm-orange);
  font-size: 25px;
  cursor: pointer;
}

.pm-empty-cart {
  padding: 25px 10px;
  color: #737c75;
  text-align: center;
}

.pm-empty-cart span {
  display: block;
  margin-bottom: 10px;
  font-size: 38px;
}

.pm-empty-cart p {
  font-size: 13px;
}

.pm-cart-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.public-cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1e9e4;
}

.public-cart-product {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.public-cart-product strong {
  font-size: 13px;
}

.public-cart-product span {
  color: var(--pm-green);
  font-size: 13px;
  font-weight: 800;
}

.public-cart-controls {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.public-cart-controls button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 10px;
  background: #f0eaff;
  color: var(--pm-purple);
  font-size: 19px;
  cursor: pointer;
}

/* FINALIZAÇÃO */
.public-checkout {
  display: flex;
  flex-direction: column;
  gap: 11px;
  margin-top: 22px;
}

.public-checkout h3 {
  margin: 8px 0;
  color: var(--pm-purple);
  font-size: 16px;
  font-weight: 900;
}

.public-checkout label {
  color: #39463d;
  font-size: 13px;
  font-weight: 700;
}

.public-checkout input:not([type="radio"]),
.public-checkout textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #eaded7;
  border-radius: 11px;
  background: white;
  font: inherit;
  font-size: 14px;
}

.public-checkout textarea {
  resize: vertical;
}

.pm-order-types,
.pm-payment-options {
  display: flex;
  gap: 9px;
}

.pm-order-types button {
  flex: 1;
  padding: 12px 8px;
  border: 1px solid #eaded7;
  border-radius: 12px;
  background: white;
  color: var(--pm-purple);
  font-weight: 800;
  cursor: pointer;
}

.pm-order-types button.pm-type-active {
  border-color: var(--pm-purple);
  background: #f0eaff;
  color: var(--pm-purple);
}

.pm-info-box,
.pm-table-notice,
.pm-pickup-info {
  padding: 14px;
  border-radius: 12px;
  background: #edf7e7;
  color: #426e2b;
  font-size: 13px;
}

.pm-info-box p,
.pm-table-notice p {
  margin: 5px 0 0;
}

.pm-pickup-info strong {
  display: block;
  margin-top: 7px;
}

.pm-field-warning,
.public-checkout-error {
  color: #b23a32;
  font-size: 13px;
}

.pm-form-divider {
  height: 1px;
  margin: 12px 0;
  background: #f0e5de;
}

.pm-payment-options {
  flex-wrap: wrap;
}

.pm-payment-options label {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px;
  border: 1px solid #eaded7;
  border-radius: 10px;
}

.pm-total-box {
  padding: 15px;
  border-radius: 13px;
  background: #fff5e8;
}

.public-cart-total {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 9px 0;
  font-size: 13px;
}

.pm-grand-total {
  padding-top: 11px;
  border-top: 1px solid #f0dccc;
  color: var(--pm-orange);
  font-size: 16px;
  font-weight: 900;
}

.public-whatsapp-button {
  width: 100%;
  padding: 16px;
  border: 0;
  border-radius: 13px;
  background: var(--pm-green);
  color: white;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
  transition: .2s;
}

.public-whatsapp-button:hover:not(:disabled) {
  background: #5f9e35;
}

.public-whatsapp-button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

/* CARREGAMENTO E ERRO */
.pm-loading,
.pm-error-page {
  display: flex;
  min-height: 75vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 25px;
  text-align: center;
}

.pm-loader {
  width: 38px;
  height: 38px;
  border: 4px solid #ffe0d2;
  border-top-color: var(--pm-orange);
  border-radius: 50%;
  animation: pm-spin .8s linear infinite;
}

@keyframes pm-spin {
  to {
    transform: rotate(360deg);
  }
}

.pm-error-page > span {
  font-size: 45px;
}

.pm-error-page h1 {
  margin: 0;
  color: var(--pm-orange);
}

.pm-error-page p {
  color: var(--pm-muted);
}

/* RODAPÉ */
.public-menu-footer {
  padding: 30px 15px;
  color: #858d86;
  font-size: 12px;
  text-align: center;
}

.public-menu-footer span {
  color: var(--pm-orange);
}

/* TABLETS E COMPUTADORES */
@media (min-width: 850px) {
  .public-products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* CELULARES */
@media (max-width: 600px) {
  .public-menu-header {
    padding: 25px 16px;
  }

  .pm-header-content {
    align-items: flex-start;
    gap: 13px;
  }

  .public-menu-logo,
  .pm-logo-placeholder {
    width: 76px;
    height: 76px;
    min-width: 76px;
    border-radius: 17px;
  }

  .pm-header-text h1 {
    font-size: 21px;
  }

  .pm-description {
    font-size: 12px;
    line-height: 1.5;
  }

  .pm-restaurant-details {
    flex-direction: column;
    gap: 6px;
  }

  .public-menu-content {
    width: calc(100% - 24px);
    margin: 27px auto;
  }

  .pm-menu-heading h2 {
    font-size: 25px;
  }

  .public-products-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .public-product-card {
    border-radius: 18px;
  }

  .public-product-image {
    height: 195px;
  }

  .public-product-info {
    padding: 15px;
  }

  .public-product-info h3 {
    font-size: 17px;
  }

  .public-product-info p {
    font-size: 12px;
    line-height: 1.6;
  }

  .pm-product-bottom strong {
    font-size: 18px;
  }

  .public-cart-top {
    bottom: 12px;
    width: calc(100% - 24px);
  }

  .public-cart {
    top: auto;
    right: 10px;
    bottom: 10px;
    left: 10px;
    width: auto;
    max-height: 86dvh;
    padding: 17px;
  }
}
`
