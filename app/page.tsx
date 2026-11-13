
'use client'

import Link from 'next/link'

const cadastroUrl = '/login?cadastro=true'

const funcionalidades = [
  {
    icon: '📱',
    titulo: 'Cardápio digital',
    descricao:
      'Apresente seus produtos com fotos, descrições, categorias e preços em uma página personalizada para seu restaurante.',
  },
  {
    icon: '🛵',
    titulo: 'Delivery',
    descricao:
      'Receba pedidos para entrega, organize os dados dos clientes e acompanhe o andamento de cada pedido.',
  },
  {
    icon: '🛍️',
    titulo: 'Retirada no local',
    descricao:
      'Ofereça a opção de retirada para seus clientes e organize os pedidos que serão buscados no estabelecimento.',
  },
  {
    icon: '📲',
    titulo: 'Pedidos por QR Code',
    descricao:
      'Permita que os clientes acessem o cardápio pelo celular diretamente na mesa.',
  },
  {
    icon: '🪑',
    titulo: 'Mesas e comandas',
    descricao:
      'Organize as mesas, acompanhe comandas e facilite o atendimento presencial.',
  },
  {
    icon: '🔔',
    titulo: 'Gestão de pedidos',
    descricao:
      'Visualize os pedidos recebidos e acompanhe as etapas do atendimento pelo painel.',
  },
  {
    icon: '🍔',
    titulo: 'Produtos e categorias',
    descricao:
      'Cadastre produtos, organize categorias, atualize informações e controle a disponibilidade dos itens.',
  },
  {
    icon: '📊',
    titulo: 'Gestão financeira',
    descricao:
      'Tenha recursos para acompanhar pagamentos, despesas e informações financeiras do estabelecimento.',
  },
  {
    icon: '⚙️',
    titulo: 'Configurações da loja',
    descricao:
      'Gerencie informações do restaurante, horários de funcionamento e dados de atendimento.',
  },
]

const etapas = [
  {
    numero: '01',
    icon: '📝',
    titulo: 'Faça seu cadastro',
    descricao:
      'Escolha se deseja criar uma conta como cliente ou estabelecimento e informe seus dados.',
  },
  {
    numero: '02',
    icon: '✅',
    titulo: 'Acesse sua conta',
    descricao:
      'Entre no MenuFlow e utilize os recursos disponíveis para o seu tipo de cadastro.',
  },
  {
    numero: '03',
    icon: '🍽️',
    titulo: 'Explore a plataforma',
    descricao:
      'Restaurantes configuram suas lojas. Clientes encontram cardápios e conhecem os produtos.',
  },
  {
    numero: '04',
    icon: '🚀',
    titulo: 'Aproveite o MenuFlow',
    descricao:
      'Gerencie seu estabelecimento ou tenha uma experiência prática ao realizar seus pedidos.',
  },
]

const modalidades = [
  {
    icon: '🛵',
    titulo: 'Delivery',
    descricao:
      'Seus clientes fazem pedidos online para receber no endereço informado.',
    cor: 'bg-orange-50',
  },
  {
    icon: '🛍️',
    titulo: 'Retirada',
    descricao:
      'O cliente faz o pedido e busca diretamente no estabelecimento.',
    cor: 'bg-blue-50',
  },
  {
    icon: '🪑',
    titulo: 'Atendimento na mesa',
    descricao:
      'O cliente acessa o cardápio pelo QR Code e realiza o pedido na mesa.',
    cor: 'bg-purple-50',
  },
]

const vantagensClientes = [
  ['🔎', 'Encontre restaurantes'],
  ['📖', 'Consulte cardápios digitais'],
  ['🍔', 'Conheça produtos e opções'],
  ['🛍️', 'Faça seus pedidos'],
  ['📱', 'Acompanhe seus pedidos'],
]

