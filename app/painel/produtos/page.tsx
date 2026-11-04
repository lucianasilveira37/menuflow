
'use client'

import { useEffect, useState, type FormEvent } from 'react'
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
    loadData()
  }, [])

  useEffect(() => {
    if (!previewUrl) return

    return () => {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const filteredProducts = products.filter((product) => {
    if (filterCategory === 'all') return true

    if (filterCategory === 'none') {
      return !product.category_id
    }

    return product.category_id === filterCategory
  })

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

    const { data: membership, error: membershipError } = await supabase
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
      setError('Erro ao carregar produtos: ' + productsResult.error.message)
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
      (category) => category.id === categoryId
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

        setProducts((current) => [data as Product, ...current])
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

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
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
      setProducts((current) =>
        current.map((item) =>
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

  if (loading) {
    return (
      <main className="dashboard-content">
        <p>Carregando produtos...</p>
      </main>
    )
  }

  return (
    <main className="dashboard-content">
      <div className="page-header">
        <div>
          <h1>Produtos</h1>
          <p>Cadastre e gerencie os produtos do seu restaurante.</p>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      <section className="dashboard-card">
        <h2>{editingId ? 'Editar produto' : 'Cadastrar produto'}</h2>

        <form onSubmit={handleSubmit} className="product-form">
          <div className="form-group">
            <label htmlFor="product-name">Nome do produto</label>
            <input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Crepe de queijo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-description">Descrição</label>
            <textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descreva seu produto..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-price">Preço (R$)</label>
            <input
              id="product-price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Ex: 15,00"
              inputMode="decimal"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-category">Categoria</label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Sem categoria</option>

              {categories
                .filter(
                  (category) =>
                    category.is_active || category.id === categoryId
                )
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {!category.is_active ? ' (Inativa)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="product-image">Foto do produto</label>
            <input
              id="product-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleImageChange(event.target.files?.[0] || null)
              }
            />
            <small>Formatos: JPG, PNG ou WebP. Limite: 5 MB.</small>
          </div>

          {(previewUrl || currentImageUrl) && (
            <div className="image-preview">
              <img
                src={previewUrl || currentImageUrl}
                alt="Prévia do produto"
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="button-primary"
              disabled={saving}
            >
              {saving
                ? 'Salvando...'
                : editingId
                  ? 'Salvar alterações'
                  : 'Cadastrar produto'}
            </button>

            {editingId && (
              <button
                type="button"
                className="button-secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="dashboard-card products-section">
        <div className="section-heading">
          <h2>Produtos cadastrados</h2>
          <span>{filteredProducts.length} produto(s)</span>
        </div>

        <div className="form-group">
          <label htmlFor="filter-category">
            Filtrar por categoria
          </label>

          <select
            id="filter-category"
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
          >
            <option value="all">Todas as categorias</option>
            <option value="none">Sem categoria</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.is_active ? ' (Inativa)' : ''}
              </option>
            ))}
          </select>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="empty-state">
            {products.length === 0
              ? 'Nenhum produto cadastrado ainda.'
              : 'Nenhum produto encontrado nesta categoria.'}
          </p>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                {product.image_url ? (
                  <img
                    className="product-card-image"
                    src={product.image_url}
                    alt={product.name}
                  />
                ) : (
                  <div className="product-card-placeholder">
                    Sem imagem
                  </div>
                )}

                <div className="product-card-content">
                  <div className="product-card-top">
                    <span
                      className={
                        product.is_available
                          ? 'status-badge status-active'
                          : 'status-badge status-inactive'
                      }
                    >
                      {product.is_available ? 'Disponível' : 'Desativado'}
                    </span>
                  </div>

                  <h3>{product.name}</h3>

                  <p className="product-description">
                    {product.description || 'Sem descrição'}
                  </p>

                  <strong className="product-price">
                    {Number(product.price).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>

                  <div className="product-card-actions">
                    <button
                      type="button"
                      className={
                        product.is_available
                          ? 'button-disable'
                          : 'button-enable'
                      }
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
                          ? 'Desativar'
                          : 'Ativar'}
                    </button>

                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => editProduct(product)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="button-danger"
                      onClick={() => deleteProduct(product)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id
                        ? 'Excluindo...'
                        : 'Excluir'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
