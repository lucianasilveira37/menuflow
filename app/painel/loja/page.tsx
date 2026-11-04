
'use client'

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

const weekDays = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

const inputStyle = {
  width: '100%',
  padding: 12,
  border: '1px solid #ddd',
  borderRadius: 8,
  marginTop: 7,
  marginBottom: 17,
  boxSizing: 'border-box' as const,
}

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: 22,
  marginBottom: 22,
  border: '1px solid #eee',
}

const primaryButton = {
  background: '#f07835',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 20px',
  cursor: 'pointer',
  fontWeight: 600 as const,
}

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

  const [schedule, setSchedule] = useState<OperatingDay[]>(
    weekDays.map((_, weekday) => ({
      weekday,
      is_closed: true,
      opening_time: '18:00',
      closing_time: '23:00',
    }))
  )

  const [savingSchedule, setSavingSchedule] = useState(false)
  const [effectiveOpen, setEffectiveOpen] = useState(false)
  const [checkingOpen, setCheckingOpen] = useState(false)

  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([])
  const [neighborhoodName, setNeighborhoodName] = useState('')
  const [neighborhoodFee, setNeighborhoodFee] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingNeighborhood, setSavingNeighborhood] = useState(false)
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false)

  // Configuração do modo de entrega.
  const [deliveryMode, setDeliveryMode] = useState<'simple' | 'gps'>('simple')
  const [savingDeliveryMode, setSavingDeliveryMode] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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

    const {
      data: membership,
      error: membershipError,
    } = await supabase
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
      .select('id, name, slug, description, phone, address, city, state, logo_url, is_open, manual_override, timezone, delivery_validation_mode')
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

    setForm({
      name: shop.name || '',
      slug: shop.slug || '',
      description: shop.description || '',
      phone: shop.phone || '',
      address: shop.address || '',
      city: shop.city || '',
      state: shop.state || '',
    })

    await loadNeighborhoods(id)
    await loadOperatingHours(id)
    await refreshEffectiveOpen(id)

    setLoading(false)
  }

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

    const invalid = schedule.some(day =>
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
      setError('Não foi possível salvar. Confira se a tabela operating_hours foi criada.')
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
        day.weekday === weekday
          ? { ...day, ...changes }
          : day
      )
    )
  }

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
          ? 'Loja aberta manualmente até voltar ao automático.'
          : 'Loja fechada manualmente até voltar ao automático.'
    )
  }

  // Salva a configuração do modo de entrega.
  async function saveDeliveryMode() {
    if (!restaurantId) return

    setSavingDeliveryMode(true)
    setError('')
    setMessage('')

    const { error: saveError } = await supabase
      .from('restaurants')
      .update({
        delivery_validation_mode: deliveryMode,
      })
      .eq('id', restaurantId)

    if (saveError) {
      console.error('Erro ao salvar modo de entrega:', saveError)
      setError('Não foi possível salvar o modo de entrega.')
      setSavingDeliveryMode(false)
      return
    }

    setRestaurant(current =>
      current
        ? {
            ...current,
            delivery_validation_mode: deliveryMode,
          }
        : current
    )

    setMessage('Modo de entrega atualizado com sucesso!')
    setSavingDeliveryMode(false)
  }

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

  async function uploadLogo(file: File) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

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

  async function saveShop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!restaurantId || !restaurant) return

    if (!form.name.trim() || !form.slug.trim()) {
      setError('Preencha o nome e o endereço público da loja.')
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
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
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

      setMessage('Dados da loja atualizados com sucesso!')
      setLogoFile(null)

      await loadRestaurant()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao salvar.'
      )
    }

    setSaving(false)
  }

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

    setNeighborhoodName('')
    setNeighborhoodFee('')
    setEditingId(null)

    setMessage(
      editingId
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

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth',
    })
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

    setMessage(
      item.is_active
        ? 'Bairro desativado.'
        : 'Bairro ativado.'
    )

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

  if (loading) {
    return (
      <main className="dashboard-content">
        Carregando informações da loja...
      </main>
    )
  }

  if (!restaurant) {
    return (
      <main className="dashboard-content">
        <p style={{ color: '#b42318' }}>
          {error || 'Restaurante não encontrado.'}
        </p>
      </main>
    )
  }

  return (
    <main className="dashboard-content">
      <div style={{ marginBottom: 25 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          Minha loja
        </h1>

        <p style={{ color: '#777' }}>
          Gerencie as informações públicas do seu restaurante.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#ffe8e8',
          color: '#b42318',
          padding: 14,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          background: '#e8f7ed',
          color: '#18763b',
          padding: 14,
          borderRadius: 8,
          marginBottom: 16,
        }}>
          {message}
        </div>
      )}

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Funcionamento da loja</h2>

        <p style={{ color: '#777', lineHeight: 1.6 }}>
          A loja abre e fecha conforme os horários cadastrados. Você também pode
          forçar a abertura ou o fechamento manualmente.
        </p>

        <div style={{
          padding: 14,
          borderRadius: 8,
          background: effectiveOpen ? '#e8f7ed' : '#fef0ef',
          marginBottom: 16,
        }}>
          <strong style={{ color: effectiveOpen ? '#18763b' : '#b42318' }}>
            {checkingOpen
              ? 'Consultando funcionamento...'
              : effectiveOpen
                ? '● Loja aberta agora'
                : '● Loja fechada agora'}
          </strong>

          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 13 }}>
            {restaurant.manual_override === null
              ? 'Modo automático: os horários cadastrados controlam a abertura.'
              : restaurant.manual_override
                ? 'Abertura manual ativa; o horário automático está ignorado.'
                : 'Fechamento manual ativo; o horário automático está ignorado.'}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}>
          <button
            type="button"
            onClick={() => setManualOverride(true)}
            style={{ ...primaryButton, background: '#18763b' }}
          >
            Forçar abertura
          </button>

          <button
            type="button"
            onClick={() => setManualOverride(false)}
            style={{ ...primaryButton, background: '#b42318' }}
          >
            Forçar fechamento
          </button>

          <button
            type="button"
            onClick={() => setManualOverride(null)}
            style={{ ...primaryButton, background: '#555' }}
          >
            Voltar ao automático
          </button>
        </div>

        <form onSubmit={saveSchedule}>
          <h3 style={{ fontSize: 17 }}>Horários semanais</h3>

          <p style={{ color: '#777', fontSize: 13, lineHeight: 1.5 }}>
            Configure um período por dia. Para dias sem atendimento, marque “Fechado”.
            Os horários usam o fuso de Fortaleza.
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {schedule.map(day => (
              <div
                key={day.weekday}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                  borderBottom: '1px solid #eee',
                  paddingBottom: 12,
                }}
              >
                <strong style={{ width: 135 }}>
                  {weekDays[day.weekday]}
                </strong>

                <label style={{ fontSize: 13, flex: '1 1 100px' }}>
                  Abre
                  <input
                    type="time"
                    value={day.opening_time.slice(0, 5)}
                    disabled={day.is_closed}
                    onChange={e =>
                      updateScheduleDay(day.weekday, {
                        opening_time: e.target.value,
                      })
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </label>

                <label style={{ fontSize: 13, flex: '1 1 100px' }}>
                  Fecha
                  <input
                    type="time"
                    value={day.closing_time.slice(0, 5)}
                    disabled={day.is_closed}
                    onChange={e =>
                      updateScheduleDay(day.weekday, {
                        closing_time: e.target.value,
                      })
                    }
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </label>

                <label style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  fontSize: 13,
                }}>
                  <input
                    type="checkbox"
                    checked={day.is_closed}
                    onChange={e =>
                      updateScheduleDay(day.weekday, {
                        is_closed: e.target.checked,
                      })
                    }
                  />
                  Fechado
                </label>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={savingSchedule}
            style={{
              ...primaryButton,
              marginTop: 18,
              opacity: savingSchedule ? 0.6 : 1,
            }}
          >
            {savingSchedule ? 'Salvando horários...' : 'Salvar horários'}
          </button>
        </form>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          Informações do restaurante
        </h2>

        <form onSubmit={saveShop}>
          <label>
            Nome do restaurante
            <input
              style={inputStyle}
              value={form.name}
              onChange={e =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </label>

          <label>
            Endereço público do cardápio (slug)
            <input
              style={inputStyle}
              value={form.slug}
              onChange={e =>
                setForm({
                  ...form,
                  slug: e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-'),
                })
              }
              required
            />
          </label>

          <label>
            Cidade
            <input
              style={inputStyle}
              value={form.city}
              onChange={e =>
                setForm({ ...form, city: e.target.value })
              }
              placeholder="Ex.: Jaguaruana"
              required
            />
          </label>

          <label>
            Estado (UF)
            <input
              style={inputStyle}
              value={form.state}
              maxLength={2}
              onChange={e =>
                setForm({
                  ...form,
                  state: e.target.value.toUpperCase().replace(/[^A-Z]/g, ''),
                })
              }
              placeholder="Ex.: CE"
              required
            />
          </label>

          <p style={{
            color: '#777',
            fontSize: 13,
            marginTop: -10,
            marginBottom: 17,
          }}>
            Endereço atual: /cardapio/{form.slug}
          </p>

          <label>
            Descrição
            <textarea
              style={{
                ...inputStyle,
                minHeight: 90,
                resize: 'vertical',
              }}
              value={form.description}
              onChange={e =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Conte um pouco sobre seu restaurante..."
            />
          </label>

          <label>
            Telefone / WhatsApp
            <input
              style={inputStyle}
              value={form.phone}
              onChange={e =>
                setForm({ ...form, phone: e.target.value })
              }
              placeholder="(88) 99999-9999"
            />
          </label>

          <label>
            Endereço
            <textarea
              style={{
                ...inputStyle,
                minHeight: 75,
                resize: 'vertical',
              }}
              value={form.address}
              onChange={e =>
                setForm({ ...form, address: e.target.value })
              }
              placeholder="Rua, número, bairro e cidade"
            />
          </label>

          <label>
            Logotipo do restaurante
            <input
              style={inputStyle}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e =>
                setLogoFile(e.target.files?.[0] || null)
              }
            />
          </label>

          {restaurant.logo_url && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ color: '#777', fontSize: 13 }}>
                Logotipo atual:
              </p>

              <img
                src={restaurant.logo_url}
                alt="Logotipo do restaurante"
                style={{
                  width: 120,
                  height: 120,
                  objectFit: 'contain',
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 8,
                }}
              />
            </div>
          )}

          {logoFile && (
            <p style={{ color: '#18763b', fontSize: 13 }}>
              Nova imagem selecionada: {logoFile.name}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              ...primaryButton,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </section>

      {/* CONFIGURAÇÃO DO MODO DE ENTREGA */}
      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>Modo de entrega</h2>

        <p style={{ color: '#777', lineHeight: 1.6 }}>
          Escolha como o MenuFlow deverá validar as entregas do seu restaurante.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: 14,
            border: deliveryMode === 'simple'
              ? '2px solid #16a34a'
              : '1px solid #ddd',
            borderRadius: 10,
            marginBottom: 12,
            cursor: 'pointer',
          }}
        >
          <input
            type="radio"
            name="deliveryMode"
            value="simple"
            checked={deliveryMode === 'simple'}
            onChange={() => setDeliveryMode('simple')}
          />

          <span>
            <strong>Entrega por bairro</strong>
            <br />
            <small style={{ color: '#777' }}>
              O cliente digita o bairro. O sistema confere se ele está cadastrado
              e calcula a taxa. Não exige localização GPS.
            </small>
          </span>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: 14,
            border: deliveryMode === 'gps'
              ? '2px solid #16a34a'
              : '1px solid #ddd',
            borderRadius: 10,
            marginBottom: 18,
            cursor: 'pointer',
          }}
        >
          <input
            type="radio"
            name="deliveryMode"
            value="gps"
            checked={deliveryMode === 'gps'}
            onChange={() => setDeliveryMode('gps')}
          />

          <span>
            <strong>Entrega por bairro + GPS</strong>
            <br />
            <small style={{ color: '#777' }}>
              Além de conferir o bairro, o sistema verifica se a localização
              do cliente está dentro da área de entrega cadastrada.
            </small>
          </span>
        </label>

        <button
          type="button"
          onClick={saveDeliveryMode}
          disabled={savingDeliveryMode}
          style={{
            ...primaryButton,
            opacity: savingDeliveryMode ? 0.6 : 1,
          }}
        >
          {savingDeliveryMode
            ? 'Salvando...'
            : 'Salvar modo de entrega'}
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          Taxas de entrega por bairro
        </h2>

        <p style={{ color: '#777', lineHeight: 1.6 }}>
          Cadastre os bairros atendidos pelo restaurante e
          defina quanto será cobrado pela entrega em cada um.
          Os bairros ativos poderão ser escolhidos pelos clientes.
        </p>

        <form onSubmit={saveNeighborhood}>
          <h3 style={{ fontSize: 17 }}>
            {editingId ? 'Editar bairro' : 'Adicionar bairro'}
          </h3>

          <label>
            Nome do bairro
            <input
              style={inputStyle}
              value={neighborhoodName}
              onChange={e => setNeighborhoodName(e.target.value)}
              placeholder="Ex.: Centro"
              required
            />
          </label>

          <label>
            Taxa de entrega (R$)
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={neighborhoodFee}
              onChange={e => setNeighborhoodFee(e.target.value)}
              placeholder="Ex.: 5,00"
              required
            />
          </label>

          <div style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}>
            <button
              type="submit"
              disabled={savingNeighborhood}
              style={{
                ...primaryButton,
                opacity: savingNeighborhood ? 0.6 : 1,
              }}
            >
              {savingNeighborhood
                ? 'Salvando...'
                : editingId
                  ? 'Salvar bairro'
                  : 'Adicionar bairro'}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  ...primaryButton,
                  background: '#666',
                }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <div style={{
          borderTop: '1px solid #eee',
          marginTop: 25,
          paddingTop: 20,
        }}>
          <h3 style={{ fontSize: 17 }}>
            Bairros cadastrados ({neighborhoods.length})
          </h3>

          {loadingNeighborhoods ? (
            <p style={{ color: '#777' }}>
              Carregando bairros...
            </p>
          ) : neighborhoods.length === 0 ? (
            <p style={{
              color: '#777',
              background: '#f8f8f8',
              padding: 16,
              borderRadius: 8,
            }}>
              Nenhum bairro cadastrado ainda.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gap: 12,
            }}>
              {neighborhoods.map(item => (
                <div
                  key={item.id}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 10,
                    padding: 15,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 15,
                    flexWrap: 'wrap',
                    opacity: item.is_active ? 1 : 0.65,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 16 }}>
                      {item.name}
                    </strong>

                    <p style={{
                      margin: '6px 0',
                      color: '#18763b',
                      fontWeight: 700,
                    }}>
                      {formatCurrency(Number(item.delivery_fee))}
                    </p>

                    <span style={{
                      fontSize: 12,
                      color: item.is_active ? '#18763b' : '#b42318',
                    }}>
                      {item.is_active ? '● Ativo' : '● Desativado'}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}>
                    <button
                      type="button"
                      onClick={() => editNeighborhood(item)}
                      style={{
                        ...primaryButton,
                        background: '#555',
                        padding: '9px 12px',
                      }}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleNeighborhood(item)}
                      style={{
                        ...primaryButton,
                        background: item.is_active ? '#b7791f' : '#18763b',
                        padding: '9px 12px',
                      }}
                    >
                      {item.is_active ? 'Desativar' : 'Ativar'}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteNeighborhood(item)}
                      style={{
                        ...primaryButton,
                        background: '#b42318',
                        padding: '9px 12px',
                      }}
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

      <section style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>
          Visualizar cardápio
        </h2>

        <p style={{ color: '#777' }}>
          Este é o endereço público da sua loja:
        </p>

        <a
          href={`/cardapio/${restaurant.slug}`}
          target="_blank"
          rel="noreferrer"
          style={{
            color: '#f07835',
            fontWeight: 600,
          }}
        >
          Abrir meu cardápio
        </a>
      </section>
    </main>
  )
}