const perguntas = [
  {
    pergunta: 'O que é o MenuFlow?',
    resposta:
      'O MenuFlow é uma plataforma que conecta restaurantes e clientes. Reúne cardápio digital, pedidos online, atendimento por QR Code, mesas, comandas e recursos administrativos.',
  },
  {
    pergunta: 'Como faço para cadastrar meu restaurante?',
    resposta:
      'Acesse a opção de cadastro, escolha Sou estabelecimento, crie sua conta e informe os dados solicitados. Depois, sua solicitação passará pelo processo de análise e aprovação.',
  },
  {
    pergunta: 'Como faço para criar minha conta de cliente?',
    resposta:
      'Acesse a opção de cadastro, escolha Sou cliente e preencha seus dados para criar sua conta.',
  },
  {
    pergunta: 'Quando começa o período de teste?',
    resposta:
      'O período de teste gratuito para estabelecimentos é de 7 dias e começa após a aprovação do cadastro do restaurante.',
  },
  {
    pergunta: 'Posso receber pedidos de delivery e retirada?',
    resposta:
      'Sim. A plataforma oferece opções de pedidos para entrega e retirada, além do atendimento por QR Code nas mesas.',
  },
  {
    pergunta: 'Preciso instalar um aplicativo para acessar o cardápio?',
    resposta:
      'O cardápio digital pode ser acessado pelo navegador do celular, por meio do link compartilhado pelo restaurante ou pelo QR Code.',
  },
  {
    pergunta: 'Como funciona a contratação?',
    resposta:
      'O MenuFlow trabalha com opções de planos mensais e anuais para estabelecimentos. As condições e os valores são apresentados durante o processo de contratação.',
  },
  {
    pergunta: 'Posso acessar o sistema pelo computador e celular?',
    resposta:
      'A plataforma foi pensada para facilitar o acesso em diferentes tamanhos de tela, incluindo computadores, tablets e celulares.',
  },
]

