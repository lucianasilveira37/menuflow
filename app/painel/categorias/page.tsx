
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Category = {
  id: string
  restaurant_id: string
  global_category_id: string | null
  name: string
  position: number
  is_active: boolean
}

type GlobalCategory = {
  id: string
  name: string
  description: string | null
  position: number
}

const menuItems = [
  { title: 'Visão geral', href: '/painel', icon: '▦' },
  { title: 'Produtos', href: '/painel/produtos', icon: '🍕' },
  { title: 'Categorias', href: '/painel/categorias', icon: '▤' },
  { title: 'Pedidos', href: '/painel/pedidos', icon: '🧾' },
  { title: 'Mesas', href: '/painel/mesas', icon: '🪑' },
  { title: 'Loja', href: '/painel/loja', icon: '🏪' },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [customName, setCustomName] = useState('')
  const [selectedGlobalId, setSelectedGlobalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Você precisa entrar na sua conta novamente.')
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

    setRestaurantId(membership.restaurant_id)

    const [categoriesResult, globalResult] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', membership.restaurant_id)
        .order('position', { ascending: true }),

      supabase
        .from('global_categories')
        .select('id, name, description, position')
        .eq('is_active', true)
        .order('position', { ascending: true }),
    ])

    if (categoriesResult.error) {
      setError('Erro ao carregar suas categorias.')
      setLoading(false)
      return
    }

    if (globalResult.error) {
      setError('Erro ao carregar o catálogo de categorias.')
      setLoading(false)
      return
    }

    setCategories(categoriesResult.data || [])
    setGlobalCategories(globalResult.data || [])
    setLoading(false)
  }

  async function addGlobalCategory() {
    if (!selectedGlobalId || !restaurantId) {
      setError('Selecione uma categoria do catálogo.')
      return
    }

    const selected = globalCategories.find(
      category => category.id === selectedGlobalId
    )

    if (!selected) return

    setSaving(true)
    setError('')
    setMessage('')

    const { error } = await supabase.from('categories').insert({
      restaurant_id: restaurantId,
      global_category_id: selected.id,
      name: selected.name,
      position: categories.length,
      is_active: true,
    })

    if (error) {
      setError(
        error.code === '23505'
          ? 'Essa categoria já foi adicionada ao seu restaurante.'
          : 'Não foi possível adicionar a categoria.'
      )
    } else {
      setMessage('Categoria adicionada com sucesso!')
      setSelectedGlobalId('')
      await loadData()
    }

    setSaving(false)
  }

  async function addCustomCategory() {
    const name = customName.trim()

    if (!name || !restaurantId) {
      setError('Digite o nome da categoria.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    const { error } = await supabase.from('categories').insert({
      restaurant_id: restaurantId,
      global_category_id: null,
      name,
      position: categories.length,
      is_active: true,
    })

    if (error) {
      setError('Não foi possível criar a categoria.')
    } else {
      setMessage('Categoria personalizada criada!')
      setCustomName('')
      await loadData()
    }

    setSaving(false)
  }

  async function toggleCategory(category: Category) {
    setError('')
    setMessage('')

    const { error } = await supabase
      .from('categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id)
      .eq('restaurant_id', restaurantId)

    if (error) {
      setError('Não foi possível alterar o status da categoria.')
      return
    }

    setMessage(
      category.is_active
        ? 'Categoria desativada.'
        : 'Categoria ativada.'
    )

    await loadData()
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a categoria "${category.name}"?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)
      .eq('restaurant_id', restaurantId)

    if (error) {
      setError(
        'Não foi possível excluir. Verifique se existem produtos vinculados a essa categoria e altere a categoria deles primeiro.'
      )
      return
    }

    setMessage('Categoria excluída.')
    await loadData()
  }

  async function moveCategory(index: number, direction: number) {
    const newIndex = index + direction

    if (newIndex < 0 || newIndex >= categories.length) return

    const current = categories[index]
    const other = categories[newIndex]

    setError('')
    setMessage('')

    const { error: firstError } = await supabase
      .from('categories')
      .update({ position: other.position })
      .eq('id', current.id)
      .eq('restaurant_id', restaurantId)

    if (firstError) {
      setError('Não foi possível alterar a ordem.')
      return
    }

    const { error: secondError } = await supabase
      .from('categories')
      .update({ position: current.position })
      .eq('id', other.id)
      .eq('restaurant_id', restaurantId)

    if (secondError) {
      setError('A ordem não foi atualizada completamente. Tente novamente.')
    } else {
      setMessage('Ordem atualizada!')
    }

    await loadData()
  }

  const availableGlobalCategories = globalCategories.filter(
    globalCategory =>
      !categories.some(
        category => category.global_category_id === globalCategory.id
      )
  )

  const activeCount = categories.filter(category => category.is_active).length
  const inactiveCount = categories.length - activeCount

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] text-slate-500">
        Carregando categorias...
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
                item.href === '/painel/categorias'
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
          <p className="text-sm font-semibold">Organização do cardápio</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Crie e organize categorias para facilitar a navegação dos seus clientes.
          </p>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="min-w-0 flex-1 p-5 md:p-8">

        {/* CABEÇALHO */}
        <header className="mb-8">
          <p className="text-sm text-slate-500">
            MenuFlow / Gerenciamento
          </p>
          <h2 className="mt-1 text-2xl font-bold">
            Categorias
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Organize os produtos do seu restaurante de forma simples.
          </p>
        </header>

        {/* RESUMO */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total de categorias</p>
            <p className="mt-3 text-3xl font-bold">{categories.length}</p>
            <p className="mt-1 text-xs text-slate-400">Categorias cadastradas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Categorias ativas</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">{activeCount}</p>
            <p className="mt-1 text-xs text-slate-400">Disponíveis no gerenciamento</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Categorias inativas</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">{inactiveCount}</p>
            <p className="mt-1 text-xs text-slate-400">Desativadas</p>
          </div>
        </section>

        {/* MENSAGENS */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>⚠</span>
            <p>{error}</p>
            <button onClick={() => setError('')} className="ml-auto font-bold">
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <span>✓</span>
            <p>{message}</p>
            <button onClick={() => setMessage('')} className="ml-auto font-bold">
              ×
            </button>
          </div>
        )}

        {/* ADICIONAR CATEGORIA DO CATÁLOGO */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ▤
            </div>
            <div>
              <h3 className="font-bold">Adicionar do catálogo MenuFlow</h3>
              <p className="mt-1 text-sm text-slate-500">
                Utilize categorias prontas para agilizar a organização do cardápio.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedGlobalId}
              onChange={event => setSelectedGlobalId(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Selecione uma categoria</option>
              {availableGlobalCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={addGlobalCategory}
              disabled={saving || !selectedGlobalId}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Adicionando...' : '+ Adicionar categoria'}
            </button>
          </div>

          {availableGlobalCategories.length === 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Todas as categorias disponíveis já foram adicionadas.
            </p>
          )}
        </section>

        {/* CATEGORIA PERSONALIZADA */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-700">
              ✚
            </div>
            <div>
              <h3 className="font-bold">Criar categoria personalizada</h3>
              <p className="mt-1 text-sm text-slate-500">
                Crie uma categoria exclusiva para seu estabelecimento.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Ex.: Especiais da casa"
              value={customName}
              onChange={event => setCustomName(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !saving) addCustomCategory()
              }}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={addCustomCategory}
              disabled={saving || !customName.trim()}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Criar categoria'}
            </button>
          </div>
        </section>

        {/* LISTA DE CATEGORIAS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Minhas categorias</h3>
              <p className="mt-1 text-sm text-slate-500">
                Organize a ordem e controle quais categorias estão ativas.
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              {categories.length} cadastradas
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
              <span className="text-4xl">📂</span>
              <p className="mt-4 font-semibold">Nenhuma categoria cadastrada</p>
              <p className="mt-1 text-sm text-slate-500">
                Adicione uma categoria do catálogo ou crie a sua própria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category, index) => (
                <div
                  key={category.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-500">
                      {index + 1}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold">{category.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {category.global_category_id
                            ? 'Catálogo MenuFlow'
                            : 'Personalizada'}
                        </span>
                        <span>·</span>
                        <span className={category.is_active ? 'text-emerald-600' : 'text-amber-600'}>
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0 || saving}
                      title="Mover para cima"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 disabled:opacity-30"
                    >
                      ↑
                    </button>

                    <button
                      onClick={() => moveCategory(index, 1)}
                      disabled={index === categories.length - 1 || saving}
                      title="Mover para baixo"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:bg-slate-100 disabled:opacity-30"
                    >
                      ↓
                    </button>

                    <button
                      onClick={() => toggleCategory(category)}
                      disabled={saving}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                        category.is_active
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {category.is_active ? 'Desativar' : 'Ativar'}
                    </button>

                    <button
                      onClick={() => deleteCategory(category)}
                      disabled={saving}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Painel do restaurante
        </footer>
      </main>
    </div>
  )
}
