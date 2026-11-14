
'use client'

import Link from 'next/link'
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

type Restaurant = {
  id: string
  name: string
  slug: string
  description: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  logo_url: string | null
  is_open: boolean
  manual_override: boolean | null
  timezone: string
  delivery_validation_mode: 'simple' | 'gps'
}

type Neighborhood = {
  id: string
  restaurant_id: string
  name: string
  delivery_fee: number
  is_active: boolean
}

type OperatingDay = {
  weekday: number
  is_closed: boolean
  opening_time: string
  closing_time: string
}

type IBGEState = {
  id: number
  nome: string
  sigla: string
}

type IBGECity = {
  id: number
  nome: string
}

const weekDays = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const menuItems = [
  { title: 'Visão geral', href: '/painel', icon: '▦' },
  { title: 'Produtos', href: '/painel/produtos', icon: '🍕' },
  { title: 'Categorias', href: '/painel/categorias', icon: '▤' },
  { title: 'Pedidos', href: '/painel/pedidos', icon: '🧾' },
  { title: 'Mesas', href: '/painel/mesas', icon: '🪑' },
  { title: 'Loja', href: '/painel/loja', icon: '🏪' },
]

const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400'

const cardClass =
  'mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6'

const defaultSchedule = (): OperatingDay[] =>
  weekDays.map((_, weekday) => ({
    weekday,
    is_closed: true,
    opening_time: '18:00',
    closing_time: '23:00',
  }))

