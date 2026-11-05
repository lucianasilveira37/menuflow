
'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabase'

type Comanda = {
  id: string
  status: 'open' | 'close_requested' | 'closed'
  created_at: string
  close_requested_at: string | null
  closed_at: string | null
}

type Mesa = {
  id: string
  name: string
  qr_token: string
  is_active: boolean
  created_at: string
  table_tabs: Comanda[] | null
}

const menuItems = [
  { title: 'Visão geral', href: '/painel', icon: '▦' },
  { title: 'Produtos', href: '/painel/produtos', icon: '🍕' },
  { title: 'Categorias', href: '/painel/categorias', icon: '▤' },
  { title: 'Pedidos', href: '/painel/pedidos', icon: '🧾' },
  { title: 'Mesas', href: '/painel/mesas', icon: '🪑' },
  { title: 'Loja', href: '/painel/loja', icon: '🏪' },
]

export default function MesasPage() {
  const router = useRouter()

  const [restaurantId, setRestaurantId] = useState('')
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [nomeMesa, setNomeMesa] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [mesaQR, setMesaQR] = useState<Mesa | null>(null)
  const [imagemQR, setImagemQR] = useState('')

  const [editandoId, setEditandoId] = useState('')
  const [novoNome, setNovoNome] = useState('')

  const carregarMesas = useCallback(async (id: string) => {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('restaurant_tables')
      .select(`
        id,
        name,
        qr_token,
        is_active,
        created_at,
        table_tabs (
          id,
          status,
          created_at,
          close_requested_at,
          closed_at
        )
      `)
      .eq('restaurant_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      setErro('Não foi possível carregar as mesas: ' + error.message)
      setCarregando(false)
      return
    }

    setMesas((data || []) as Mesa[])
    setCarregando(false)
  }, [])

  useEffect(() => {
    let ativo = true

    async function iniciar() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (!ativo) return

      if (authError || !authData.user) {
        router.replace('/')
        return
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from('memberships')
          .select('restaurant_id')
          .eq('user_id', authData.user.id)
          .in('role', ['owner', 'admin', 'staff'])
          .limit(1)
          .maybeSingle()

      if (!ativo) return

      if (membershipError || !membership) {
        setErro('Não encontramos um restaurante vinculado a esta conta.')
        setCarregando(false)
        return
      }

      setRestaurantId(membership.restaurant_id)
      await carregarMesas(membership.restaurant_id)
    }

    iniciar()

    return () => {
      ativo = false
    }
  }, [router, carregarMesas])

  async function adicionarMesa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!restaurantId || !nomeMesa.trim()) return

    setSalvando(true)
    setErro('')
    setSucesso('')

    const { error } = await supabase
      .from('restaurant_tables')
      .insert({
        restaurant_id: restaurantId,
        name: nomeMesa.trim(),
      })

    if (error) {
      setErro('Erro ao cadastrar mesa: ' + error.message)
    } else {
      setNomeMesa('')
      setSucesso('Mesa cadastrada com sucesso!')
      await carregarMesas(restaurantId)
    }

    setSalvando(false)
  }

  async function alternarAtivacao(mesa: Mesa) {
    setErro('')
    setSucesso('')

    const { error } = await supabase
      .from('restaurant_tables')
      .update({ is_active: !mesa.is_active })
      .eq('id', mesa.id)
      .eq('restaurant_id', restaurantId)

    if (error) {
      setErro('Não foi possível atualizar a mesa: ' + error.message)
      return
    }

    setSucesso(
      mesa.is_active
        ? 'Mesa desativada.'
        : 'Mesa ativada com sucesso!'
    )

    await carregarMesas(restaurantId)
  }

  async function salvarNome(mesa: Mesa) {
    if (!novoNome.trim()) {
      setErro('Informe o nome da mesa.')
      return
    }

    setErro('')
    setSucesso('')

    const { error } = await supabase
      .from('restaurant_tables')
      .update({ name: novoNome.trim() })
      .eq('id', mesa.id)
      .eq('restaurant_id', restaurantId)

    if (error) {
      setErro('Erro ao renomear mesa: ' + error.message)
      return
    }

    setEditandoId('')
    setNovoNome('')
    setSucesso('Nome atualizado com sucesso!')

    await carregarMesas(restaurantId)
  }

  async function abrirQR(mesa: Mesa) {
    const endereco = `${window.location.origin}/mesa/${mesa.qr_token}`

    try {
      const imagem = await QRCode.toDataURL(endereco, {
        width: 320,
        margin: 2,
      })

      setMesaQR(mesa)
      setImagemQR(imagem)
    } catch {
      setErro('Não foi possível gerar o QR Code.')
    }
  }

  async function copiarLink(mesa: Mesa) {
    const endereco = `${window.location.origin}/mesa/${mesa.qr_token}`

    try {
      await navigator.clipboard.writeText(endereco)
      setSucesso('Link da mesa copiado!')
    } catch {
      setErro('Não foi possível copiar o link.')
    }
  }

  async function fecharComanda(comanda: Comanda) {
    const confirmar = window.confirm(
      'Confirma o fechamento desta comanda?'
    )

    if (!confirmar) return

    setErro('')
    setSucesso('')

    const { error } = await supabase
      .from('table_tabs')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', comanda.id)
      .eq('restaurant_id', restaurantId)

    if (error) {
      setErro('Não foi possível fechar a comanda: ' + error.message)
      return
    }

    setSucesso('Comanda fechada com sucesso!')
    await carregarMesas(restaurantId)
  }

  function obterStatus(mesa: Mesa) {
    if (!mesa.is_active) return 'Inativa'

    const comandasAtivas = (mesa.table_tabs || []).filter(
      comanda =>
        comanda.status === 'open' ||
        comanda.status === 'close_requested'
    )

    if (
      comandasAtivas.some(
        comanda => comanda.status === 'close_requested'
      )
    ) {
      return 'Aguardando fechamento'
    }

    if (comandasAtivas.length > 0) return 'Ocupada'

    return 'Livre'
  }

  function dataFormatada(data: string) {
    return new Date(data).toLocaleString('pt-BR')
  }

  const totalOcupadas = mesas.filter(
    mesa => obterStatus(mesa) === 'Ocupada'
  ).length

  const totalLivres = mesas.filter(
    mesa => obterStatus(mesa) === 'Livre'
  ).length

  const totalAguardando = mesas.filter(
    mesa => obterStatus(mesa) === 'Aguardando fechamento'
  ).length

  const totalInativas = mesas.filter(
    mesa => obterStatus(mesa) === 'Inativa'
  ).length

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#f5f7fb] md:flex">
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
                  item.href === '/painel/mesas'
                    ? 'bg-blue-600 font-semibold text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.title}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex flex-1 items-center justify-center p-8 text-slate-500">
          Carregando mesas...
        </main>
      </div>
    )
  }

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
                item.href === '/painel/mesas'
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
          <p className="text-sm font-semibold">Gerenciamento de mesas</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Cadastre mesas, acompanhe comandas e gerencie os QR Codes do restaurante.
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
              Gerenciamento de Mesas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre mesas, gerencie QR Codes e acompanhe as comandas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => carregarMesas(restaurantId)}
            disabled={!restaurantId}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            ↻ Atualizar dados
          </button>
        </header>

        {/* MENSAGENS */}
        {erro && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>⚠</span>
            <p className="flex-1">{erro}</p>
            <button
              type="button"
              onClick={() => setErro('')}
              className="font-bold"
              aria-label="Fechar mensagem"
            >
              ×
            </button>
          </div>
        )}

        {sucesso && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <span>✓</span>
            <p className="flex-1">{sucesso}</p>
            <button
              type="button"
              onClick={() => setSucesso('')}
              className="font-bold"
              aria-label="Fechar mensagem"
            >
              ×
            </button>
          </div>
        )}

        {/* INDICADORES */}
        <section className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total de mesas</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {mesas.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">Mesas cadastradas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Livres</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {totalLivres}
            </p>
            <p className="mt-1 text-xs text-slate-400">Disponíveis</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ocupadas</p>
            <p className="mt-3 text-3xl font-bold text-orange-600">
              {totalOcupadas}
            </p>
            <p className="mt-1 text-xs text-slate-400">Com comandas abertas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Aguardando fechamento</p>
            <p className="mt-3 text-3xl font-bold text-red-600">
              {totalAguardando}
            </p>
            <p className="mt-1 text-xs text-slate-400">Solicitações pendentes</p>
          </div>

          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
            <p className="text-sm text-slate-500">Inativas</p>
            <p className="mt-3 text-3xl font-bold text-slate-600">
              {totalInativas}
            </p>
            <p className="mt-1 text-xs text-slate-400">Desativadas</p>
          </div>
        </section>

        {/* CADASTRO */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              +
            </div>
            <div>
              <h3 className="text-lg font-bold">Cadastrar nova mesa</h3>
              <p className="mt-1 text-sm text-slate-500">
                Adicione uma mesa para disponibilizar pedidos por QR Code.
              </p>
            </div>
          </div>

          <form
            onSubmit={adicionarMesa}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={nomeMesa}
              onChange={e => setNomeMesa(e.target.value)}
              placeholder="Ex.: Mesa 01, Varanda, Mesa 05..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />

            <button
              type="submit"
              disabled={salvando || !restaurantId}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? 'Cadastrando...' : '+ Cadastrar mesa'}
            </button>
          </form>

          <p className="mt-3 text-xs text-slate-400">
            O QR Code será criado automaticamente pelo banco de dados.
          </p>
        </section>

        {/* MESAS CADASTRADAS */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Mesas cadastradas
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Gerencie os acessos e acompanhe as comandas em andamento.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'}
            </span>
          </div>

          {mesas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                🪑
              </div>
              <p className="mt-4 text-lg font-bold text-slate-900">
                Nenhuma mesa cadastrada
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Cadastre sua primeira mesa para gerar o QR Code.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {mesas.map(mesa => {
                const comandasAtivas = (mesa.table_tabs || []).filter(
                  comanda =>
                    comanda.status === 'open' ||
                    comanda.status === 'close_requested'
                )

                const status = obterStatus(mesa)

                const statusClasses =
                  status === 'Livre'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : status === 'Ocupada'
                      ? 'border-orange-200 bg-orange-50 text-orange-700'
                      : status === 'Inativa'
                        ? 'border-slate-200 bg-slate-100 text-slate-600'
                        : 'border-red-200 bg-red-50 text-red-700'

                return (
                  <article
                    key={mesa.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="p-5">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {editandoId === mesa.id ? (
                            <div className="space-y-3">
                              <label className="text-xs font-semibold text-slate-500">
                                Nome da mesa
                              </label>

                              <input
                                value={novoNome}
                                onChange={e => setNovoNome(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                autoFocus
                              />

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => salvarNome(mesa)}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                  Salvar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditandoId('')
                                    setNovoNome('')
                                  }}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h4 className="truncate text-xl font-bold text-slate-900">
                                {mesa.name}
                              </h4>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoId(mesa.id)
                                  setNovoNome(mesa.name)
                                }}
                                className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
                              >
                                Renomear mesa
                              </button>
                            </>
                          )}
                        </div>

                        <span className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClasses}`}>
                          {status}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-500">
                          Comandas ativas
                        </p>
                        <div className="mt-1 flex items-end justify-between">
                          <p className="text-3xl font-bold text-slate-900">
                            {comandasAtivas.length}
                          </p>
                          <span className="text-xs text-slate-400">
                            {comandasAtivas.length === 1 ? 'comanda' : 'comandas'}
                          </span>
                        </div>
                      </div>

                      {comandasAtivas.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Comandas em andamento
                          </p>

                          {comandasAtivas.map(comanda => (
                            <div
                              key={comanda.id}
                              className="rounded-xl border border-slate-200 p-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">
                                    {comanda.status === 'open'
                                      ? 'Comanda aberta'
                                      : 'Fechamento solicitado'}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {dataFormatada(comanda.created_at)}
                                  </p>
                                </div>

                                {comanda.status === 'close_requested' && (
                                  <button
                                    type="button"
                                    onClick={() => fecharComanda(comanda)}
                                    className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                                  >
                                    Fechar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 p-5">
                      <button
                        type="button"
                        onClick={() => abrirQR(mesa)}
                        disabled={!mesa.is_active}
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Ver QR Code
                      </button>

                      <button
                        type="button"
                        onClick={() => copiarLink(mesa)}
                        disabled={!mesa.is_active}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Copiar link da mesa
                      </button>

                      <button
                        type="button"
                        onClick={() => alternarAtivacao(mesa)}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                          mesa.is_active
                            ? 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {mesa.is_active ? 'Desativar mesa' : 'Ativar mesa'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* MODAL DO QR CODE */}
        {mesaQR && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            onClick={() => {
              setMesaQR(null)
              setImagemQR('')
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                🪑
              </div>

              <h3 className="text-2xl font-bold text-slate-900">
                {mesaQR.name}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                QR Code para pedidos pela mesa
              </p>

              {imagemQR && (
                <div className="my-5 inline-flex rounded-2xl border border-slate-200 bg-white p-3">
                  <img
                    src={imagemQR}
                    alt={`QR Code da ${mesaQR.name}`}
                    className="mx-auto w-64"
                  />
                </div>
              )}

              <p className="mb-5 break-all rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                {window.location.origin}/mesa/{mesaQR.qr_token}
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href={imagemQR}
                  download={`qrcode-${mesaQR.name.replace(/\s+/g, '-')}.png`}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Baixar QR Code
                </a>

                <a
                  href={`/mesa/${mesaQR.qr_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Abrir página pública
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setMesaQR(null)
                    setImagemQR('')
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Painel do restaurante
        </footer>
      </main>
    </div>
  )
}
