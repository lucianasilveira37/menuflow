import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#183b2b]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d5b3b] text-xl font-bold text-white">
            M
          </div>

          <span className="text-2xl font-extrabold tracking-tight">
            Menu<span className="text-[#d49a35]">Flow</span>
          </span>
        </Link>

        <Link
          href="/login"
          className="rounded-full border border-[#1d5b3b] px-5 py-2.5 text-sm font-semibold transition hover:bg-[#1d5b3b] hover:text-white"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto grid min-h-[75vh] max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
        <div className="max-w-xl">
          <span className="mb-6 inline-flex rounded-full bg-[#e6efe8] px-4 py-2 text-sm font-semibold text-[#286344]">
            Bem-vindo ao MenuFlow
          </span>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Seu próximo pedido começa{" "}
            <span className="text-[#d49a35]">aqui.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
            Encontre restaurantes, conheça cardápios e faça seus pedidos de
            maneira simples, rápida e prática.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="rounded-xl bg-[#1d5b3b] px-8 py-4 text-center font-bold text-white shadow-lg shadow-green-900/10 transition hover:-translate-y-0.5 hover:bg-[#16482e]"
            >
              Acessar minha conta
            </Link>

            <Link
              href="/login?cadastro=true"
              className="rounded-xl border border-[#d8ded8] bg-white px-8 py-4 text-center font-bold text-[#1d5b3b] transition hover:border-[#1d5b3b] hover:bg-[#f0f5f0]"
            >
              Criar minha conta
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Já tem uma conta? Entre e continue de onde parou.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -left-5 -top-5 h-28 w-28 rounded-full bg-[#e8d6ad] opacity-60 blur-2xl" />
          <div className="absolute -bottom-5 -right-5 h-36 w-36 rounded-full bg-[#c9dfcf] opacity-70 blur-2xl" />

          <div className="relative rounded-[2rem] border border-white bg-white p-6 shadow-2xl shadow-green-950/10 sm:p-9">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Uma experiência
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">
                  Mais prática.
                </h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f1e9] text-2xl">
                🍽️
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-[#f7f8f5] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5eee6] text-xl">
                  🔎
                </div>
                <div>
                  <h3 className="font-bold">Encontre restaurantes</h3>
                  <p className="text-sm text-gray-500">
                    Descubra opções disponíveis.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-[#f7f8f5] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f6edda] text-xl">
                  📋
                </div>
                <div>
                  <h3 className="font-bold">Explore os cardápios</h3>
                  <p className="text-sm text-gray-500">
                    Escolha seus pratos favoritos.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl bg-[#f7f8f5] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5eee6] text-xl">
                  🛵
                </div>
                <div>
                  <h3 className="font-bold">Faça seu pedido</h3>
                  <p className="text-sm text-gray-500">
                    Tudo de forma simples e rápida.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-2xl bg-[#1d5b3b] p-5 text-white">
              <p className="text-sm text-white/75">
                Sua experiência começa agora
              </p>
              <p className="mt-1 text-xl font-bold">
                Bem-vindo ao MenuFlow!
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5e9e3] px-6 py-6 text-center text-sm text-gray-500">
        © 2026 MenuFlow. Todos os direitos reservados.
      </footer>
    </main>
  );
}
