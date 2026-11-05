'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

type Expense = {
  id: string
  restaurant_id: string
  description: string
  category: string
  amount: number
  expense_date: string
  notes: string | null
  created_at: string
}

type PaidOrder = {
  payment_amount: number | null
  paid_at: string | null
}

const menuItems = [
  { title: 'Visão geral', href: '/painel', icon: '▦' },
  { title: 'Produtos', href: '/painel/produtos', icon: '🍕' },
  { title: 'Categorias', href: '/painel/categorias', icon: '▤' },
  { title: 'Pedidos', href: '/painel/pedidos', icon: '🧾' },
  { title: 'Mesas', href: '/painel/mesas', icon: '🪑' },
  { title: 'Financeiro', href: '/painel/financeiro', icon: '💰' },
  { title: 'Loja', href: '/painel/loja', icon: '🏪' },
]

const categories = [
  { value: 'rent', label: 'Aluguel' },
  { value: 'energy', label: 'Energia' },
  { value: 'water', label: 'Água' },
  { value: 'employees', label: 'Funcionários' },
  { value: 'suppliers', label: 'Fornecedores' },
  { value: 'packaging', label: 'Embalagens' },
  { value: 'internet', label: 'Internet' },
  { value: 'other', label: 'Outros' },
]

export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([])
  const [restaurantId, setRestaurantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [amount, setAmount] = useState('')
 const [expenseDate, setExpenseDate] = useState('')

useEffect(() => {
  setExpenseDate(new Date().toLocaleDateString('en-CA'))
}, [])
  const [notes, setNotes] = useState('')

  async function loadExpenses() {
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError || !authData.user) {
        setError('Faça login para acessar o financeiro.')
        return
      }

      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('restaurant_id')
        .eq('user_id', authData.user.id)
        .limit(1)
        .single()

      if (membershipError || !membership) {
        setError('Não foi possível encontrar seu restaurante.')
        return
      }

      setRestaurantId(membership.restaurant_id)

      const { data: expensesData, error: expensesError } = await supabase
        .from('restaurant_expenses')
        .select('*')
        .eq('restaurant_id', membership.restaurant_id)
        .order('expense_date', { ascending: false })

      if (expensesError) {
        setError('Erro ao carregar despesas: ' + expensesError.message)
        return
      }

      const { data: paidData, error: paidError } = await supabase
        .from('orders')
        .select('payment_amount, paid_at')
        .eq('restaurant_id', membership.restaurant_id)
        .eq('payment_status', 'paid')

      if (paidError) {
        setError('Erro ao carregar faturamento: ' + paidError.message)
        return
      }

      setExpenses((expensesData || []) as Expense[])
      setPaidOrders((paidData || []) as PaidOrder[])
    } catch (err) {
      console.error('Erro no financeiro:', err)
      setError('Ocorreu um erro ao carregar o financeiro.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExpenses()
  }, [])

  async function addExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (!restaurantId) {
      setError('Restaurante não identificado.')
      return
    }

    const numericAmount = Number(amount.replace(',', '.'))

    if (!description.trim()) {
      setError('Informe a descrição da despesa.')
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Informe um valor válido.')
      return
    }

    setSaving(true)

    try {
      const { error: insertError } = await supabase
        .from('restaurant_expenses')
        .insert({
          restaurant_id: restaurantId,
          description: description.trim(),
          category,
          amount: numericAmount,
          expense_date: expenseDate,
          notes: notes.trim() || null,
        })

      if (insertError) {
        setError('Não foi possível cadastrar: ' + insertError.message)
        return
      }

      setDescription('')
      setCategory('other')
      setAmount('')
      setNotes('')
      setExpenseDate(new Date().toLocaleDateString('en-CA'))

      setSuccess('Despesa cadastrada com sucesso!')
      await loadExpenses()
    } catch (err) {
      console.error('Erro ao cadastrar despesa:', err)
      setError('Ocorreu um erro ao cadastrar a despesa.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteExpense(id: string) {
    const confirmed = window.confirm(
      'Deseja realmente excluir esta despesa?'
    )

    if (!confirmed) return

    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase
      .from('restaurant_expenses')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurantId)

    if (deleteError) {
      setError('Não foi possível excluir: ' + deleteError.message)
      return
    }

    setSuccess('Despesa excluída com sucesso!')
    await loadExpenses()
  }

  function formatPrice(value: number) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function formatDate(value: string) {
    return new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')
  }

  function getCategoryLabel(value: string) {
    return categories.find(item => item.value === value)?.label || 'Outros'
  }

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  )

  const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7)

  const monthlyExpenses = expenses
    .filter(expense => expense.expense_date.startsWith(currentMonth))
    .reduce((total, expense) => total + Number(expense.amount || 0), 0)

  const totalRevenue = paidOrders.reduce(
    (total, order) => total + Number(order.payment_amount || 0),
    0
  )

  const monthlyRevenue = paidOrders
    .filter(order => order.paid_at?.slice(0, 7) === currentMonth)
    .reduce(
      (total, order) => total + Number(order.payment_amount || 0),
      0
    )

  const monthlyResult = monthlyRevenue - monthlyExpenses

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800 md:flex">

      <aside className="w-full bg-[#111827] p-5 text-white md:min-h-screen md:w-64 md:shrink-0">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold">
            Menu<span className="text-blue-400">Flow</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Painel do restaurante
          </p>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Gerenciamento
        </p>

        <nav className="space-y-1">
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                item.href === '/painel/financeiro'
                  ? 'bg-blue-600 font-semibold text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">

        <header className="mb-8">
          <p className="text-sm text-slate-500">
            MenuFlow / Gerenciamento
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">
            Financeiro
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe os recebimentos e as despesas do seu restaurante.
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Faturamento recebido
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {formatPrice(totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Somente pagamentos confirmados
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Faturamento deste mês
            </p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">
              {formatPrice(monthlyRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Pagamentos confirmados no mês atual
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total de despesas
            </p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">
              {formatPrice(totalExpenses)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Todo o histórico cadastrado
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Despesas deste mês
            </p>
            <p className="mt-2 text-2xl font-extrabold text-blue-700">
              {formatPrice(monthlyExpenses)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Gastos registrados no mês atual
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Resultado estimado do mês
            </p>
            <p className={`mt-2 text-2xl font-extrabold ${
              monthlyResult >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {formatPrice(monthlyResult)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Recebimentos menos despesas cadastradas
            </p>
          </div>

        </section>

        <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">

          <h3 className="text-lg font-bold text-slate-900">
            + Cadastrar nova despesa
          </h3>

          <p className="mb-5 mt-1 text-sm text-slate-500">
            Registre os gastos do seu restaurante.
          </p>

          <form onSubmit={addExpense} className="grid gap-4 md:grid-cols-2">

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold">
                Descrição
              </label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex.: Conta de energia"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Categoria
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              >
                {categories.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Valor (R$)
              </label>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Ex.: 350,00"
                inputMode="decimal"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Data da despesa
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={e => setExpenseDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">
                Observações
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || !restaurantId}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 md:w-auto"
              >
                {saving ? 'Salvando...' : 'Cadastrar despesa'}
              </button>
            </div>

          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">

          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">
              Histórico de despesas
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Consulte e gerencie os gastos cadastrados.
            </p>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Carregando despesas...
            </p>
          ) : expenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center">
              <p className="text-3xl">💰</p>
              <p className="mt-3 font-semibold">
                Nenhuma despesa cadastrada
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre sua primeira despesa acima.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <th className="px-3 py-3">Descrição</th>
                    <th className="px-3 py-3">Categoria</th>
                    <th className="px-3 py-3">Data</th>
                    <th className="px-3 py-3">Valor</th>
                    <th className="px-3 py-3">Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {expenses.map(expense => (
                    <tr
                      key={expense.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-800">
                          {expense.description}
                        </p>
                        {expense.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            {expense.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {getCategoryLabel(expense.category)}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {formatDate(expense.expense_date)}
                      </td>

                      <td className="px-3 py-4 font-bold text-slate-900">
                        {formatPrice(expense.amount)}
                      </td>

                      <td className="px-3 py-4">
                        <button
                          type="button"
                          onClick={() => deleteExpense(expense.id)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          MenuFlow · Financeiro do restaurante
        </footer>

      </main>
    </div>
  )
}
