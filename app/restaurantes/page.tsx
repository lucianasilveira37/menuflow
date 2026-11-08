'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function getCategoryEmoji(name: string) {
  const value = normalizeText(name)

  if (value.includes('pizza')) return '🍕'
  if (value.includes('hamb')) return '🍔'
  if (value.includes('lanche')) return '🍟'
  if (value.includes('massa')) return '🍝'
  if (value.includes('sorvete')) return '🍨'
  if (value.includes('acai')) return '🫐'
  if (value.includes('bebida')) return '🥤'
  if (value.includes('suco')) return '🧃'
  if (value.includes('cafe')) return '☕'
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
  const resultsRef = useRef<HTMLElement | null>(null)

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

  function goToResults() {
    resultsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    goToResults()
  }

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
    // loadData é chamada somente quando o estado de autenticação muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const restaurantCategoriesById = useMemo(() => {
    const grouped: Record<string, Category[]> = {}

    for (const category of categories) {
      if (!grouped[category.restaurant_id]) {
        grouped[category.restaurant_id] = []
      }
      grouped[category.restaurant_id].push(category)
    }

    return grouped
  }, [categories])

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = normalizeText(search)
    const normalizedCity = normalizeText(city)
    const normalizedState = normalizeText(state)

    return restaurants.filter((restaurant) => {
      const restaurantCategories =
        restaurantCategoriesById[restaurant.id] || []

      const matchesCity =
        !normalizedCity ||
        normalizeText(restaurant.city || '') === normalizedCity

      const matchesState =
        !normalizedState ||
        normalizeText(restaurant.state || '') === normalizedState

      const matchesCategory =
        !selectedCategory ||
        restaurantCategories.some(
          (category) => category.global_category_id === selectedCategory
        )

      const matchesSearch =
        !normalizedSearch ||
        normalizeText(restaurant.name).includes(normalizedSearch) ||
        normalizeText(restaurant.description || '').includes(normalizedSearch) ||
        restaurantCategories.some((category) =>
          normalizeText(category.name).includes(normalizedSearch)
        )

      return (
        matchesCity &&
        matchesState &&
        matchesCategory &&
        matchesSearch
      )
    })
  }, [
    restaurants,
    restaurantCategoriesById,
    city,
    state,
    search,
    selectedCategory,
  ])

  function clearFilters() {
    setSearch('')
    setSelectedCategory('')
    setCity('')
    setState('')
    setMessage('')
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fff8f1]">
        <div className="text-center">
          <div className="mb-3 text-5xl">🍽️</div>
          <p className="font-semibold text-[#51413b]">
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
    <main className="min-h-screen overflow-x-hidden bg-[#fff8f1] text-[#29232b]">
      {/* CABEÇALHO */}
      <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/restaurantes" className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f45b35] text-2xl text-white shadow-md shadow-orange-200">
              🍽️
            </span>
            <span className="text-2xl font-black tracking-tight text-[#29232b]">
              Menu<span className="text-[#f45b35]">Flow</span>
            </span>
          </Link>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.replace('/')
            }}
            className="rounded-full border border-orange-100 px-4 py-2 text-sm font-bold text-[#62545a] transition hover:border-[#f45b35] hover:text-[#e64e2c]"
          >
            Sair da conta
          </button>
        </div>
      </header>

      {/* DESTAQUE E BUSCA */}
      <section className="relative isolate overflow-hidden bg-[#fff0e6]">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[#ffd0bd] blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 h-64 w-64 rounded-full bg-[#e9ddff] blur-2xl" />

        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-extrabold tracking-wide text-[#d94d2d] shadow-sm">
              <span>✨</span> DESCOBRIR • ESCOLHER • SABOREAR
            </span>

            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-[#29232b] sm:text-5xl lg:text-6xl">
              A fome pediu.
              <span className="block text-[#f45b35]">
                O MenuFlow encontrou!
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#71616a] sm:text-lg">
              Descubra restaurantes, explore cardápios e encontre algo
              delicioso para hoje.
            </p>

            {/* PESQUISA: ENTER OU BOTÃO LEVAM AOS RESULTADOS */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-orange-100 bg-white p-2 shadow-xl shadow-orange-200/40 sm:flex-row"
            >
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <span className="text-2xl" aria-hidden="true">
                  🔎
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Busque pizza, hambúrguer, açaí..."
                  aria-label="Buscar restaurantes ou tipos de comida"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm font-medium text-[#29232b] outline-none placeholder:text-[#a3979b] sm:text-base"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Limpar pesquisa"
                    className="rounded-full px-2 py-1 text-lg text-[#9a8b91] hover:bg-orange-50"
                  >
                    ×
                  </button>
                )}
              </label>

              <button
                type="submit"
                className="rounded-xl bg-[#f45b35] px-7 py-3 font-extrabold text-white shadow-md shadow-orange-200 transition hover:-translate-y-0.5 hover:bg-[#df4828] focus:outline-none focus:ring-4 focus:ring-orange-200"
              >
                Buscar agora
              </button>
            </form>

            <p className="mt-3 text-xs font-medium text-[#8b777b]">
              Dica: digite o nome do restaurante ou o que está com vontade de comer.
            </p>
          </div>

          {/* PAINEL ILUSTRATIVO */}
          <div className="relative mx-auto hidden w-full max-w-md md:block">
            <div className="absolute -left-5 top-8 h-24 w-24 rounded-full bg-[#bde5a3]" />
            <div className="absolute -right-2 bottom-3 h-28 w-28 rounded-full bg-[#ffd18b]" />
            <div className="relative rounded-[2rem] border-8 border-white bg-gradient-to-br from-[#ffb28f] via-[#ff805f] to-[#f45b35] p-7 shadow-2xl shadow-orange-200">
              <div className="rounded-3xl bg-white/95 p-5 text-center shadow-lg">
                <div className="text-7xl">🍕</div>
                <p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#f45b35]">
                  Seu momento gostoso
                </p>
                <p className="mt-1 text-2xl font-black text-[#29232b]">
                  Começa aqui!
                </p>
                <div className="mt-4 flex justify-center gap-3 text-3xl">
                  <span>🍔</span>
                  <span>🍟</span>
                  <span>🍰</span>
                  <span>🥤</span>
                </div>
              </div>
              <span className="absolute -right-5 -top-5 flex h-14 w-14 rotate-12 items-center justify-center rounded-2xl bg-[#7bbd55] text-2xl shadow-lg">
                😋
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* LOCALIZAÇÃO */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6">
        <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5e3] text-xl">
                📍
              </span>
              <div>
                <p className="font-extrabold text-[#29232b]">
                  Onde você quer pedir?
                </p>
                <p className="text-xs text-[#8b7d82] sm:text-sm">
                  Informe sua cidade para filtrar os restaurantes disponíveis.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:w-[470px]">
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Sua cidade"
                aria-label="Cidade"
                className="min-w-0 flex-1 rounded-xl border border-[#eee2dc] bg-[#fffaf7] px-4 py-3 text-sm outline-none transition focus:border-[#f45b35] focus:ring-4 focus:ring-orange-100"
              />
              <input
                value={state}
                onChange={(event) => setState(event.target.value.toUpperCase())}
                placeholder="UF"
                aria-label="Estado"
                maxLength={2}
                className="w-full rounded-xl border border-[#eee2dc] bg-[#fffaf7] px-4 py-3 text-sm uppercase outline-none transition focus:border-[#f45b35] focus:ring-4 focus:ring-orange-100 sm:w-20"
              />
              <button
                onClick={detectLocation}
                disabled={locating}
                type="button"
                className="rounded-xl bg-[#29232b] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#493c45] disabled:cursor-wait disabled:opacity-60"
              >
                {locating ? 'Localizando...' : '📍 Usar localização'}
              </button>
            </div>
          </div>

          {(message || city || state) && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-orange-50 pt-3">
              {message ? (
                <p className="text-xs text-[#74666c]">{message}</p>
              ) : (
                <p className="text-xs text-[#74666c]">
                  Filtro de localização aplicado aos resultados.
                </p>
              )}
              <button
                onClick={() => {
                  setCity('')
                  setState('')
                  setMessage('')
                }}
                className="text-xs font-bold text-[#e65332] hover:underline"
              >
                Limpar localização
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#f45b35]">
              Do seu jeito
            </span>
            <h2 className="mt-1 text-2xl font-black text-[#29232b] sm:text-3xl">
              O que combina com sua fome?
            </h2>
            <p className="mt-1 text-sm text-[#8b7d82]">
              Escolha uma categoria para filtrar os restaurantes.
            </p>
          </div>
          <span className="hidden text-2xl sm:block">👇</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            aria-pressed={selectedCategory === ''}
            className={`group flex min-w-[100px] shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 transition ${
              selectedCategory === ''
                ? 'border-[#f45b35] bg-[#fff0e8] shadow-md shadow-orange-100'
                : 'border-orange-100 bg-white hover:-translate-y-1 hover:border-orange-300 hover:shadow-md'
            }`}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ffe1d4] text-3xl">
              🍽️
            </span>
            <span className="text-xs font-extrabold text-[#51434a]">
              Todas
            </span>
          </button>

          {globalCategories.map((category, index) => {
            const backgrounds = [
              'bg-[#ffe3d8]',
              'bg-[#e8e0ff]',
              'bg-[#e5f3d9]',
              'bg-[#fff0c9]',
              'bg-[#dff1f5]',
            ]
            const active = selectedCategory === category.id

            return (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSelectedCategory(active ? '' : category.id)
                }
                aria-pressed={active}
                className={`group flex min-w-[100px] shrink-0 flex-col items-center gap-2 rounded-2xl border p-3 transition ${
                  active
                    ? 'border-[#f45b35] bg-[#fff0e8] shadow-md shadow-orange-100'
                    : 'border-orange-100 bg-white hover:-translate-y-1 hover:border-orange-300 hover:shadow-md'
                }`}
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${
                    backgrounds[index % backgrounds.length]
                  }`}
                >
                  {getCategoryEmoji(category.name)}
                </span>
                <span className="max-w-[90px] text-center text-xs font-extrabold text-[#51434a]">
                  {category.name}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* RESULTADOS */}
      <section
        ref={resultsRef}
        id="resultados"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 pt-7 sm:px-6"
      >
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7bbd55]">
              Escolha seu próximo pedido
            </span>
            <h2 className="mt-1 text-2xl font-black text-[#29232b] sm:text-3xl">
              Restaurantes para descobrir
            </h2>
            <p className="mt-1 text-sm text-[#8b7d82]">
              Toque em um restaurante para abrir o cardápio.
            </p>
          </div>

          {!loading && !error && (
            <span className="w-fit rounded-full bg-[#eaf5e3] px-4 py-2 text-xs font-extrabold text-[#477d2b]">
              {filteredRestaurants.length}{' '}
              {filteredRestaurants.length === 1
                ? 'restaurante encontrado'
                : 'restaurantes encontrados'}
            </span>
          )}
        </div>

        {/* CARREGAMENTO */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="flex animate-pulse gap-4 rounded-3xl border border-orange-100 bg-white p-4"
              >
                <div className="h-24 w-24 shrink-0 rounded-2xl bg-orange-100" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 w-3/4 rounded bg-orange-100" />
                  <div className="h-3 w-full rounded bg-orange-50" />
                  <div className="h-3 w-1/2 rounded bg-orange-50" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ERRO */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-bold">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* SEM RESULTADOS */}
        {!loading && !error && filteredRestaurants.length === 0 && (
          <div className="rounded-3xl border border-orange-100 bg-white px-5 py-12 text-center shadow-sm">
            <div className="text-6xl">🔎</div>
            <h3 className="mt-4 text-xl font-black text-[#29232b]">
              Não encontramos esse restaurante
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8b7d82]">
              Experimente outro nome, categoria ou cidade. Pode ter uma opção
              deliciosa esperando por você!
            </p>
            <button
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#f45b35] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#df4828]"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* LISTA DE RESTAURANTES */}
        {!loading && !error && filteredRestaurants.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRestaurants.map((restaurant, index) => {
              const restaurantCategories =
                restaurantCategoriesById[restaurant.id] || []

              const accentClasses = [
                'from-[#fff0e8] to-[#ffe0d2]',
                'from-[#f0eaff] to-[#e3d9ff]',
                'from-[#edf7e7] to-[#dcefcf]',
                'from-[#fff5dc] to-[#ffebbd]',
              ]
              const accent = accentClasses[index % accentClasses.length]

              return (
                <Link
                  key={restaurant.id}
                  href={`/cardapio/${restaurant.slug}`}
                  className="group flex min-w-0 items-center gap-4 rounded-3xl border border-orange-100/90 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/70"
                >
                  <div
                    className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${accent}`}
                  >
                    {restaurant.logo_url ? (
                      <img
                        src={restaurant.logo_url}
                        alt={`Logo ${restaurant.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-4xl">🍽️</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-black leading-tight text-[#29232b] transition group-hover:text-[#e65332] sm:text-lg">
                      {restaurant.name}
                    </h3>

                    <p className="mt-1 line-clamp-2 min-h-[2.5rem] break-words text-xs leading-relaxed text-[#81737a] sm:text-sm">
                      {restaurant.description ||
                        'Conheça nosso cardápio e escolha seu pedido favorito.'}
                    </p>

                    {(restaurant.city || restaurant.state) && (
                      <p className="mt-2 truncate text-[11px] font-medium text-[#9a8c91]">
                        📍{' '}
                        {[restaurant.city, restaurant.state]
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    )}

                    {restaurantCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {restaurantCategories.slice(0, 2).map((category) => (
                          <span
                            key={category.id}
                            className="rounded-full bg-[#f0eaff] px-2.5 py-1 text-[10px] font-extrabold text-[#6941a5]"
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#f45b35] group-hover:gap-2">
                      Ver cardápio <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* RODAPÉ */}
      <footer className="border-t border-orange-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-7 sm:flex-row">
          <span className="text-xl font-black text-[#29232b]">
            Menu<span className="text-[#f45b35]">Flow</span>
          </span>
          <p className="text-center text-xs text-[#9a8c91]">
            Encontre seu próximo sabor favorito. Feito para facilitar sua escolha. ❤️
          </p>
        </div>
      </footer>
    </main>
  )
}
