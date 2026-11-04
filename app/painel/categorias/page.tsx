'use client'

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

    if (!name) {
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
    }

    await loadData()
  }

  const availableGlobalCategories = globalCategories.filter(
    globalCategory =>
      !categories.some(
        category => category.global_category_id === globalCategory.id
      )
  )

  if (loading) {
    return <div className="dashboard-content">Carregando categorias...</div>
  }

  return (
    <main className="dashboard-content">
      <div style={{ marginBottom: 25 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Categorias</h1>
        <p style={{ color: '#777' }}>
          Organize as categorias dos produtos do seu restaurante.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#ffe8e8',
          color: '#b42318',
          padding: 14,
          borderRadius: 8,
          marginBottom: 16
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
          marginBottom: 16
        }}>
          {message}
        </div>
      )}

      <section className="dashboard-card" style={{ marginBottom: 22 }}>
        <h2>Adicionar categoria do catálogo</h2>

        <p style={{ color: '#777', margin: '10px 0 16px' }}>
          Escolha uma categoria pronta do MenuFlow.
        </p>

        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap'
        }}>
          <select
            value={selectedGlobalId}
            onChange={event => setSelectedGlobalId(event.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8
            }}
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
            style={buttonStyle}
          >
            Adicionar
          </button>
        </div>

        {availableGlobalCategories.length === 0 && (
          <p style={{ color: '#777', marginTop: 12 }}>
            Todas as categorias disponíveis já foram adicionadas.
          </p>
        )}
      </section>

      <section className="dashboard-card" style={{ marginBottom: 22 }}>
        <h2>Criar categoria personalizada</h2>

        <p style={{ color: '#777', margin: '10px 0 16px' }}>
          Crie uma categoria exclusiva para seu restaurante.
        </p>

        <div style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder="Ex.: Especiais da casa"
            value={customName}
            onChange={event => setCustomName(event.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8
            }}
          />

          <button
            onClick={addCustomCategory}
            disabled={saving || !customName.trim()}
            style={buttonStyle}
          >
            Criar categoria
          </button>
        </div>
      </section>

      <section className="dashboard-card">
        <h2>Minhas categorias ({categories.length})</h2>

        <p style={{ color: '#777', margin: '10px 0 20px' }}>
          Use as setas para organizar a ordem em que elas aparecem.
        </p>

        {categories.length === 0 ? (
          <p style={{ color: '#777' }}>
            Você ainda não adicionou nenhuma categoria.
          </p>
        ) : (
          <div>
            {categories.map((category, index) => (
              <div
                key={category.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  padding: '15px 0',
                  borderBottom: '1px solid #eee'
                }}
              >
                <div style={{ flex: 1, minWidth: 150 }}>
                  <strong>{category.name}</strong>

                  <div style={{
                    fontSize: 12,
                    color: '#888',
                    marginTop: 5
                  }}>
                    {category.global_category_id
                      ? 'Categoria do catálogo MenuFlow'
                      : 'Categoria personalizada'}
                    {' · '}
                    {category.is_active ? 'Ativa' : 'Inativa'}
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: 7,
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    style={smallButtonStyle}
                    title="Mover para cima"
                  >
                    ↑
                  </button>

                  <button
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === categories.length - 1}
                    style={smallButtonStyle}
                    title="Mover para baixo"
                  >
                    ↓
                  </button>

                  <button
                    onClick={() => toggleCategory(category)}
                    style={{
                      ...smallButtonStyle,
                      color: category.is_active ? '#b45309' : '#18763b'
                    }}
                  >
                    {category.is_active ? 'Desativar' : 'Ativar'}
                  </button>

                  <button
                    onClick={() => deleteCategory(category)}
                    style={{
                      ...smallButtonStyle,
                      color: '#c62828'
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const buttonStyle = {
  background: '#f07835',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 600,
}

const smallButtonStyle = {
  background: '#f5f5f5',
  color: '#444',
  border: '1px solid #ddd',
  borderRadius: 7,
  padding: '8px 11px',
  cursor: 'pointer',
}