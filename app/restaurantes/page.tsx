
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Restaurant = {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  address: string | null
  logo_url: string | null
  city: string | null
  state: string | null
}

type Category = {
  id: string
  restaurant_id: string
  name: string
  global_category_id: string | null
}

type GlobalCategory = {
  id: string
  name: string
}

function getCategoryEmoji(name: string) {
  const value = name.toLowerCase()

  if (value.includes('pizza')) return '🍕'
  if (value.includes('hamb')) return '🍔'
  if (value.includes('lanche')) return '🍟'
  if (value.includes('massa')) return '🍝'
  if (value.includes('sorvete')) return '🍨'
  if (value.includes('açaí') || value.includes('acai')) return '🫐'
  if (value.includes('bebida')) return '🥤'
  if (value.includes('suco')) return '🧃'
  if (value.includes('café') || value.includes('cafe')) return '☕'
  if (value.includes('carne')) return '🥩'
  if (value.includes('frutos')) return '🦐'
  if (value.includes('sobremesa')) return '🍰'
  if (value.includes('salgado')) return '🥟'
  if (value.includes('executivo')) return '🍛'
  if (value.includes('combo')) return '🍱'
  if (value.includes('promo')) return '🏷️'

  return '🍽️'
}

export default function RestaurantesPage() {
  const router = useRouter()

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([])

  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function verifyAuthentication() {
      try {
        const { data, error } = await supabase.auth.getUser()

        if (!active) return

        if (error || !data.user) {
          setIsAuthenticated(false)
          setAuthLoading(false)
          router.replace('/')
          return
        }

        setIsAuthenticated(true)
        setAuthLoading(false)
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err)

        if (active) {
          setIsAuthenticated(false)
          setAuthLoading(false)
          router.replace('/')
        }
      }
    }

    verifyAuthentication()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return

      if (!session?.user) {
        setIsAuthenticated(false)
        setRestaurants([])
        setCategories([])
        setGlobalCategories([])
        setAuthLoading(false)
        router.replace('/')
      } else {
        setIsAuthenticated(true)
        setAuthLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      loadData()
    }
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser()

      if (userError || !userData.user) {
        setIsAuthenticated(false)
        router.replace('/')
        return
      }

      const [
        restaurantsResult,
        categoriesResult,
        globalCategoriesResult,
      ] = await Promise.all([
        supabase
          .from('restaurants')
          .select(
            'id, name, slug, description, phone, address, logo_url, city, state'
          )
          .order('name'),

        supabase
          .from('categories')
          .select('id, restaurant_id, name, global_category_id')
          .eq('is_active', true),

        supabase
          .from('global_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('position'),
      ])

      if (restaurantsResult.error) throw restaurantsResult.error
      if (categoriesResult.error) throw categoriesResult.error
      if (globalCategoriesResult.error) throw globalCategoriesResult.error

      setRestaurants(restaurantsResult.data || [])
      setCategories(categoriesResult.data || [])
      setGlobalCategories(globalCategoriesResult.data || [])
    } catch (err) {
      console.error('Erro ao carregar restaurantes:', err)
      setError('Não foi possível carregar os restaurantes. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function detectLocation() {
    setError('')
    setMessage('')

    if (!navigator.geolocation) {
      setMessage(
        'Seu navegador não oferece suporte à localização. Informe sua cidade manualmente.'
      )
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `/api/geocode?lat=${position.coords.latitude}&lon=${position.coords.longitude}`
          )

          if (!response.ok) {
            throw new Error('Não foi possível identificar sua cidade.')
          }

          const data = await response.json()

          if (data.city) setCity(data.city)
          if (data.state) setState(data.state)

          if (data.city) {
            setMessage(
              'Localização identificada! Confira os dados e veja os restaurantes.'
            )
          } else {
            setMessage(
              'Não encontramos sua cidade. Você pode informá-la manualmente.'
            )
          }
        } catch {
          setMessage(
            'A identificação automática ainda não está disponível. Informe sua cidade manualmente.'
          )
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setMessage(
          'Localização não autorizada ou indisponível. Informe sua cidade manualmente.'
        )
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    )
  }

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const normalizedCity = city.trim().toLowerCase()
    const normalizedState = state.trim().toLowerCase()

    return restaurants.filter((restaurant) => {
      const restaurantCategories = categories.filter(
        (category) => category.restaurant_id === restaurant.id
      )

      const matchesCity =
        !normalizedCity ||
        (restaurant.city || '').toLowerCase() === normalizedCity

      const matchesState =
        !normalizedState ||
        (restaurant.state || '').toLowerCase() === normalizedState

      const matchesCategory =
        !selectedCategory ||
        restaurantCategories.some(
          (category) => category.global_category_id === selectedCategory
        )

      const matchesSearch =
        !normalizedSearch ||
        restaurant.name.toLowerCase().includes(normalizedSearch) ||
        (restaurant.description || '').toLowerCase().includes(normalizedSearch) ||
        restaurantCategories.some((category) =>
          category.name.toLowerCase().includes(normalizedSearch)
        )

      return (
        matchesCity &&
        matchesState &&
        matchesCategory &&
        matchesSearch
      )
    })
  }, [restaurants, categories, city, state, search, selectedCategory])

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#f7f8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-gray-600 font-semibold">
            Verificando seu acesso...
          </p>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-gray-900">

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">

          <Link href="/restaurantes" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#1d5b3b] flex items-center justify-center text-white text-xl">
              🍽️
            </div>

            <span className="text-2xl font-black tracking-tight text-gray-900">
              Menu<span className="text-[#d49a35]">Flow</span>
            </span>
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.replace('/')
            }}
            className="text-sm font-semibold text-gray-600 hover:text-[#1d5b3b] transition"
          >
            Sair da conta
          </button>
        </div>
      </header>

      {/* APRESENTAÇÃO */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-9 md:py-12">

          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-[#eaf2eb] text-[#286344] px-3 py-1.5 text-xs font-bold mb-4">
              SUA EXPERIÊNCIA GASTRONÔMICA
            </span>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">
              Peça o que você ama.
              <br />
              <span className="text-[#1d5b3b]">
                Descubra novos sabores.
              </span>
            </h1>

            <p className="text-gray-500 mt-3 text-sm md:text-base">
              Encontre restaurantes, explore cardápios e escolha seu próximo pedido.
            </p>
          </div>

          {/* LOCALIZAÇÃO */}
          <div className="mt-7 max-w-3xl rounded-2xl border border-gray-100 bg-[#fafbf9] p-4">

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#eaf2eb] flex items-center justify-center text-lg">
                📍
              </div>

              <div>
                <p className="font-bold text-gray-900 text-sm">
                  Onde você quer pedir?
                </p>
                <p className="text-xs text-gray-500">
                  Informe sua cidade para encontrar opções próximas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px] gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Digite sua cidade"
                className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1d5b3b] focus:ring-2 focus:ring-green-100"
              />

              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="UF"
                maxLength={2}
                className="w-full rounded-xl bg-white border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1d5b3b] focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              <button
                onClick={detectLocation}
                disabled={locating}
                className="text-sm font-bold text-[#1d5b3b] hover:text-green-800 disabled:opacity-50"
              >
                📍 {locating
                  ? 'Identificando localização...'
                  : 'Usar minha localização'}
              </button>

              {(city || state) && (
                <button
                  onClick={() => {
                    setCity('')
                    setState('')
                    setMessage('')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Limpar localização
                </button>
              )}
            </div>

            {message && (
              <p className="mt-3 text-xs text-gray-500">{message}</p>
            )}
          </div>

          {/* BUSCA */}
          <div className="relative mt-4 max-w-3xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
              🔎
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar restaurante, pizza, hambúrguer..."
              className="w-full rounded-xl bg-white border border-gray-200 pl-11 pr-4 py-4 text-sm outline-none focus:border-[#1d5b3b] focus:ring-2 focus:ring-green-100"
            />
          </div>

        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9">

        <div className="mb-5">
          <h2 className="text-xl md:text-2xl font-black text-gray-900">
            Explore por categoria
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Escolha o tipo de comida que deseja.
          </p>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4">

          <button
            onClick={() => setSelectedCategory('')}
            className="shrink-0 flex flex-col items-center gap-2 group"
          >
            <div className={`w-[68px] h-[68px] rounded-full flex items-center justify-center text-3xl border-2 transition ${
              selectedCategory === ''
                ? 'bg-[#eaf2eb] border-[#1d5b3b]'
                : 'bg-white border-gray-100 group-hover:border-[#1d5b3b]'
            }`}>
              🍽️
            </div>

            <span className={`text-xs font-bold ${
              selectedCategory === '' ? 'text-[#1d5b3b]' : 'text-gray-600'
            }`}>
              Todas
            </span>
          </button>

          {globalCategories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category.id ? '' : category.id
                )
              }
              className="shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className={`w-[68px] h-[68px] rounded-full flex items-center justify-center text-3xl border-2 transition ${
                selectedCategory === category.id
                  ? 'bg-[#eaf2eb] border-[#1d5b3b]'
                  : 'bg-white border-gray-100 group-hover:border-[#1d5b3b]'
              }`}>
                {getCategoryEmoji(category.name)}
              </div>

              <span className={`text-xs font-bold max-w-[85px] text-center ${
                selectedCategory === category.id
                  ? 'text-[#1d5b3b]'
                  : 'text-gray-600'
              }`}>
                {category.name}
              </span>
            </button>
          ))}

        </div>
      </section>

      {/* RESTAURANTES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-7 pb-16">

        <div className="flex items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900">
              Restaurantes disponíveis
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Escolha onde deseja fazer seu pedido.
            </p>
          </div>

          {!loading && (
            <span className="text-xs font-bold text-[#1d5b3b] bg-[#eaf2eb] rounded-full px-3 py-2 whitespace-nowrap">
              {filteredRestaurants.length} encontrado(s)
            </span>
          )}
        </div>

        {/* CARREGAMENTO */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />

                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERRO */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-5 text-sm">
            {error}

            <button
              onClick={loadData}
              className="block mt-3 font-bold underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* SEM RESULTADOS */}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center">
            <div className="text-5xl mb-4">🔎</div>

            <h3 className="font-bold text-lg text-gray-900">
              Nenhum restaurante encontrado
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Tente mudar a cidade, categoria ou busca.
            </p>

            <button
              onClick={() => {
                setSearch('')
                setSelectedCategory('')
                setCity('')
                setState('')
                setMessage('')
              }}
              className="mt-5 text-sm font-bold text-[#1d5b3b]"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* LISTA DE RESTAURANTES */}
        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {filteredRestaurants.map((restaurant) => {
              const restaurantCategories = categories.filter(
                (category) => category.restaurant_id === restaurant.id
              )

              return (
                <Link
                  key={restaurant.id}
                  href={`/cardapio/${restaurant.slug}`}
                  className="group bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-[#c8ddcd] transition duration-200"
                >

                  {/* LOGO REDONDO */}
                  <div className="w-[82px] h-[82px] sm:w-[92px] sm:h-[92px] shrink-0 rounded-full bg-[#f0f5ef] border border-gray-100 flex items-center justify-center overflow-hidden">

                    {restaurant.logo_url ? (
                      <img
                        src={restaurant.logo_url}
                        alt={`Logo ${restaurant.name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <span className="text-4xl">🍽️</span>
                    )}

                  </div>

                  {/* INFORMAÇÕES */}
                  <div className="flex-1 min-w-0">

                    <h3 className="font-extrabold text-base sm:text-lg text-gray-900 leading-tight truncate group-hover:text-[#1d5b3b] transition">
                      {restaurant.name}
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                      {restaurant.description || 'Conheça nosso cardápio e escolha seu pedido favorito.'}
                    </p>

                    {(restaurant.city || restaurant.state) && (
                      <p className="text-[11px] text-gray-400 mt-2 truncate">
                        📍 {[restaurant.city, restaurant.state]
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {restaurantCategories.slice(0, 2).map((category) => (
                        <span
                          key={category.id}
                          className="bg-[#eaf2eb] text-[#286344] rounded-full px-2 py-1 text-[10px] font-bold"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>

                    <span className="inline-block mt-3 text-xs font-extrabold text-[#1d5b3b] group-hover:underline">
                      Ver cardápio →
                    </span>

                  </div>
                </Link>
              )
            })}

          </div>
        )}

      </section>

      {/* RODAPÉ */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">

          <span className="font-black text-gray-800">
            Menu<span className="text-[#d49a35]">Flow</span>
          </span>

          <p className="text-xs text-gray-400">
            Encontre restaurantes e faça seu pedido.
          </p>

        </div>
      </footer>

    </main>
  )
}