const whatsappUrl =
  'https://wa.me/5588993070295?text=Ol%C3%A1!%20Conheci%20o%20MenuFlow%20pelo%20site%20e%20gostaria%20de%20saber%20mais%20sobre%20a%20plataforma.'

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-800">

      {/* CABEÇALHO */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">

          <Link href="/" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-950 text-2xl font-black text-white shadow-lg">
              M
            </div>

            <span className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              Menu<span className="text-orange-500">Flow</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-600 lg:flex">
            <a href="#inicio" className="transition hover:text-orange-500">
              Início
            </a>
            <a href="#solucoes" className="transition hover:text-orange-500">
              Soluções
            </a>
            <a href="#funcionalidades" className="transition hover:text-orange-500">
              Restaurantes
            </a>
            <a href="#clientes" className="transition hover:text-orange-500">
              Clientes
            </a>
            <a href="#como-funciona" className="transition hover:text-orange-500">
              Como funciona
            </a>
            <a href="#planos" className="transition hover:text-orange-500">
              Planos
            </a>
            <a href="#duvidas" className="transition hover:text-orange-500">
              Dúvidas
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-700 hover:text-blue-700"
            >
              Entrar
            </Link>

            <Link
              href={cadastroUrl}
              className="hidden rounded-full border border-blue-900 px-4 py-2.5 text-sm font-bold text-blue-900 transition hover:bg-blue-50 sm:inline-flex"
            >
              Sou cliente
            </Link>

            <Link
              href={cadastroUrl}
              className="rounded-full bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
            >
              <span className="hidden sm:inline">Sou restaurante</span>
              <span className="sm:hidden">Cadastrar</span>
            </Link>
          </div>
        </div>
      </header>

      {/* DESTAQUE PRINCIPAL */}
      <section
        id="inicio"
        className="relative overflow-hidden bg-[#101b35] text-white"
      >
        <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[450px] w-[450px] rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:grid-cols-2 md:py-28">

          <div>
            <span className="inline-flex rounded-full border border-blue-300/20 bg-blue-400/10 px-4 py-2 text-sm font-semibold text-blue-200">
              Uma plataforma para restaurantes e clientes
            </span>

            <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Restaurantes e clientes.
              <span className="mt-2 block text-orange-400">
                Todos conectados em um só lugar.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              O MenuFlow conecta restaurantes e clientes em uma
              plataforma digital. Encontre cardápios, conheça produtos
              e faça seus pedidos. Para restaurantes, oferecemos
              ferramentas para organizar o atendimento, gerenciar
              pedidos e administrar seu estabelecimento.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href={cadastroUrl}
                className="rounded-xl bg-orange-500 px-8 py-4 text-center font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-orange-600"
              >
                Cadastrar meu restaurante →
              </Link>

              <Link
                href={cadastroUrl}
                className="rounded-xl border border-white/20 px-8 py-4 text-center font-bold text-white transition hover:bg-white/10"
              >
                Criar conta de cliente →
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
              <span>✓ Cardápios digitais</span>
              <span>✓ Pedidos online</span>
              <span>✓ Gestão de restaurantes</span>
            </div>
          </div>

          {/* PRÉVIA VISUAL */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative rounded-[2rem] border border-white/10 bg-white p-5 shadow-2xl sm:p-7">

              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    MenuFlow
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                    Uma experiência completa
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Para quem vende e para quem compra
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-900 text-xl font-black text-white">
                  M
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <span className="text-2xl">🏪</span>
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Para estabelecimentos
                  </p>
                  <p className="mt-1 text-lg font-black text-blue-900">
                    Gestão
                  </p>
                </div>

                <div className="rounded-2xl bg-orange-50 p-4">
                  <span className="text-2xl">🛍️</span>
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Para clientes
                  </p>
                  <p className="mt-1 text-lg font-black text-orange-700">
                    Pedidos
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ['🍔', 'Cardápios digitais', 'Produtos e categorias'],
                  ['🛵', 'Delivery e retirada', 'Pedidos online'],
                  ['📲', 'QR Code', 'Atendimento nas mesas'],
                  ['📊', 'Gestão', 'Organização do estabelecimento'],
                ].map((item) => (
                  <div
                    key={item[1]}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
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

                    <span className="ml-auto text-lg text-green-600">✓</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#101b35] p-5 text-white">
                <p className="text-sm text-slate-300">
                  MenuFlow
                </p>
                <p className="mt-1 text-xl font-extrabold">
                  Mais conexão, praticidade e organização.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="border-b border-slate-100 bg-white py-9">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 sm:grid-cols-3">

          {[
            ['📱', 'Acesso pelo celular', 'Use a plataforma pelo navegador.'],
            ['🔄', 'Restaurantes e clientes', 'Uma plataforma que conecta os dois públicos.'],
            ['🏪', 'Gestão integrada', 'Recursos para organizar seu estabelecimento.'],
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

      {/* SOLUÇÕES PARA RESTAURANTES */}
      <section id="solucoes" className="bg-[#f8fafc] px-5 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-2">

          <div>
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Para estabelecimentos
            </span>

            <h2 className="mt-4 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
              Seu restaurante merece uma gestão mais organizada.
            </h2>

            <p className="mt-6 leading-8 text-slate-600">
              Administrar um restaurante envolve produtos, clientes,
              pedidos, mesas, horários e pagamentos. O MenuFlow reúne
              diferentes ferramentas em uma única plataforma para
              facilitar o acompanhamento do seu negócio.
            </p>

            <Link
              href={cadastroUrl}
              className="mt-8 inline-flex rounded-xl bg-blue-900 px-7 py-4 font-bold text-white transition hover:bg-blue-800"
            >
              Cadastrar meu restaurante →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['📋', 'Pedidos organizados', 'Acompanhe os pedidos recebidos.'],
              ['🍽️', 'Cardápio atualizado', 'Gerencie produtos e categorias.'],
              ['🪑', 'Mesas organizadas', 'Acompanhe o atendimento presencial.'],
              ['📊', 'Informações reunidas', 'Consulte recursos administrativos.'],
            ].map((item) => (
              <div
                key={item[1]}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <span className="text-3xl">{item[0]}</span>
                <h3 className="mt-4 font-extrabold text-slate-900">
                  {item[1]}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item[2]}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ÁREA DOS CLIENTES */}
      <section id="clientes" className="bg-white px-5 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">

          <div>
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Para clientes
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Seu próximo pedido começa aqui.
            </h2>

            <p className="mt-6 leading-8 text-slate-600">
              Com o MenuFlow, você pode acessar os cardápios dos
              estabelecimentos, conhecer os produtos disponíveis
              e fazer seus pedidos de maneira simples e prática.
            </p>

            <div className="mt-7 space-y-4">
              {vantagensClientes.map((item) => (
                <div key={item[1]} className="flex items-center gap-3">
                  <span className="text-2xl">{item[0]}</span>
                  <span className="font-semibold text-slate-700">
                    {item[1]}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href={cadastroUrl}
              className="mt-9 inline-flex rounded-xl bg-blue-900 px-8 py-4 font-bold text-white transition hover:bg-blue-800"
            >
              Criar minha conta de cliente →
            </Link>
          </div>

          <div className="rounded-3xl bg-orange-50 p-8 sm:p-12">
            <div className="rounded-3xl bg-white p-7 shadow-xl">
              <div className="text-5xl">🍔</div>

              <h3 className="mt-5 text-2xl font-black text-slate-900">
                Tudo para facilitar seu pedido.
              </h3>

              <p className="mt-4 leading-7 text-slate-500">
                Descubra opções, consulte produtos e aproveite
                uma experiência digital mais prática.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  'Cardápios digitais',
                  'Delivery e retirada',
                  'Pedidos online',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl bg-slate-50 p-4 font-semibold text-slate-700"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>

              <Link
                href={cadastroUrl}
                className="mt-6 block rounded-xl bg-orange-500 px-6 py-4 text-center font-bold text-white transition hover:bg-orange-600"
              >
                Quero fazer meu cadastro
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* MODALIDADES */}
      <section className="bg-white px-5 py-24">
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Formas de atendimento
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Diferentes formas de atender seus clientes.
            </h2>

            <p className="mt-5 leading-7 text-slate-500">
              Organize os pedidos de acordo com a modalidade
              de atendimento oferecida pelo seu estabelecimento.
            </p>
          </div>

          <div className="mt-14 grid gap-7 md:grid-cols-3">
            {modalidades.map((item) => (
              <div
                key={item.titulo}
                className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${item.cor} text-3xl`}>
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

      {/* FUNCIONALIDADES */}
      <section
        id="funcionalidades"
        className="bg-[#f8fafc] px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Recursos para estabelecimentos
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Ferramentas para acompanhar a operação do seu restaurante.
            </h2>

            <p className="mt-5 leading-7 text-slate-500">
              Conheça os recursos que ajudam a organizar o cardápio,
              o atendimento e a administração do estabelecimento.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {funcionalidades.map((item) => (
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
              Comece com o MenuFlow
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Do cadastro à utilização em quatro etapas.
            </h2>

            <p className="mt-5 text-slate-500">
              Seja cliente ou estabelecimento, faça parte do MenuFlow.
            </p>
          </div>

          <div className="mt-16 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {etapas.map((item) => (
              <div
                key={item.numero}
                className="relative rounded-3xl border border-slate-100 bg-slate-50 p-7 text-center"
              >
                <span className="absolute right-6 top-5 text-4xl font-black text-slate-200">
                  {item.numero}
                </span>

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-900 text-3xl text-white shadow-lg shadow-blue-900/20">
                  {item.icon}
                </div>

                <h3 className="mt-7 text-lg font-extrabold text-slate-900">
                  {item.titulo}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {item.descricao}
                </p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-orange-100 bg-orange-50 p-6 text-center">
            <p className="font-extrabold text-slate-900">
              <span className="text-orange-600">7 dias de teste gratuito</span>
              {' '}para estabelecimentos após a aprovação.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              O período de teste começa depois que a solicitação
              do restaurante é aprovada.
            </p>
          </div>

        </div>
      </section>

      {/* PLANOS */}
      <section
        id="planos"
        className="bg-[#f8fafc] px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">

          <div className="mx-auto max-w-2xl text-center">
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Planos MenuFlow
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Uma opção para cada momento do seu negócio.
            </h2>

            <p className="mt-5 leading-7 text-slate-500">
              Conheça as opções de contratação e consulte as condições
              disponíveis para o seu restaurante.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">

            {[
              {
                nome: 'Básico',
                descricao: 'Para começar a organizar seu restaurante.',
                destaque: false,
              },
              {
                nome: 'Profissional',
                descricao: 'Para negócios que desejam ampliar seus recursos de gestão.',
                destaque: true,
              },
              {
                nome: 'Premium',
                descricao: 'Para estabelecimentos que buscam uma experiência completa.',
                destaque: false,
              },
            ].map((plano) => (
              <div
                key={plano.nome}
                className={`relative rounded-3xl border bg-white p-8 shadow-sm ${
                  plano.destaque
                    ? 'border-orange-400 shadow-xl'
                    : 'border-slate-100'
                }`}
              >
                {plano.destaque && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-5 py-2 text-xs font-bold text-white">
                    PLANO EM DESTAQUE
                  </span>
                )}

                <h3 className="text-2xl font-black text-slate-900">
                  {plano.nome}
                </h3>

                <p className="mt-4 min-h-14 leading-7 text-slate-500">
                  {plano.descricao}
                </p>

                <div className="my-7 border-t border-slate-100" />

                <p className="font-bold text-slate-800">
                  Consulte as condições
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Opções de contratação mensal e anual.
                </p>

                <Link
                  href={cadastroUrl}
                  className={`mt-8 block rounded-xl px-6 py-4 text-center font-bold transition ${
                    plano.destaque
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-blue-900 text-white hover:bg-blue-800'
                  }`}
                >
                  Conhecer este plano
                </Link>
              </div>
            ))}

          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Os valores e recursos disponíveis podem ser consultados
            durante o processo de contratação.
          </p>
        </div>
      </section>

      {/* PERGUNTAS FREQUENTES */}
      <section
        id="duvidas"
        className="bg-white px-5 py-24"
      >
        <div className="mx-auto max-w-4xl">

          <div className="text-center">
            <span className="font-bold uppercase tracking-widest text-orange-500">
              Central de dúvidas
            </span>

            <h2 className="mt-4 text-3xl font-black text-slate-900 sm:text-4xl">
              Perguntas frequentes
            </h2>

            <p className="mt-5 text-slate-500">
              Encontre respostas para conhecer melhor o MenuFlow.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {perguntas.map((item) => (
              <details
                key={item.pergunta}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition open:border-blue-200 open:bg-blue-50/30"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                  {item.pergunta}

                  <span className="shrink-0 text-xl text-orange-500 transition group-open:rotate-45">
                    +
                  </span>
                </summary>

                <p className="mt-4 border-t border-slate-100 pt-4 leading-7 text-slate-600">
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* CHAMADA FINAL */}
      <section className="relative overflow-hidden bg-orange-500 px-5 py-20 text-center text-white">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-orange-700/20 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <span className="text-sm font-bold uppercase tracking-widest text-white/80">
            Seu próximo passo começa aqui
          </span>

          <h2 className="mt-5 text-3xl font-black sm:text-5xl">
            Faça parte do MenuFlow!
          </h2>

          <p className="mt-6 text-lg leading-8 text-white/90">
            Seja um estabelecimento e organize seu atendimento
            ou seja cliente e descubra uma maneira prática de
            consultar cardápios e fazer seus pedidos.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href={cadastroUrl}
              className="rounded-xl bg-[#101b35] px-8 py-4 font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-slate-900"
            >
              Cadastrar restaurante
            </Link>

            <Link
              href={cadastroUrl}
              className="rounded-xl bg-white px-8 py-4 font-bold text-orange-600 shadow-xl transition hover:bg-orange-50"
            >
              Cadastrar como cliente
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/80">
            7 dias de teste gratuito para estabelecimentos após a aprovação.
          </p>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-[#0b1429] px-5 py-14 text-white">

        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-3">

          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-xl font-black text-white">
                M
              </div>

              <span className="text-2xl font-extrabold">
                Menu<span className="text-orange-400">Flow</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              Uma plataforma que conecta restaurantes e clientes,
              facilitando o acesso a cardápios digitais, pedidos
              e ferramentas de gestão.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Navegação</h3>

            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-400">
              <a href="#inicio" className="transition hover:text-orange-400">Início</a>
              <a href="#solucoes" className="transition hover:text-orange-400">Restaurantes</a>
              <a href="#clientes" className="transition hover:text-orange-400">Clientes</a>
              <a href="#funcionalidades" className="transition hover:text-orange-400">Funcionalidades</a>
              <a href="#como-funciona" className="transition hover:text-orange-400">Como funciona</a>
              <a href="#planos" className="transition hover:text-orange-400">Planos</a>
              <a href="#duvidas" className="transition hover:text-orange-400">Perguntas frequentes</a>
            </div>
          </div>

          <div>
            <h3 className="font-bold">Acesse o MenuFlow</h3>

            <div className="mt-5 flex flex-col gap-3 text-sm text-slate-400">
              <Link href="/login" className="transition hover:text-orange-400">
                Entrar na minha conta
              </Link>

              <Link href={cadastroUrl} className="transition hover:text-orange-400">
                Cadastrar como cliente
              </Link>

              <Link href={cadastroUrl} className="transition hover:text-orange-400">
                Cadastrar restaurante
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-orange-400"
              >
                Falar com nossa equipe
              </a>
            </div>
          </div>

        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-7 text-center text-xs text-slate-400">
          © 2026 MenuFlow. Todos os direitos reservados.
        </div>

      </footer>

      {/* WHATSAPP FLUTUANTE */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Fale com nossa equipe pelo WhatsApp"
        className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-full bg-[#25D366] px-5 py-4 text-white shadow-2xl transition hover:-translate-y-1 hover:bg-[#1ebe5d]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-7 w-7"
          aria-hidden="true"
        >
          <path d="M12.04 2a9.85 9.85 0 0 0-8.48 14.87L2.2 22l5.27-1.38A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.18 8.18 0 0 1-4.17-1.14l-.3-.18-3.13.82.84-3.05-.2-.31A8.16 8.16 0 1 1 12.04 20.1Zm4.48-6.12c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.19-1.41-1.33-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.14.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.57.18 1.09.16 1.5.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.12-.22-.28-.46-.4Z" />
        </svg>

        <span className="hidden text-sm font-bold sm:inline">
          Fale com nossa equipe
        </span>
      </a>

    </main>
  )
}
