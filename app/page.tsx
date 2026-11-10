
'use client'

import Link from 'next/link'

const recursos = [
  {
    icon: '📱',
    titulo: 'Cardápio digital',
    descricao:
      'Apresente seus produtos com fotos, descrições, categorias e preços em uma página personalizada.',
  },
  {
    icon: '🛵',
    titulo: 'Delivery e retirada',
    descricao:
      'Receba pedidos para entrega ou retirada, com informações do cliente e forma de pagamento.',
  },
  {
    icon: '📋',
    titulo: 'Pedidos por QR Code',
    descricao:
      'Permita que seus clientes acessem o cardápio e façam pedidos diretamente pela mesa.',
  },
  {
    icon: '🔔',
    titulo: 'Gestão de pedidos',
    descricao:
      'Acompanhe os pedidos recebidos e atualize o andamento de cada atendimento.',
  },
  {
    icon: '🪑',
    titulo: 'Mesas e comandas',
    descricao:
      'Organize suas mesas, disponibilize QR Codes e acompanhe o estado das comandas.',
  },
  {
    icon: '📊',
    titulo: 'Gestão financeira',
    descricao:
      'Acompanhe pagamentos confirmados, cadastre despesas e visualize resultados estimados.',
  },
]

const etapas = [
  {
    numero: '01',
    titulo: 'Cadastre seu restaurante',
    descricao:
      'Crie sua conta e configure as informações do seu estabelecimento.',
    icon: '🏪',
  },
  {
    numero: '02',
    titulo: 'Monte seu cardápio',
    descricao:
      'Cadastre categorias, produtos, fotos, preços e informações de atendimento.',
    icon: '🍽️',
  },
  {
    numero: '03',
    titulo: 'Comece a receber pedidos',
    descricao:
      'Compartilhe seu cardápio e organize os pedidos pelo painel de gestão.',
    icon: '🚀',
  },
]

