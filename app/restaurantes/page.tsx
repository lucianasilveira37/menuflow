
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([])

  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [
        restaurantsResult,
        categoriesResult,
        globalCategoriesResult,
      ] = await Promise.all([
        supabase
          .from('restaurants')
          .select('id, name, slug, description, phone, address, logo_url, city, state')
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
      setMessage('Seu navegador não oferece suporte à localização. Informe sua cidade manualmente.')
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
            setMessage('Localização identificada! Confira os dados e veja os restaurantes.')
          } else {
            setMessage('Não encontramos sua cidade. Você pode informá-la manualmente.')
          }
        } catch {
          setMessage('A identificação automática ainda não está disponível. Informe sua cidade manualmente.')
        } finally {
          setLocating(false)
        }
      },
      () => {
        setLocating(false)
        setMessage('Localização não autorizada ou indisponível. Informe sua cidade manualmente.')
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

      return matchesCity && matchesState && matchesCategory && matchesSearch
    })
  }, [restaurants, categories, city, state, search, selectedCategory])

  return (
    <main className="min-h-screen bg-[#FAF8F5] text-gray-900">

      {/* CABEÇALHO */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/restaurantes" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white text-xl">
              🍽️
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">
              Menu<span className="text-orange-600">Flow</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-gray-600 hover:text-orange-600 transition"
          >
            Entrar na minha conta
          </Link>
        </div>
      </header>

      {/* BANNER PRINCIPAL */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500">
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute right-1/4 -bottom-40 w-96 h-96 rounded-full bg-white/10" />

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-12 md:py-16">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/20 text-white rounded-full px-4 py-2 text-xs font-bold mb-5">
              ✨ SEU PRÓXIMO PEDIDO COMEÇA AQUI
            </span>

            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
              A fome chegou?
              <br />
              Peça algo delicioso!
            </h1>

            <p className="text-orange-50 mt-4 text-base md:text-lg max-w-lg">
              Descubra restaurantes, explore sabores e encontre seu próximo prato favorito.
            </p>
          </div>

          {/* BUSCA E LOCALIZAÇÃO */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-4 md:p-5 max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📍</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  Onde você quer pedir?
                </p>
                <p className="text-xs text-gray-500">
                  Escolha sua cidade para encontrar restaurantes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Digite sua cidade"
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />

              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="UF"
                maxLength={2}
                className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
              <button
                onClick={detectLocation}
                disabled={locating}
                className="text-sm font-bold text-orange-700 hover:text-orange-800 disabled:opacity-50"
              >
                📍 {locating ? 'Identificando localização...' : 'Usar minha localização'}
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

            <div className="relative mt-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                🔎
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar restaurante, pizza, hambúrguer..."
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-11 pr-4 py-4 text-sm text-gray-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900">
              Explore por categoria
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Qual sabor combina com você hoje?
            </p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3">
          <button
            onClick={() => setSelectedCategory('')}
            className={`shrink-0 min-w-[88px] rounded-2xl border p-3 flex flex-col items-center gap-2 transition ${
              selectedCategory === ''
                ? 'bg-orange-600 border-orange-600 text-white shadow-md'
                : 'bg-white border-gray-100 text-gray-700 hover:border-orange-300'
            }`}
          >
            <span className="text-3xl">🍽️</span>
            <span className="text-xs font-bold">Todas</span>
          </button>

          {globalCategories.map((category) => (
            <button
              key={category.id}
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category.id ? '' : category.id
                )
              }
              className={`shrink-0 min-w-[88px] rounded-2xl border p-3 flex flex-col items-center gap-2 transition ${
                selectedCategory === category.id
                  ? 'bg-orange-600 border-orange-600 text-white shadow-md'
                  : 'bg-white border-gray-100 text-gray-700 hover:border-orange-300'
              }`}
            >
              <span className="text-3xl">
                {getCategoryEmoji(category.name)}
              </span>
              <span className="text-xs font-bold text-center">
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* RESTAURANTES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-9 pb-16">
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900">
              Restaurantes para você
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Encontre seu próximo pedido.
            </p>
          </div>

          {!loading && (
            <span className="text-xs sm:text-sm font-semibold text-orange-700 bg-orange-50 rounded-full px-3 py-2">
              {filteredRestaurants.length} encontrado(s)
            </span>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
              >
                <div className="h-28 sm:h-36 bg-gray-200" />
                <div className="p-3 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

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
              }}
              className="mt-5 text-sm font-bold text-orange-600"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {filteredRestaurants.map((restaurant) => {
              const restaurantCategories = categories.filter(
                (category) => category.restaurant_id === restaurant.id
              )

              return (
                <article
                  key={restaurant.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition duration-200 flex flex-col"
                >
                  <div className="h-28 sm:h-36 bg-gradient-to-br from-orange-50 to-amber-100 flex items-center justify-center overflow-hidden">
                    {restaurant.logo_url ? (
                      <img
                        src={restaurant.logo_url}
                        alt={`Logo ${restaurant.name}`}
                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl">🍽️</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <h3 className="font-extrabold text-sm sm:text-base text-gray-900 leading-tight line-clamp-1">
                      {restaurant.name}
                    </h3>

                    {restaurant.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 min-h-[2rem]">
                        {restaurant.description}
                      </p>
                    )}

                    {(restaurant.city || restaurant.state) && (
                      <p className="text-[11px] text-gray-400 mt-2">
                        📍 {[restaurant.city, restaurant.state]
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mt-3 mb-4">
                      {restaurantCategories.slice(0, 2).map((category) => (
                        <span
                          key={category.id}
                          className="bg-orange-50 text-orange-700 rounded-full px-2 py-1 text-[10px] sm:text-xs font-semibold"
                        >
                          {category.name}
                        </span>
                      ))}

                      {restaurantCategories.length > 2 && (
                        <span className="text-[10px] text-gray-400 py-1">
                          +{restaurantCategories.length - 2}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/cardapio/${restaurant.slug}`}
                      className="mt-auto block text-center bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-2.5 px-2 text-xs sm:text-sm font-bold transition"
                    >
                      Ver cardápio →
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* RODAPÉ */}
      <footer className="bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-black text-gray-800">
            Menu<span className="text-orange-600">Flow</span>
          </span>
          <p className="text-xs text-gray-400">
            Encontre restaurantes e faça seu pedido.
          </p>
        </div>
      </footer>
    </main>
  )
}
