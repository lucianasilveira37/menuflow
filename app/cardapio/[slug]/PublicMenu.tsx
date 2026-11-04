
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

        console.log('MENU CARREGADO:', {
          restaurant: restaurantData.name,
          restaurantId: restaurantData.id,
          deliveryMode,
        })

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

  // O modo é definido pelo restaurante carregado do Supabase.
  const deliveryMode = restaurant?.delivery_validation_mode ?? 'simple'
  const requiresGps = deliveryMode === 'gps'

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

      let result

      console.log('FINALIZANDO PEDIDO:', {
        restaurantId,
        deliveryMode,
        requiresGps,
        orderType,
        neighborhood: selectedNeighborhood?.name,
      })

      // PEDIDO POR MESA
      if (tableToken) {
        console.log('CHAMANDO RPC DE PEDIDO NA MESA')

        result = await supabase.rpc(
          'create_public_table_order_with_tracking',
          {
            p_table_token: tableToken,
            p_items: items,
            p_customer_name: customerName.trim(),
            p_customer_phone: normalizedPhone,
          }
        )
      }

      // PEDIDO DE ENTREGA
      else if (orderType === 'delivery') {
        if (!selectedNeighborhood) {
          throw new Error('Informe um bairro válido para entrega.')
        }

        // MODO SIMPLES: NÃO SOLICITA GPS.
        if (deliveryMode === 'simple') {
          console.log('CHAMANDO RPC SEM GPS: create_public_order_with_tracking')

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
            }
          )
        }

        // MODO GPS: SOLICITA LOCALIZAÇÃO.
        else {
          console.log('CHAMANDO RPC COM GPS: create_public_order_with_tracking_and_location')

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
          ).catch((error: GeolocationPositionError) => {
            if (error.code === 1) {
              throw new Error(
                'Você precisa permitir o acesso à localização para confirmar uma entrega.'
              )
            }

            if (error.code === 2) {
              throw new Error(
                'Não foi possível identificar sua localização. Verifique o GPS do dispositivo.'
              )
            }

            if (error.code === 3) {
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
            }
          )
        }
      }

      // RETIRADA NO LOCAL
      else {
        console.log('CHAMANDO RPC DE RETIRADA')

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
          }
        )
      }

      if (result.error) {
        console.error('ERRO RETORNADO PELO SUPABASE:', result.error)
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

      console.log('PEDIDO CRIADO COM SUCESSO:', orderData.id)

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
        <p>Carregando cardápio...</p>
      </main>
    )
  }

  if (error || !restaurant) {
    return (
      <main className="public-menu">
        <h1>Cardápio indisponível</h1>
        <p>{error || 'Restaurante não encontrado.'}</p>
      </main>
    )
  }

  return (
    <main className="public-menu">
      <header className="public-menu-header">
        {restaurant.logo_url && (
          <img
            src={restaurant.logo_url}
            alt={`Logo de ${restaurant.name}`}
            className="public-menu-logo"
          />
        )}

        <h1>{restaurant.name}</h1>

        {restaurant.description && <p>{restaurant.description}</p>}
        {restaurant.phone && <p>WhatsApp: {restaurant.phone}</p>}
        {restaurant.address && <p>Endereço: {restaurant.address}</p>}

        <span className={isStoreOpen ? 'public-status open' : 'public-status closed'}>
          {isStoreOpen ? 'Aberto agora' : 'Fechado agora'}
        </span>
      </header>

      {!isStoreOpen && (
        <div
          role="status"
          style={{
            background: '#fff0e8',
            color: '#a64216',
            padding: 15,
            borderRadius: 10,
            textAlign: 'center',
            margin: '15px 0',
          }}
        >
          <strong>Estamos fechados no momento.</strong>
          <p style={{ marginBottom: 0 }}>
            Você poderá fazer seu pedido quando a loja abrir novamente.
          </p>
        </div>
      )}

      <div className="public-cart-top">
        <button
          type="button"
          className="public-cart-toggle"
          onClick={() => setCartOpen((open) => !open)}
          aria-expanded={cartOpen}
        >
          <span>🛒</span>
          <span>Meu pedido</span>
          <span className="public-cart-count">{cartCount}</span>
          <strong>{formatPrice(cartTotal)}</strong>
        </button>
      </div>

      {cartOpen && (
        <section className="public-cart">
          <h2>Meu pedido</h2>

          {cart.length === 0 ? (
            <p>Seu carrinho está vazio.</p>
          ) : (
            <>
              {cart.map((item) => (
                <div className="public-cart-item" key={item.product.id}>
                  <div className="public-cart-product">
                    <strong>{item.product.name}</strong>
                    <span>
                      {formatPrice(Number(item.product.price) * item.quantity)}
                    </span>
                  </div>

                  <div className="public-cart-controls">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.product.id)}
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

              <div className="public-checkout">
                {!tableToken ? (
                  <>
                    <h3>Como deseja receber seu pedido?</h3>

                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        flexWrap: 'wrap',
                        marginBottom: 18,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOrderType('delivery')
                          setOrderError('')
                        }}
                        style={{
                          padding: '12px 18px',
                          borderRadius: 8,
                          border: orderType === 'delivery'
                            ? '2px solid #16a34a'
                            : '1px solid #ccc',
                          background: orderType === 'delivery' ? '#ecfdf5' : '#fff',
                          color: '#222',
                          cursor: 'pointer',
                        }}
                      >
                        🛵 Entrega
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOrderType('pickup')
                          setNeighborhoodInput('')
                          setOrderError('')
                        }}
                        style={{
                          padding: '12px 18px',
                          borderRadius: 8,
                          border: orderType === 'pickup'
                            ? '2px solid #16a34a'
                            : '1px solid #ccc',
                          background: orderType === 'pickup' ? '#ecfdf5' : '#fff',
                          color: '#222',
                          cursor: 'pointer',
                        }}
                      >
                        🏪 Retirada no local
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: 14,
                      background: '#ecfdf5',
                      borderRadius: 10,
                      marginBottom: 18,
                    }}
                  >
                    <strong>🍽️ Pedido na mesa</strong>
                    <p>
                      Seu pedido será enviado diretamente para a equipe do restaurante.
                    </p>
                  </div>
                )}

                {!tableToken && orderType === 'delivery' && (
                  <>
                    {requiresGps ? (
                      <div
                        style={{
                          padding: 12,
                          background: '#eff6ff',
                          borderRadius: 8,
                          marginBottom: 14,
                          color: '#1e40af',
                          fontSize: 13,
                        }}
                      >
                        Este restaurante utiliza validação por GPS.
                        Será necessário permitir o acesso à localização
                        para confirmar a entrega.
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: 12,
                          background: '#f0fdf4',
                          borderRadius: 8,
                          marginBottom: 14,
                          color: '#166534',
                          fontSize: 13,
                        }}
                      >
                        Informe seu bairro cadastrado. Não é necessário
                        compartilhar sua localização GPS.
                      </div>
                    )}

                    <label htmlFor="delivery-address">
                      Endereço de entrega
                    </label>

                    <textarea
                      id="delivery-address"
                      placeholder="Rua, número e complemento"
                      value={deliveryAddress}
                      onChange={(e) => {
                        setDeliveryAddress(e.target.value)
                        setOrderError('')
                      }}
                      rows={3}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 12,
                        marginBottom: 16,
                        borderRadius: 8,
                        border: '1px solid #ccc',
                        boxSizing: 'border-box',
                      }}
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
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 12,
                        marginBottom: 16,
                        borderRadius: 8,
                        border: '1px solid #ccc',
                        boxSizing: 'border-box',
                      }}
                    />

                    {neighborhoods.length === 0 && (
                      <p role="alert">
                        Nenhum bairro está disponível para entrega no momento.
                        Você pode escolher retirada no local.
                      </p>
                    )}
                  </>
                )}

                {!tableToken && orderType === 'pickup' && (
                  <p>
                    Você deverá retirar seu pedido no endereço da loja:
                    {' '}
                    <strong>{restaurant.address || restaurant.name}</strong>
                  </p>
                )}

                <h3>Seus dados</h3>

                <label htmlFor="customer-name">Seu nome</label>
                <input
                  id="customer-name"
                  type="text"
                  placeholder="Digite seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />

                <label htmlFor="customer-phone">Seu WhatsApp com DDD</label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="Ex.: (88) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />

                {!tableToken && (
                  <div style={{ marginTop: 18, marginBottom: 18 }}>
                    <h3>Forma de pagamento</h3>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="pix"
                          checked={paymentMethod === 'pix'}
                          onChange={() => setPaymentMethod('pix')}
                        />
                        {' '} PIX
                      </label>

                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cash"
                          checked={paymentMethod === 'cash'}
                          onChange={() => setPaymentMethod('cash')}
                        />
                        {' '} Dinheiro
                      </label>

                      <label>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={() => setPaymentMethod('card')}
                        />
                        {' '} Cartão
                      </label>
                    </div>
                  </div>
                )}

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

                <div className="public-cart-total">
                  <span>Total do pedido</span>
                  <strong>
                    {orderType === 'pickup' || selectedNeighborhood
                      ? formatPrice(finalTotal)
                      : '—'}
                  </strong>
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

      <section className="public-menu-content">
        <h2>Nosso cardápio</h2>

        <div className="public-category-filters">
          <button
            type="button"
            className={selectedCategory === 'all' ? 'selected' : ''}
            onClick={() => setSelectedCategory('all')}
          >
            Todos
          </button>

          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={selectedCategory === category.id ? 'selected' : ''}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}

          {products.some((product) => !product.category_id) && (
            <button
              type="button"
              className={selectedCategory === 'none' ? 'selected' : ''}
              onClick={() => setSelectedCategory('none')}
            >
              Outros
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <p className="public-empty">
            Nenhum produto disponível nesta categoria.
          </p>
        ) : (
          <div className="public-products-grid">
            {filteredProducts.map((product) => (
              <article className="public-product-card" key={product.id}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <div className="public-product-placeholder">
                    Sem imagem
                  </div>
                )}

                <div className="public-product-info">
                  <h3>{product.name}</h3>
                  <p>{product.description || 'Sem descrição'}</p>
                  <strong>{formatPrice(product.price)}</strong>

                  <button
                    type="button"
                    className="add-cart-button"
                    onClick={() => addToCart(product)}
                    disabled={!isStoreOpen}
                  >
                    {isStoreOpen ? '+ Adicionar' : 'Loja fechada'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="public-menu-footer">
        Cardápio digital criado com MenuFlow
      </footer>
    </main>
  )
}
