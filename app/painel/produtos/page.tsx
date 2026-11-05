
'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Product = {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  position: number
}

type Category = {
  id: string
  name: string
  is_active: boolean
}

const menuItems = [
  { title: 'Visão geral', href: '/painel', icon: '▦' },
  { title: 'Produtos', href: '/painel/produtos', icon: '🍕' },
  { title: 'Categorias', href: '/painel/categorias', icon: '▤' },
  { title: 'Pedidos', href: '/painel/pedidos', icon: '🧾' },
  { title: 'Mesas', href: '/painel/mesas', icon: '🪑' },
  { title: 'Loja', href: '/painel/loja', icon: '🏪' },
]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const primaryButton =
  'rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'

const secondaryButton =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50'

export default function ProductsPage() {
  const [restaurantId, setRestaurantId] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filterCategory, setFilterCategory] = useState('all')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [currentImageUrl, setCurrentImageUrl] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingAvailabilityId, setUpdatingAvailabilityId] =
    useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!previewUrl) return

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const filteredProducts = products.filter(product => {
    if (filterCategory === 'all') return true

    if (filterCategory === 'none') {
      return !product.category_id
    }

    return product.category_id === filterCategory
  })

  const availableCount = products.filter(
    product => product.is_available
  ).length

  const unavailableCount = products.filter(
    product => !product.is_available
  ).length

  async function loadData() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Faça login novamente para acessar os produtos.')
      setLoading(false)
      return
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from('memberships')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle()

    if (membershipError || !membership) {
      setError('Não encontramos um restaurante vinculado à sua conta.')
      setLoading(false)
      return
    }

    setRestaurantId(membership.restaurant_id)

    const [productsResult, categoriesResult] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', membership.restaurant_id)
        .order('created_at', { ascending: false }),

      supabase
        .from('categories')
        .select('id, name, is_active')
        .eq('restaurant_id', membership.restaurant_id)
        .order('position', { ascending: true }),
    ])

    if (productsResult.error) {
      setError(
        'Erro ao carregar produtos: ' + productsResult.error.message
      )
    } else {
      setProducts((productsResult.data || []) as Product[])
    }

    if (categoriesResult.error) {
      setError(
        'Erro ao carregar categorias: ' + categoriesResult.error.message
      )
    } else {
      setCategories((categoriesResult.data || []) as Category[])
    }

    setLoading(false)
  }

  function handleImageChange(file: File | null) {
    if (file && file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5 MB.')
      return
    }

    setError('')
    setImageFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : '')
  }

  function resetForm() {
    setName('')
    setDescription('')
    setPrice('')
    setCategoryId('')
    setImageFile(null)
    setPreviewUrl('')
    setCurrentImageUrl('')
    setEditingId(null)

    const input = document.getElementById(
      'product-image'
    ) as HTMLInputElement | null

    if (input) input.value = ''
  }

  function getImagePath(url: string) {
    const marker = '/storage/v1/object/public/product-images/'
    const index = url.indexOf(marker)

    if (index === -1) return null

    return decodeURIComponent(url.substring(index + marker.length))
  }

  async function uploadImage(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const filePath = `${restaurantId}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  async function removeImage(url: string | null) {
    if (!url) return

    const path = getImagePath(url)

    if (!path) return

    await supabase.storage.from('product-images').remove([path])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!name.trim()) {
      setError('Informe o nome do produto.')
      return
    }

    const numericPrice = Number(price.replace(',', '.'))

    if (!price || !Number.isFinite(numericPrice) || numericPrice < 0) {
      setError('Informe um preço válido.')
      return
    }

    const selectedCategory = categories.find(
      category => category.id === categoryId
    )

    if (
      categoryId &&
      (!selectedCategory ||
        (!selectedCategory.is_active && !editingId))
    ) {
      setError('Selecione uma categoria ativa.')
      return
    }

    setSaving(true)

    let newImageUrl = currentImageUrl

    try {
      if (imageFile) {
        newImageUrl = await uploadImage(imageFile)
      }

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: numericPrice,
        category_id: categoryId || null,
        image_url: newImageUrl || null,
        restaurant_id: restaurantId,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId)
          .eq('restaurant_id', restaurantId)

        if (updateError) {
          if (imageFile && newImageUrl !== currentImageUrl) {
            await removeImage(newImageUrl)
          }

          throw new Error(updateError.message)
        }

        if (imageFile && currentImageUrl) {
          await removeImage(currentImageUrl)
        }

        setSuccess('Produto atualizado com sucesso!')
      } else {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({
            ...productData,
            is_available: true,
          })
          .select()
          .single()

        if (insertError) {
          if (imageFile && newImageUrl) {
            await removeImage(newImageUrl)
          }

          throw new Error(insertError.message)
        }

        setProducts(current => [data as Product, ...current])
        setSuccess('Produto cadastrado com sucesso!')
      }

      if (editingId) {
        await loadProductsOnly()
      }

      resetForm()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao salvar o produto.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function loadProductsOnly() {
    const { data, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (productsError) {
      setError('Erro ao atualizar a lista: ' + productsError.message)
      return
    }

    setProducts((data || []) as Product[])
  }

  function editProduct(product: Product) {
    setError('')
    setSuccess('')

    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(String(product.price).replace('.', ','))
    setCategoryId(product.category_id || '')
    setCurrentImageUrl(product.image_url || '')
    setImageFile(null)
    setPreviewUrl('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Deseja realmente excluir "${product.name}"?`
    )

    if (!confirmed) return

    setDeletingId(product.id)
    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
      .eq('restaurant_id', restaurantId)

    if (deleteError) {
      setError('Não foi possível excluir: ' + deleteError.message)
      setDeletingId(null)
      return
    }

    if (product.image_url) {
      await removeImage(product.image_url)
    }

    setProducts(current =>
      current.filter(item => item.id !== product.id)
    )

    if (editingId === product.id) {
      resetForm()
    }

    setSuccess('Produto excluído com sucesso!')
    setDeletingId(null)
  }

  async function toggleProductAvailability(product: Product) {
    setUpdatingAvailabilityId(product.id)
    setError('')
    setSuccess('')

    const newAvailability = !product.is_available

    const { error: updateError } = await supabase
      .from('products')
      .update({ is_available: newAvailability })
      .eq('id', product.id)
      .eq('restaurant_id', restaurantId)

    if (updateError) {
      setError(
        'Não foi possível alterar a disponibilidade: ' +
          updateError.message
      )
    } else {
      setProducts(current =>
        current.map(item =>
          item.id === product.id
            ? { ...item, is_available: newAvailability }
            : item
        )
      )

      setSuccess(
        newAvailability
          ? 'Produto ativado com sucesso!'
          : 'Produto desativado com sucesso!'
      )
    }

    setUpdatingAvailabilityId(null)
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return 'Sem categoria'

    return categories.find(
      category => category.id === categoryId
    )?.name || 'Categoria não encontrada'
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 md:flex">

      {/* MENU LATERAL */}
      <aside className="w-full bg-[#111827] p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Menu<span className="text-blue-400">Flow</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Painel do restaurante
          </p>
        </div>

        <div className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gerenciamento
        </div>

        <nav className="space-y-1">
          {menuItems.map(item => {
            const active = item.href === '/painel/produtos'

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active
                    ? 'bg-blue-600 font-semibold text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.title}
              </Link>
            )
          })}
        </nav>

        <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="mb-2 text-sm font-semibold text-white">
            Gerenciamento de produtos
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Organize seu cardápio, atualize preços e controle a disponibilidade.
          </p>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <main className="min-w-0 flex-1 p-4 md:p-7">

        {/* CABEÇALHO */}
        <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="mb-2 text-sm text-slate-500">
              MenuFlow <span className="mx-1">/</span> Gerenciamento
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Produtos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cadastre e gerencie os produtos do seu restaurante.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className={primaryButton}
          >
            {loading ? 'Carregando...' : '↻ Atualizar produtos'}
          </button>
        </div>

        {/* MENSAGENS */}
        {error && (
          <div
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            role="status"
          >
            {success}
          </div>
        )}

        {/* INDICADORES */}
        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Total de produtos
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-lg">
                🍕
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {products.length}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">
                Disponíveis
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-lg">
                ✅
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-800">
              {availableCount}
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-700">
                Desativados
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/70 text-lg">
                ⏸️
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-800">
              {unavailableCount}
            </p>
          </div>
        </div>

        {/* FORMULÁRIO */}
        <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Editar produto' : 'Cadastrar produto'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Preencha as informações do produto.
              </p>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
              {editingId ? '✏️' : '➕'}
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              <div>
                <label
                  htmlFor="product-name"
                  className="text-xs font-semibold text-slate-700"
                >
                  Nome do produto *
                </label>
                <input
                  id="product-name"
                  className={inputClass}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="Ex: Pizza de queijo"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="product-price"
                  className="text-xs font-semibold text-slate-700"
                >
                  Preço (R$) *
                </label>
                <input
                  id="product-price"
                  className={inputClass}
                  value={price}
                  onChange={event => setPrice(event.target.value)}
                  placeholder="Ex: 25,00"
                  inputMode="decimal"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="product-category"
                  className="text-xs font-semibold text-slate-700"
                >
                  Categoria
                </label>
                <select
                  id="product-category"
                  className={inputClass}
                  value={categoryId}
                  onChange={event => setCategoryId(event.target.value)}
                >
                  <option value="">Sem categoria</option>

                  {categories
                    .filter(
                      category =>
                        category.is_active ||
                        category.id === categoryId
                    )
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                        {!category.is_active ? ' (Inativa)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label
                  htmlFor="product-description"
                  className="text-xs font-semibold text-slate-700"
                >
                  Descrição
                </label>
                <textarea
                  id="product-description"
                  className={`${inputClass} resize-y`}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  placeholder="Descreva os ingredientes ou detalhes do produto..."
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 xl:col-span-2">
                <label
                  htmlFor="product-image"
                  className="text-xs font-semibold text-slate-700"
                >
                  Foto do produto
                </label>
                <input
                  id="product-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event =>
                    handleImageChange(event.target.files?.[0] || null)
                  }
                  className="mt-2 block w-full rounded-xl border border-slate-200 bg-white text-xs text-slate-600 file:mr-3 file:rounded-l-xl file:border-0 file:bg-blue-50 file:px-4 file:py-3 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  JPG, PNG ou WebP. Tamanho máximo de 5 MB.
                </p>
              </div>

              {(previewUrl || currentImageUrl) && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img
                    src={previewUrl || currentImageUrl}
                    alt="Prévia do produto"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">
                      Prévia da imagem
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Imagem selecionada para o produto.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saving || loading}
                className={primaryButton}
              >
                {saving
                  ? 'Salvando...'
                  : editingId
                    ? 'Salvar alterações'
                    : '+ Cadastrar produto'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LISTA DE PRODUTOS */}
        <section>
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Produtos cadastrados
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {filteredProducts.length} produto(s) encontrado(s)
              </p>
            </div>

            <div className="w-full sm:max-w-xs">
              <select
                id="filter-category"
                value={filterCategory}
                onChange={event => setFilterCategory(event.target.value)}
                className={inputClass}
                aria-label="Filtrar produtos por categoria"
              >
                <option value="all">Todas as categorias</option>
                <option value="none">Sem categoria</option>

                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {!category.is_active ? ' (Inativa)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
              Carregando produtos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <div className="mb-3 text-4xl">🍕</div>
              <h4 className="font-semibold text-slate-800">
                {products.length === 0
                  ? 'Nenhum produto cadastrado'
                  : 'Nenhum produto encontrado'}
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                {products.length === 0
                  ? 'Cadastre seu primeiro produto usando o formulário acima.'
                  : 'Não existem produtos nesta categoria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map(product => (
                <article
                  key={product.id}
                  className={`overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    product.is_available
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-red-100 bg-red-50'
                  }`}
                >
                  {/* IMAGEM */}
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className={`h-full w-full object-cover transition duration-300 hover:scale-105 ${
                          !product.is_available ? 'grayscale-[35%]' : ''
                        }`}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                        <span className="text-4xl">🍽️</span>
                        <span className="text-xs">Sem imagem</span>
                      </div>
                    )}

                    <span
                      className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[10px] font-bold shadow-sm ${
                        product.is_available
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.is_available
                        ? '● Disponível'
                        : '● Desativado'}
                    </span>
                  </div>

                  {/* INFORMAÇÕES */}
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h4 className="min-w-0 break-words text-base font-bold text-slate-900">
                        {product.name}
                      </h4>
                    </div>

                    <span className="inline-flex max-w-full rounded-lg bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                      {getCategoryName(product.category_id)}
                    </span>

                    <p className="mt-3 min-h-10 break-words text-xs leading-relaxed text-slate-600">
                      {product.description || 'Sem descrição cadastrada.'}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
                      <span className="text-[11px] font-medium text-slate-500">
                        Preço
                      </span>
                      <strong className="text-xl font-extrabold text-slate-900">
                        {Number(product.price).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </strong>
                    </div>

                    {/* AÇÕES */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={`rounded-lg px-3 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                          product.is_available
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        onClick={() =>
                          toggleProductAvailability(product)
                        }
                        disabled={
                          updatingAvailabilityId === product.id
                        }
                      >
                        {updatingAvailabilityId === product.id
                          ? 'Aguarde...'
                          : product.is_available
                            ? '⏸ Desativar'
                            : '✓ Ativar'}
                      </button>

                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => editProduct(product)}
                      >
                        ✏️ Editar
                      </button>

                      <button
                        type="button"
                        className="col-span-2 rounded-lg border border-red-200 bg-white/70 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        onClick={() => void deleteProduct(product)}
                        disabled={deletingId === product.id}
                      >
                        {deletingId === product.id
                          ? 'Excluindo...'
                          : '🗑 Excluir produto'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