export default function Home() {
  return (
   <main className="min-h-screen bg-white text-slate-800">

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-blue-950 text-2xl font-black text-white shadow-lg shadow-blue-900/20">
              M
            </div>

            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              Menu<span className="text-orange-500">Flow</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#inicio" className="transition hover:text-orange-500">
              Início
            </a>
            <a href="#funcionalidades" className="transition hover:text-orange-500">
              Funcionalidades
            </a>
            <a href="#como-funciona" className="transition hover:text-orange-500">
              Como funciona
            </a>
            <a href="#restaurantes" className="transition hover:text-orange-500">
              Para restaurantes
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-700 hover:text-blue-700"
            >
              Entrar
            </Link>

            <Link
              href="/login?cadastro=true"
              className="hidden rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600 sm:block"
            >
              Cadastrar restaurante
            </Link>
          </div>
        </div>
      </header>

      {/* DESTAQUE PRINCIPAL */}
      <section
        id="inicio"
        className="relative bg-[#101b35] text-white"
      >
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:grid-cols-2 md:py-28">

          <div>
            <span className="inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-200">
              Tecnologia para restaurantes
            </span>

            <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Seu restaurante mais organizado.
              <span className="mt-2 block text-orange-400">
                Seus pedidos em outro nível.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Com o MenuFlow, você organiza seu cardápio digital,
              recebe pedidos, gerencia mesas e acompanha a operação
              do seu restaurante em uma única plataforma.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/login?cadastro=true"
                className="rounded-xl bg-orange-500 px-8 py-4 text-center font-bold text-white shadow-xl shadow-orange-950/20 transition hover:-translate-y-1 hover:bg-orange-600"
              >
                Quero cadastrar meu restaurante →
              </Link>

              <a
                href="#funcionalidades"
                className="rounded-xl border border-white/20 px-8 py-4 text-center font-bold text-white transition hover:bg-white/10"
              >
                Conhecer a plataforma
              </a>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              Uma plataforma para organizar diferentes formas de atendimento.
            </p>
          </div>

          {/* ILUSTRAÇÃO DA PLATAFORMA */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl sm:p-7">

              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    MenuFlow
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    Painel do restaurante
                  </h2>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-900 text-lg font-black text-white">
                  M
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Gestão de pedidos
                  </p>
                  <p className="mt-2 text-2xl font-black text-blue-900">
                    Pedidos
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Acompanhamento
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Atendimento
                  </p>
                  <p className="mt-2 text-2xl font-black text-orange-700">
                    Mesas
                  </p>
                  <p className="mt-1 text-xs text-orange-700">
                    QR Code e comandas
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ['🍔', 'Produtos e categorias', 'Cardápio digital'],
                  ['🛵', 'Delivery e retirada', 'Pedidos online'],
                  ['📊', 'Financeiro', 'Recebimentos e despesas'],
                ].map((item) => (
                  <div
                    key={item[1]}
                    className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      {item[0]}
                    </div>

                    <div>
                      <p className="font-bold text-slate-800">
                        {item[1]}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item[2]}
                      </p>
                    </div>

                    <span className="ml-auto text-xl text-green-600">✓</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#101b35] p-5 text-white">
                <p className="text-sm text-slate-300">
                  MenuFlow
                </p>
                <p className="mt-1 text-xl font-extrabold">
                  Tudo conectado em um só lugar.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-3">

          {[
            ['📱', 'Cardápio digital', 'Apresente seus produtos online.'],
            ['🛵', 'Pedidos organizados', 'Acompanhe diferentes modalidades.'],
            ['🪑', 'Gestão de mesas', 'Organize o atendimento presencial.'],
          ].map((item) => (
            <div key={item[1]} className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                {item[0]}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">
                  {item[1]}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {item[2]}
                </p>
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section
        id="funcionalidades"
        className="bg-[#f8fafc] px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Funcionalidades
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Tudo que seu restaurante precisa para se organizar
            </h2>

            <p className="mt-5 leading-7 text-slate-500">
              Recursos para facilitar o atendimento e ajudar
              na administração do seu estabelecimento.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {recursos.map((item) => (
              <div
                key={item.titulo}
                className="group rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl transition group-hover:bg-orange-50">
                  {item.icon}
                </div>

                <h3 className="mt-6 text-xl font-extrabold text-slate-900">
                  {item.titulo}
                </h3>

                <p className="mt-3 leading-7 text-slate-500">
                  {item.descricao}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section
        id="como-funciona"
        className="bg-white px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Simples para começar
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Como funciona o MenuFlow?
            </h2>

            <p className="mt-5 text-slate-500">
              Organize seu estabelecimento seguindo três etapas.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">

            {etapas.map((item) => (
              <div
                key={item.numero}
                className="relative rounded-3xl border border-slate-100 bg-slate-50 p-8 text-center"
              >
                <span className="absolute right-6 top-5 text-4xl font-black text-slate-200">
                  {item.numero}
                </span>

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-900 text-3xl text-white shadow-lg shadow-blue-900/20">
                  {item.icon}
                </div>

                <h3 className="mt-7 text-xl font-extrabold text-slate-900">
                  {item.titulo}
                </h3>

                <p className="mt-3 leading-7 text-slate-500">
                  {item.descricao}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* PARA RESTAURANTES */}
      <section
        id="restaurantes"
        className="bg-[#101b35] px-5 py-24 text-white"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">

          <div>
            <span className="font-bold uppercase tracking-widest text-orange-400">
              Seu negócio conectado
            </span>

            <h2 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">
              Mais controle para administrar.
              <span className="text-orange-400">
                {' '}Mais praticidade para atender.
              </span>
            </h2>

            <p className="mt-6 leading-8 text-slate-300">
              O MenuFlow reúne ferramentas para organizar
              produtos, categorias, pedidos, mesas, horários
              de funcionamento e informações financeiras.
            </p>

            <p className="mt-4 leading-8 text-slate-300">
              Uma solução pensada para acompanhar a operação
              do restaurante em diferentes formas de atendimento.
            </p>

            <Link
              href="/login?cadastro=true"
              className="mt-9 inline-flex rounded-xl bg-orange-500 px-8 py-4 font-bold text-white shadow-lg transition hover:-translate-y-1 hover:bg-orange-600"
            >
              Conheça e cadastre seu restaurante →
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
            <div className="grid grid-cols-2 gap-4">

              {[
                ['🍽️', 'Produtos'],
                ['📂', 'Categorias'],
                ['🛵', 'Pedidos'],
                ['🪑', 'Mesas'],
                ['💰', 'Financeiro'],
                ['⚙️', 'Minha loja'],
              ].map((item) => (
                <div
                  key={item[1]}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center"
                >
                  <p className="text-3xl">{item[0]}</p>
                  <p className="mt-3 font-bold">{item[1]}</p>
                </div>
              ))}

            </div>
          </div>

        </div>
      </section>

      {/* CHAMADA FINAL */}
      <section className="bg-orange-500 px-5 py-20 text-center text-white">
        <div className="mx-auto max-w-3xl">

          <h2 className="text-3xl font-black sm:text-4xl">
            Seu restaurante pode dar o próximo passo.
          </h2>

          <p className="mt-5 text-lg leading-8 text-white/90">
            Conheça o MenuFlow e descubra uma nova maneira
            de organizar o atendimento do seu estabelecimento.
          </p>

          <Link
            href="/login?cadastro=true"
            className="mt-9 inline-flex rounded-xl bg-[#101b35] px-9 py-4 font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-slate-900"
          >
            Cadastrar meu restaurante
          </Link>

        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-[#0b1429] px-5 py-12 text-white">

        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-10 md:flex-row">

          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-xl font-black text-white">
                M
              </div>

              <span className="text-2xl font-extrabold">
                Menu<span className="text-orange-400">Flow</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              Tecnologia e praticidade para organizar
              a gestão e o atendimento de restaurantes.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Navegação</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <a href="#inicio" className="hover:text-orange-400">Início</a>
              <a href="#funcionalidades" className="hover:text-orange-400">Funcionalidades</a>
              <a href="#como-funciona" className="hover:text-orange-400">Como funciona</a>
              <Link href="/login" className="hover:text-orange-400">Entrar</Link>
              <Link href="/login?cadastro=true" className="hover:text-orange-400">Cadastrar restaurante</Link>
            </div>
          </div>

        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-7 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} MenuFlow. Todos os direitos reservados.
        </div>

      </footer>

      {/* BOTÃO FLUTUANTE DO WHATSAPP */}
      <a
        href="https://wa.me/5588993070295?text=Ol%C3%A1!%20Conheci%20o%20MenuFlow%20pelo%20site%20e%20gostaria%20de%20saber%20mais%20sobre%20a%20plataforma."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale com nossa equipe pelo WhatsApp"
        className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-4 text-white shadow-2xl transition hover:-translate-y-1 hover:bg-[#1ebe5d]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path d="M12.04 2a9.85 9.85 0 0 0-8.48 14.87L2.2 22l5.27-1.38A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.18 8.18 0 0 1-4.17-1.14l-.3-.18-3.13.82.84-3.05-.2-.31A8.16 8.16 0 1 1 12.04 20.1Zm4.48-6.12c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.57.18 1.09.16 1.5.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
        </svg>

        <span className="text-sm font-bold sm:text-base">
          Fale com nossa equipe
        </span>
      </a>


    </main>
  )
}