function formatCurrency(value: number) {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export default function MinhaLojaPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [restaurantId, setRestaurantId] = useState('')

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    phone: '',
    address: '',
    city: '',
    state: '',
  })

  // IBGE
  const [states, setStates] = useState<IBGEState[]>([])
  const [cities, setCities] = useState<IBGECity[]>([])
  const [loadingStates, setLoadingStates] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)

  // Funcionamento
  const [schedule, setSchedule] = useState<OperatingDay[]>(defaultSchedule())
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [effectiveOpen, setEffectiveOpen] = useState(false)
  const [checkingOpen, setCheckingOpen] = useState(false)

  // Bairros
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [neighborhoodFee, setNeighborhoodFee] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingNeighborhood, setSavingNeighborhood] = useState(false)
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false)

  // Entrega
  const [deliveryMode, setDeliveryMode] = useState<'simple' | 'gps'>('simple')
  const [savingDeliveryMode, setSavingDeliveryMode] = useState(false)

  // Geral
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // ==========================================
  // IBGE - CARREGAR ESTADOS
  // ==========================================

  useEffect(() => {
    let active = true

    async function loadStates() {
      setLoadingStates(true)

      try {
        const response = await fetch(
          'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
        )

        if (!response.ok) {
          throw new Error('Erro ao carregar estados.')
        }

        const data: IBGEState[] = await response.json()

        if (active) {
          setStates(data)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar os estados. Verifique sua conexão.')
        }
      } finally {
        if (active) {
          setLoadingStates(false)
        }
      }
    }

    loadStates()

    return () => {
      active = false
    }
  }, [])

  // ==========================================
  // IBGE - CARREGAR CIDADES DO ESTADO
  // ==========================================

  useEffect(() => {
    let active = true

    async function loadCities() {
      setCities([])

      if (!form.state) {
        setLoadingCities(false)
        return
      }

      // Esperar os estados serem carregados
      if (states.length === 0) {
        return
      }

      const selectedState = states.find(
        state => state.sigla === form.state
      )

      if (!selectedState) {
        setLoadingCities(false)
        return
      }

      setLoadingCities(true)

      try {
        const response = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState.id}/municipios?orderBy=nome`
        )

        if (!response.ok) {
          throw new Error('Erro ao carregar cidades.')
        }

        const data: IBGECity[] = await response.json()

        if (active) {
          setCities(data)
        }
      } catch {
        if (active) {
          setError('Não foi possível carregar as cidades. Tente novamente.')
        }
      } finally {
        if (active) {
          setLoadingCities(false)
        }
      }
    }

    loadCities()

    return () => {
      active = false
    }
  }, [form.state, states])

  // ==========================================
  // CARREGAR RESTAURANTE
  // ==========================================

  useEffect(() => {
    loadRestaurant()
  }, [])

  async function loadRestaurant() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Entre novamente na sua conta.')
      setLoading(false)
      return
    }

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle()

    if (membershipError || !membership) {
      setError('Não foi possível encontrar seu restaurante.')
      setLoading(false)
      return
    }

    const id = membership.restaurant_id

    const { data, error: restaurantError } = await supabase
      .from('restaurants')
      .select(
        'id, name, slug, description, phone, address, city, state, logo_url, is_open, manual_override, timezone, delivery_validation_mode'
      )
      .eq('id', id)
      .single()

    if (restaurantError || !data) {
      setError('Não foi possível carregar os dados da loja.')
      setLoading(false)
      return
    }

    const shop = data as Restaurant

    setRestaurantId(id)
    setRestaurant(shop)
    setDeliveryMode(shop.delivery_validation_mode || 'simple')

    // Recuperar os dados salvos no Supabase
    setForm({
      name: shop.name || '',
      slug: shop.slug || '',
      description: shop.description || '',
      phone: shop.phone || '',
      address: shop.address || '',
      city: shop.city || '',
      state: (shop.state || '').toUpperCase(),
    })

    await Promise.all([
      loadNeighborhoods(id),
      loadOperatingHours(id),
      refreshEffectiveOpen(id),
    ])

    setLoading(false)
  }

  // ==========================================
  // HORÁRIOS DE FUNCIONAMENTO
  // ==========================================

  async function loadOperatingHours(id: string) {
    const { data, error: loadError } = await supabase
      .from('operating_hours')
      .select('weekday, is_closed, opening_time, closing_time')
      .eq('restaurant_id', id)
      .order('weekday', { ascending: true })

    if (loadError) {
      setError('Não foi possível carregar os horários de funcionamento.')
      return
    }

    if (data?.length) {
      const saved = data as OperatingDay[]

      setSchedule(
        weekDays.map((_, weekday) =>
          saved.find(day => day.weekday === weekday) || {
            weekday,
            is_closed: true,
            opening_time: '18:00',
            closing_time: '23:00',
          }
        )
      )
    }
  }

  async function refreshEffectiveOpen(id = restaurantId) {
    if (!id) return

    setCheckingOpen(true)

    const { data, error: statusError } = await supabase.rpc(
      'is_restaurant_open',
      { p_restaurant_id: id }
    )

    if (!statusError) {
      setEffectiveOpen(Boolean(data))
    } else {
      setError('Não foi possível consultar o funcionamento automático.')
    }

    setCheckingOpen(false)
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!restaurantId) return

    const invalid = schedule.some(
      day =>
        !day.is_closed &&
        (!day.opening_time ||
          !day.closing_time ||
          day.opening_time >= day.closing_time)
    )

    if (invalid) {
      setError('A abertura precisa ser anterior ao fechamento no mesmo dia.')
      return
    }

    setSavingSchedule(true)
    setError('')
    setMessage('')

    const rows = schedule.map(day => ({
      restaurant_id: restaurantId,
      weekday: day.weekday,
      is_closed: day.is_closed,
      opening_time: day.opening_time,
      closing_time: day.closing_time,
    }))

    const { error: saveError } = await supabase
      .from('operating_hours')
      .upsert(rows, { onConflict: 'restaurant_id,weekday' })

    if (saveError) {
      setError('Não foi possível salvar os horários de funcionamento.')
      setSavingSchedule(false)
      return
    }

    await refreshEffectiveOpen()

    setMessage('Horários de funcionamento salvos!')
    setSavingSchedule(false)
  }

  function updateScheduleDay(
    weekday: number,
    changes: Partial<OperatingDay>
  ) {
    setSchedule(current =>
      current.map(day =>
        day.weekday === weekday ? { ...day, ...changes } : day
      )
    )
  }

  // ==========================================
  // CONTROLE MANUAL DA LOJA
  // ==========================================

  async function setManualOverride(value: boolean | null) {
    if (!restaurant) return

    setError('')
    setMessage('')

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ manual_override: value })
      .eq('id', restaurantId)

    if (updateError) {
      setError('Não foi possível alterar o controle manual da loja.')
      return
    }

    setRestaurant({ ...restaurant, manual_override: value })

    await refreshEffectiveOpen()

    setMessage(
      value === null
        ? 'Controle automático por horário ativado.'
        : value
          ? 'Loja aberta manualmente.'
          : 'Loja fechada manualmente.'
    )
  }

  // ==========================================
  // MODO DE ENTREGA
  // ==========================================

  async function saveDeliveryMode() {
    if (!restaurantId) return

    setSavingDeliveryMode(true)
    setError('')
    setMessage('')

    const { error: saveError } = await supabase
      .from('restaurants')
      .update({ delivery_validation_mode: deliveryMode })
      .eq('id', restaurantId)

    if (saveError) {
      setError('Não foi possível salvar o modo de entrega.')
      setSavingDeliveryMode(false)
      return
    }

    setRestaurant(current =>
      current
        ? { ...current, delivery_validation_mode: deliveryMode }
        : current
    )

    setMessage('Modo de entrega atualizado com sucesso!')
    setSavingDeliveryMode(false)
  }

  // ==========================================
  // BAIRROS
  // ==========================================

  async function loadNeighborhoods(id: string) {
    setLoadingNeighborhoods(true)

    const { data, error: loadError } = await supabase
      .from('delivery_neighborhoods')
      .select('id, restaurant_id, name, delivery_fee, is_active')
      .eq('restaurant_id', id)
      .order('name', { ascending: true })

    if (loadError) {
      setError('Não foi possível carregar os bairros de entrega.')
      setLoadingNeighborhoods(false)
      return
    }

    setNeighborhoods((data || []) as Neighborhood[])
    setLoadingNeighborhoods(false)
  }

  function getLogoPath(url: string | null) {
    if (!url) return null

    const marker = '/storage/v1/object/public/product-images/'
    const index = url.indexOf(marker)

    if (index === -1) return null

    try {
      return decodeURIComponent(url.slice(index + marker.length))
    } catch {
      return null
    }
  }

  // ==========================================
  // UPLOAD DO LOGOTIPO
  // ==========================================

  async function uploadLogo(file: File) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Use uma imagem JPG, PNG ou WebP.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('O logotipo deve ter no máximo 5 MB.')
    }

    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }

    const fileName =
      `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensions[file.type]}`

    const filePath = `${restaurantId}/logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new Error(
        'Não foi possível enviar o logotipo. Verifique as permissões do armazenamento.'
      )
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  // ==========================================
  // SALVAR INFORMAÇÕES DA LOJA
  // ==========================================

  async function saveShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!restaurantId || !restaurant) return

    if (!form.name.trim() || !form.slug.trim()) {
      setError('Preencha o nome e o endereço público da loja.')
      return
    }

    if (!form.state || !form.city) {
      setError('Selecione o estado e a cidade da loja.')
      return
    }

    if (!states.some(state => state.sigla === form.state)) {
      setError('Selecione um estado válido.')
      return
    }

    if (!cities.some(city => city.nome === form.city)) {
      setError('Selecione uma cidade válida para o estado escolhido.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    let uploadedPath: string | null = null

    try {
      let logoUrl = restaurant.logo_url

      if (logoFile) {
        logoUrl = await uploadLogo(logoFile)
        uploadedPath = getLogoPath(logoUrl)
      }

      const { error: saveError } = await supabase
        .from('restaurants')
        .update({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase(),
          description: form.description.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim(),
          state: form.state.trim().toUpperCase(),
          logo_url: logoUrl,
        })
        .eq('id', restaurantId)

      if (saveError) {
        if (uploadedPath) {
          await supabase.storage
            .from('product-images')
            .remove([uploadedPath])
        }

        throw new Error(
          'Não foi possível salvar. Verifique se o endereço público já está sendo utilizado.'
        )
      }

      if (logoFile && restaurant.logo_url) {
        const oldPath = getLogoPath(restaurant.logo_url)

        if (oldPath && oldPath !== uploadedPath) {
          await supabase.storage
            .from('product-images')
            .remove([oldPath])
        }
      }

      setLogoFile(null)
      setMessage('Dados da loja atualizados com sucesso!')

      await loadRestaurant()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao salvar.'
      )
    } finally {
      setSaving(false)
    }
  }

  // ==========================================
  // SALVAR BAIRRO
  // ==========================================

  async function saveNeighborhood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!restaurantId) return

    const name = neighborhoodName.trim()
    const fee = Number(neighborhoodFee.replace(',', '.'))

    if (!name) {
      setError('Informe o nome do bairro.')
      return
    }

    if (
      neighborhoodFee.trim() === '' ||
      !Number.isFinite(fee) ||
      fee < 0
    ) {
      setError('Informe um valor de frete válido.')
      return
    }

    setSavingNeighborhood(true)
    setError('')
    setMessage('')

    const payload = {
      restaurant_id: restaurantId,
      name,
      delivery_fee: fee,
    }

    const result = editingId
      ? await supabase
          .from('delivery_neighborhoods')
          .update(payload)
          .eq('id', editingId)
          .eq('restaurant_id', restaurantId)
      : await supabase
          .from('delivery_neighborhoods')
          .insert(payload)

    if (result.error) {
      setError(
        result.error.code === '23505'
          ? 'Esse bairro já está cadastrado.'
          : `Não foi possível salvar o bairro: ${result.error.message}`
      )
      setSavingNeighborhood(false)
      return
    }

    const wasEditing = Boolean(editingId)

    setNeighborhoodName('')
    setNeighborhoodFee('')
    setEditingId(null)

    setMessage(
      wasEditing
        ? 'Bairro atualizado com sucesso!'
        : 'Bairro cadastrado com sucesso!'
    )

    await loadNeighborhoods(restaurantId)
    setSavingNeighborhood(false)
  }

  function editNeighborhood(item: Neighborhood) {
    setEditingId(item.id)
    setNeighborhoodName(item.name)
    setNeighborhoodFee(
      Number(item.delivery_fee).toFixed(2).replace('.', ',')
    )

    setError('')
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setNeighborhoodName('')
    setNeighborhoodFee('')
  }

  async function toggleNeighborhood(item: Neighborhood) {
    setError('')
    setMessage('')

    const { error: updateError } = await supabase
      .from('delivery_neighborhoods')
      .update({ is_active: !item.is_active })
      .eq('id', item.id)
      .eq('restaurant_id', restaurantId)

    if (updateError) {
      setError('Não foi possível alterar a situação do bairro.')
      return
    }

    setMessage(item.is_active ? 'Bairro desativado.' : 'Bairro ativado.')
    await loadNeighborhoods(restaurantId)
  }

  async function deleteNeighborhood(item: Neighborhood) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o bairro ${item.name}?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error: deleteError } = await supabase
      .from('delivery_neighborhoods')
      .delete()
      .eq('id', item.id)
      .eq('restaurant_id', restaurantId)

    if (deleteError) {
      setError('Não foi possível excluir o bairro.')
      return
    }

    if (editingId === item.id) {
      cancelEdit()
    }

    setMessage('Bairro excluído com sucesso!')
    await loadNeighborhoods(restaurantId)
  }

  // ==========================================
  // RESUMO
  // ==========================================

  const activeNeighborhoods = neighborhoods.filter(
    item => item.is_active
  ).length

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-slate-500">
        Carregando informações da loja...
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-red-700">
            {error || 'Restaurante não encontrado.'}
          </p>

          <button
            onClick={loadRestaurant}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // TELA PRINCIPAL
  // ==========================================

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
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                item.href === '/painel/loja'
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
          <p className="text-sm font-semibold">Configurações da loja</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Personalize seu restaurante, horários e opções de entrega.
          </p>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="min-w-0 flex-1 p-5 md:p-8">

        {/* CABEÇALHO */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              MenuFlow / Gerenciamento
            </p>

            <h2 className="mt-1 text-2xl font-bold">
              Minha loja
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Gerencie as informações e o funcionamento do seu restaurante.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt="Logotipo"
                  className="h-full w-full object-cover"
                />
              ) : (
                restaurant.name.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <p className="text-sm font-semibold">{restaurant.name}</p>
              <p className="text-xs text-slate-500">Configurações da loja</p>
            </div>
          </div>
        </header>

        {/* MENSAGENS */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>⚠</span>
            <p className="flex-1">{error}</p>
            <button onClick={() => setError('')} className="font-bold">
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <span>✓</span>
            <p className="flex-1">{message}</p>
            <button onClick={() => setMessage('')} className="font-bold">
              ×
            </button>
          </div>
        )}

        {/* RESUMO */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Funcionamento atual</p>

            <p className={`mt-3 text-xl font-bold ${
              effectiveOpen ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {checkingOpen
                ? 'Consultando...'
                : effectiveOpen
                  ? 'Aberta'
                  : 'Fechada'}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Situação da loja
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Bairros cadastrados</p>

            <p className="mt-3 text-3xl font-bold">
              {neighborhoods.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {activeNeighborhoods} bairros ativos
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Modo de entrega</p>

            <p className="mt-3 text-xl font-bold">
              {deliveryMode === 'gps' ? 'Bairro + GPS' : 'Por bairro'}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Validação de entrega
            </p>
          </div>
        </section>

        {/* FUNCIONAMENTO */}
        <section className={cardClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ◷
            </div>

            <div>
              <h3 className="text-lg font-bold">Funcionamento da loja</h3>

              <p className="mt-1 text-sm text-slate-500">
                Controle a abertura e configure seus horários semanais.
              </p>
            </div>
          </div>

          <div className={`mb-5 rounded-xl border p-4 ${
            effectiveOpen
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <p className={`font-bold ${
              effectiveOpen ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {checkingOpen
                ? 'Consultando funcionamento...'
                : effectiveOpen
                  ? '● Loja aberta agora'
                  : '● Loja fechada agora'}
            </p>

            <p className="mt-1 text-xs text-slate-600">
              {restaurant.manual_override === null
                ? 'Modo automático: os horários cadastrados controlam a abertura.'
                : restaurant.manual_override
                  ? 'Abertura manual ativa; o horário automático está ignorado.'
                  : 'Fechamento manual ativo; o horário automático está ignorado.'}
            </p>
          </div>

          <div className="mb-7 grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setManualOverride(true)}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Abrir manualmente
            </button>

            <button
              type="button"
              onClick={() => setManualOverride(false)}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Fechar manualmente
            </button>

            <button
              type="button"
              onClick={() => setManualOverride(null)}
              className="rounded-xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Voltar ao automático
            </button>
          </div>

          <div className="mb-5 border-t border-slate-100 pt-6">
            <h4 className="font-bold">Horários semanais</h4>

            <p className="mt-1 text-sm text-slate-500">
              Configure os horários de abertura e fechamento de cada dia.
            </p>
          </div>

          <form onSubmit={saveSchedule}>
            <div className="space-y-3">
              {schedule.map(day => (
                <div
                  key={day.weekday}
                  className="grid items-center gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[minmax(130px,1fr)_1fr_1fr_auto]"
                >
                  <strong className="text-sm">
                    {weekDays[day.weekday]}
                  </strong>

                  <label className="text-xs text-slate-500">
                    Abertura

                    <input
                      type="time"
                      value={day.opening_time.slice(0, 5)}
                      disabled={day.is_closed}
                      onChange={e =>
                        updateScheduleDay(day.weekday, {
                          opening_time: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="text-xs text-slate-500">
                    Fechamento

                    <input
                      type="time"
                      value={day.closing_time.slice(0, 5)}
                      disabled={day.is_closed}
                      onChange={e =>
                        updateScheduleDay(day.weekday, {
                          closing_time: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={day.is_closed}
                      onChange={e =>
                        updateScheduleDay(day.weekday, {
                          is_closed: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-blue-600"
                    />
                    Fechado
                  </label>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={savingSchedule}
              className="mt-5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {savingSchedule ? 'Salvando horários...' : 'Salvar horários'}
            </button>
          </form>
        </section>

        {/* INFORMAÇÕES DA LOJA */}
        <section className={cardClass}>
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-700">
              🏪
            </div>

            <div>
              <h3 className="text-lg font-bold">
                Informações do restaurante
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Esses dados serão utilizados na apresentação pública da sua loja.
              </p>
            </div>
          </div>

          <form onSubmit={saveShop} className="grid gap-5 md:grid-cols-2">

            <label className="text-sm font-medium">
              Nome do restaurante

              <input
                className={inputClass}
                value={form.name}
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="text-sm font-medium">
              Endereço público do cardápio (slug)

              <input
                className={inputClass}
                value={form.slug}
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                required
              />
            </label>

            {/* ESTADO IBGE */}
            <label className="text-sm font-medium">
              Estado (UF)

              <select
                className={inputClass}
                value={form.state}
                disabled={loadingStates}
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    state: e.target.value,
                    city: '',
                  }))
                }
                required
              >
                <option value="">
                  {loadingStates
                    ? 'Carregando estados...'
                    : 'Selecione o estado'}
                </option>

                {states.map(state => (
                  <option key={state.id} value={state.sigla}>
                    {state.nome} ({state.sigla})
                  </option>
                ))}
              </select>

              <span className="mt-1 block text-xs text-slate-400">
                Lista oficial de estados do IBGE.
              </span>
            </label>

            {/* CIDADE IBGE */}
            <label className="text-sm font-medium">
              Cidade

              <select
                className={inputClass}
                value={form.city}
                disabled={
                  !form.state ||
                  loadingCities ||
                  cities.length === 0
                }
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    city: e.target.value,
                  }))
                }
                required
              >
                <option value="">
                  {!form.state
                    ? 'Selecione primeiro o estado'
                    : loadingCities
                      ? 'Carregando cidades...'
                      : cities.length === 0
                        ? 'Nenhuma cidade disponível'
                        : 'Selecione a cidade'}
                </option>

                {cities.map(city => (
                  <option key={city.id} value={city.nome}>
                    {city.nome}
                  </option>
                ))}
              </select>

              <span className="mt-1 block text-xs text-slate-400">
                As cidades são carregadas automaticamente conforme o estado.
              </span>
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Descrição

              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                value={form.description}
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Conte um pouco sobre seu restaurante..."
              />
            </label>

            <label className="text-sm font-medium">
              Telefone / WhatsApp

              <input
                className={inputClass}
                value={form.phone}
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    phone: e.target.value,
                  }))
                }
                placeholder="(88) 99999-9999"
              />
            </label>

            <label className="text-sm font-medium">
              Endereço

              <textarea
                className={`${inputClass} min-h-12 resize-y`}
                value={form.address}
                onChange={e =>
                  setForm(current => ({
                    ...current,
                    address: e.target.value,
                  }))
                }
                placeholder="Rua, número e bairro"
              />
            </label>

            {/* LOGOTIPO */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium">
                Logotipo do restaurante

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e =>
                    setLogoFile(e.target.files?.[0] || null)
                  }
                  className={inputClass}
                />
              </label>

              <p className="mt-2 text-xs text-slate-400">
                Formatos JPG, PNG ou WebP. Tamanho máximo: 5 MB.
              </p>

              {restaurant.logo_url && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-slate-500">
                    Logotipo atual
                  </p>

                  <img
                    src={restaurant.logo_url}
                    alt="Logotipo do restaurante"
                    className="h-28 w-28 rounded-xl border border-slate-200 bg-white object-contain p-2"
                  />
                </div>
              )}

              {logoFile && (
                <p className="mt-2 text-xs text-emerald-600">
                  Nova imagem selecionada: {logoFile.name}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || loadingStates || loadingCities}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </section>

        {/* MODO DE ENTREGA */}
        <section className={cardClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">
              🚚
            </div>

            <div>
              <h3 className="text-lg font-bold">Modo de entrega</h3>

              <p className="mt-1 text-sm text-slate-500">
                Escolha como o sistema validará o endereço do cliente.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              deliveryMode === 'simple'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="deliveryMode"
                checked={deliveryMode === 'simple'}
                onChange={() => setDeliveryMode('simple')}
                className="mt-1 accent-blue-600"
              />

              <span>
                <strong className="text-sm">Entrega por bairro</strong>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  O cliente informa o bairro. O sistema verifica se ele está
                  cadastrado e calcula a taxa de entrega.
                </p>
              </span>
            </label>

            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              deliveryMode === 'gps'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="deliveryMode"
                checked={deliveryMode === 'gps'}
                onChange={() => setDeliveryMode('gps')}
                className="mt-1 accent-blue-600"
              />

              <span>
                <strong className="text-sm">
                  Entrega por bairro + GPS
                </strong>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Além de conferir o bairro, o sistema verifica a localização
                  do cliente dentro da área de entrega.
                </p>
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={saveDeliveryMode}
            disabled={savingDeliveryMode}
            className="mt-5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {savingDeliveryMode
              ? 'Salvando...'
              : 'Salvar modo de entrega'}
          </button>
        </section>

        {/* BAIRROS */}
        <section className={cardClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700">
              📍
            </div>

            <div>
              <h3 className="text-lg font-bold">
                Taxas de entrega por bairro
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre as regiões atendidas e defina o valor de cada entrega.
              </p>
            </div>
          </div>

          <form
            onSubmit={saveNeighborhood}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="text-sm font-medium">
              Nome do bairro

              <input
                className={inputClass}
                value={neighborhoodName}
                onChange={e => setNeighborhoodName(e.target.value)}
                placeholder="Ex.: Centro"
                required
              />
            </label>

            <label className="text-sm font-medium">
              Taxa de entrega (R$)

              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={neighborhoodFee}
                onChange={e => setNeighborhoodFee(e.target.value)}
                placeholder="Ex.: 5,00"
                required
              />
            </label>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={savingNeighborhood}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {savingNeighborhood
                  ? 'Salvando...'
                  : editingId
                    ? 'Salvar bairro'
                    : '+ Adicionar bairro'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-xl bg-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h4 className="font-bold">
                Bairros cadastrados
              </h4>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {neighborhoods.length} cadastrados
              </span>
            </div>

            {loadingNeighborhoods ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Carregando bairros...
              </p>
            ) : neighborhoods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <span className="text-3xl">📍</span>

                <p className="mt-3 font-semibold">
                  Nenhum bairro cadastrado
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Adicione os bairros onde seu restaurante realiza entregas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {neighborhoods.map(item => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">{item.name}</p>

                      <p className="mt-1 text-lg font-bold text-emerald-600">
                        {formatCurrency(Number(item.delivery_fee))}
                      </p>

                      <span className={`text-xs font-medium ${
                        item.is_active
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}>
                        {item.is_active ? '● Ativo' : '● Desativado'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editNeighborhood(item)}
                        className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleNeighborhood(item)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          item.is_active
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {item.is_active ? 'Desativar' : 'Ativar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteNeighborhood(item)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CARDÁPIO PÚBLICO */}
        <section className="mb-6 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white shadow-sm">
          <h3 className="text-lg font-bold">
            Seu cardápio está pronto?
          </h3>

          <p className="mt-2 text-sm text-blue-100">
            Acesse a página pública do restaurante para conferir como seus clientes visualizam a loja.
          </p>

          <a
            href={`/cardapio/${restaurant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Visualizar meu cardápio →
          </a>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Painel do restaurante
        </footer>
      </main>
    </div>
  )
}
