
'use client'

import Link from 'next/link'

const menuItems = [
  {
    title: 'Produtos',
    description: 'Cadastre, edite e organize os produtos.',
    href: '/painel/produtos',
    icon: '🍕',
  },
  {
    title: 'Categorias',
    description: 'Organize as categorias do cardápio.',
    href: '/painel/categorias',
    icon: '📂',
  },
  {
    title: 'Pedidos',
    description: 'Acompanhe e gerencie os pedidos.',
    href: '/painel/pedidos',
    icon: '🧾',
  },
  {
    title: 'Mesas',
    description: 'Acompanhe comandas e contas das mesas.',
    href: '/painel/mesas',
    icon: '🪑',
  },
  {
    title: 'Loja',
    description: 'Gerencie as configurações do restaurante.',
    href: '/painel/loja',
    icon: '🏪',
  },
]

export default function DashboardPage() {
  return (
    <main className="dashboard-content">
      <div className="page-header">
        <div>
          <h1>Painel do restaurante</h1>
          <p>
            Bem-vindo! Escolha uma opção para gerenciar seu restaurante.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="dashboard-card dashboard-menu-card"
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              padding: 24,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {item.icon}
            </div>

            <h2 style={{ margin: '0 0 8px' }}>
              {item.title}
            </h2>

            <p style={{ color: '#777', margin: 0 }}>
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
