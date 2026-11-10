
'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'


type TipoCadastro = 'restaurant' | 'customer'
type Modo = 'login' | 'cadastro' | 'recuperar'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [modo, setModo] = useState<Modo>('login')

useEffect(() => {
  const cadastro = searchParams.get('cadastro') === 'true'
  setModo(cadastro ? 'cadastro' : 'login')
}, [searchParams])

  const [tipoCadastro, setTipoCadastro] =
    useState<TipoCadastro>('restaurant')

  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [tipoEstabelecimento, setTipoEstabelecimento] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  function somenteNumeros(valor: string) {
    return valor.replace(/\D/g, '')
  }

  function validarCPF(cpf: string) {
    const valor = somenteNumeros(cpf)

    if (valor.length !== 11 || /^(\d)\1+$/.test(valor)) {
      return false
    }

    let soma = 0

    for (let i = 0; i < 9; i++) {
      soma += Number(valor[i]) * (10 - i)
    }

    let digito = (soma * 10) % 11
    if (digito === 10) digito = 0

    if (digito !== Number(valor[9])) return false

    soma = 0

    for (let i = 0; i < 10; i++) {
      soma += Number(valor[i]) * (11 - i)
    }

    digito = (soma * 10) % 11
    if (digito === 10) digito = 0

    return digito === Number(valor[10])
  }

  function validarCNPJ(cnpj: string) {
    const valor = somenteNumeros(cnpj)

    if (valor.length !== 14 || /^(\d)\1+$/.test(valor)) {
      return false
    }

    const calcularDigito = (base: string, pesos: number[]) => {
      const soma = base
        .split('')
        .reduce((total, numero, indice) => {
          return total + Number(numero) * pesos[indice]
        }, 0)

      const resto = soma % 11
      return resto < 2 ? 0 : 11 - resto
    }

    const primeiroDigito = calcularDigito(
      valor.substring(0, 12),
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    )

    const segundoDigito = calcularDigito(
      valor.substring(0, 12) + primeiroDigito,
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    )

    return (
      Number(valor[12]) === primeiroDigito &&
      Number(valor[13]) === segundoDigito
    )
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })

      if (error) {
        setErro(
          'E-mail ou senha incorretos. Verifique também se confirmou seu e-mail.'
        )
        return
      }

      if (!data.user) {
        setErro('Não foi possível identificar o usuário.')
        return
      }

      const { data: admin, error: adminError } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (adminError) {
        setErro('Não foi possível verificar suas permissões.')
        return
      }

      if (admin) {
        router.replace('/superadmin')
        return
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from('memberships')
          .select('restaurant_id')
          .eq('user_id', data.user.id)
          .maybeSingle()

      if (membershipError) {
        setErro('Não foi possível verificar seu estabelecimento.')
        return
      }

      if (membership) {
        router.replace('/painel')
        return
      }

      const { data: request, error: requestError } = await supabase
        .from('restaurant_requests')
        .select('status, rejection_reason')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (requestError) {
        setErro('Não foi possível consultar sua solicitação.')
        return
      }

      if (request?.status === 'pending') {
        setErro(
          'Sua solicitação está aguardando aprovação do MenuFlow.'
        )
        return
      }

      if (request?.status === 'rejected') {
        setErro(
          request.rejection_reason
            ? `Sua solicitação foi recusada. Motivo: ${request.rejection_reason}`
            : 'Sua solicitação foi recusada. Entre em contato com o suporte.'
        )
        return
      }

      const { data: customer, error: customerError } = await supabase
        .from('customer_profiles')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (customerError) {
        setErro('Não foi possível verificar seu cadastro de cliente.')
        return
      }

      if (customer) {
        router.replace('/restaurantes')
        return
      }

      setErro('Sua conta ainda não possui um cadastro válido.')
    } catch (error) {
      console.error('Erro no login:', error)
      setErro('Ocorreu um erro ao entrar. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function cadastrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const documentoLimpo = somenteNumeros(documento)
    const cepLimpo = somenteNumeros(cep)

    if (!nome.trim()) {
      setErro('Informe seu nome completo.')
      return
    }

    if (tipoCadastro === 'restaurant' && !empresa.trim()) {
      setErro('Informe o nome do estabelecimento.')
      return
    }

    if (tipoCadastro === 'restaurant' && !tipoEstabelecimento) {
      setErro('Selecione o tipo do estabelecimento.')
      return
    }

    if (tipoCadastro === 'customer' && !validarCPF(documentoLimpo)) {
      setErro('Informe um CPF válido.')
      return
    }

    if (tipoCadastro === 'restaurant') {
      const documentoValido =
        documentoLimpo.length === 11
          ? validarCPF(documentoLimpo)
          : validarCNPJ(documentoLimpo)

      if (!documentoValido) {
        setErro('Informe um CPF ou CNPJ válido.')
        return
      }
    }

    if (cepLimpo.length !== 8) {
      setErro('O CEP precisa ter 8 números.')
      return
    }

    if (!/^[A-Za-z]{2}$/.test(estado.trim())) {
      setErro('Informe a sigla do estado com duas letras. Exemplo: CE.')
      return
    }

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não são iguais.')
      return
    }

    setCarregando(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            registration_type: tipoCadastro,
            contact_name: nome.trim(),
            business_name:
              tipoCadastro === 'restaurant' ? empresa.trim() : '',
            business_type:
              tipoCadastro === 'restaurant'
                ? tipoEstabelecimento
                : '',
            document: documentoLimpo,
            phone: telefone.trim(),
            postal_code: cepLimpo,
            street: rua.trim(),
            address_number: numero.trim(),
            complement: complemento.trim(),
            neighborhood: bairro.trim(),
            city: cidade.trim(),
            state: estado.trim().toUpperCase(),
          },
        },
      })

      if (error) {
        console.error('Erro do Supabase:', error)
        setErro(error.message)
        return
      }

      if (!data.user) {
        setErro('Não foi possível criar sua conta. Tente novamente.')
        return
      }

      if (tipoCadastro === 'customer') {
        setSucesso(
          'Conta criada com sucesso! Enviamos um e-mail de confirmação. Confirme seu endereço de e-mail para liberar o acesso ao MenuFlow.'
        )
      } else {
        setSucesso(
          'Solicitação criada com sucesso! Enviamos um e-mail de confirmação. Confirme seu endereço de e-mail e aguarde a aprovação do estabelecimento pelo MenuFlow.'
        )
      }

      setNome('')
      setEmpresa('')
      setTipoEstabelecimento('')
      setDocumento('')
      setTelefone('')
      setEmail('')
      setCep('')
      setRua('')
      setNumero('')
      setComplemento('')
      setBairro('')
      setCidade('')
      setEstado('')
      setSenha('')
      setConfirmarSenha('')
    } catch (error) {
      console.error('Erro no cadastro:', error)
      setErro('Ocorreu um erro ao criar sua conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  async function recuperarSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!email.trim()) {
      setErro('Informe seu e-mail.')
      return
    }

    setCarregando(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        }
      )

      if (error) {
        console.error('Erro do Supabase ao recuperar senha:', error)
        setErro('Não foi possível enviar o e-mail. Tente novamente.')
        return
      }

      setSucesso(
        'Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a caixa de spam.'
      )
    } catch (error) {
      console.error('Erro ao recuperar senha:', error)
      setErro('Ocorreu um erro. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  function trocarModo(novoModo: Modo) {
    setModo(novoModo)
    setErro('')
    setSucesso('')
    setSenha('')
    setConfirmarSenha('')
  }

  function trocarTipoCadastro(tipo: TipoCadastro) {
    setTipoCadastro(tipo)
    setErro('')
    setSucesso('')
  }

  return (
    <main style={estiloMain}>
      <form
        onSubmit={
          modo === 'login'
            ? entrar
            : modo === 'cadastro'
              ? cadastrar
              : recuperarSenha
        }
        style={estiloFormulario}
      >
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          MenuFlow
        </h1>

        <p style={{ color: '#666', marginBottom: 25 }}>
          {modo === 'login'
            ? 'Entre na sua conta para continuar.'
            : modo === 'cadastro'
              ? 'Escolha como deseja criar sua conta.'
              : 'Informe seu e-mail para receber o link de recuperação.'}
        </p>

        {modo === 'cadastro' && (
          <>
            <label style={estiloLabel}>Tipo de cadastro</label>

            <div style={estiloGrupoTipo}>
              <button
                type="button"
                onClick={() => trocarTipoCadastro('customer')}
                style={{
                  ...estiloBotaoTipo,
                  ...(tipoCadastro === 'customer'
                    ? estiloBotaoTipoAtivo
                    : {}),
                }}
              >
                Sou cliente
              </button>

              <button
                type="button"
                onClick={() => trocarTipoCadastro('restaurant')}
                style={{
                  ...estiloBotaoTipo,
                  ...(tipoCadastro === 'restaurant'
                    ? estiloBotaoTipoAtivo
                    : {}),
                }}
              >
                Sou estabelecimento
              </button>
            </div>

            <label style={estiloLabel}>
              {tipoCadastro === 'customer'
                ? 'Nome completo'
                : 'Nome completo do responsável'}
            </label>

            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
              style={estiloInput}
            />

            {tipoCadastro === 'restaurant' && (
              <>
                <label style={estiloLabel}>
                  Nome do estabelecimento
                </label>

                <input
                  type="text"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  required
                  style={estiloInput}
                />

                <label style={estiloLabel}>
                  Tipo do estabelecimento
                </label>

                <select
                  value={tipoEstabelecimento}
                  onChange={(e) =>
                    setTipoEstabelecimento(e.target.value)
                  }
                  required
                  style={estiloInput}
                >
                  <option value="">Selecione uma opção</option>
                  <option value="Restaurante">Restaurante</option>
                  <option value="Pizzaria">Pizzaria</option>
                  <option value="Lanchonete">Lanchonete</option>
                  <option value="Hamburgueria">Hamburgueria</option>
                  <option value="Outros">Outros</option>
                </select>
              </>
            )}

            <label style={estiloLabel}>
              {tipoCadastro === 'customer' ? 'CPF' : 'CPF ou CNPJ'}
            </label>

            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              required
              inputMode="numeric"
              placeholder={
                tipoCadastro === 'customer'
                  ? 'Digite seu CPF'
                  : 'Digite seu CPF ou CNPJ'
              }
              style={estiloInput}
            />

            <label style={estiloLabel}>Telefone / WhatsApp</label>

            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
              autoComplete="tel"
              style={estiloInput}
            />

            <label style={estiloLabel}>CEP</label>

            <input
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              required
              inputMode="numeric"
              placeholder="Digite o CEP"
              style={estiloInput}
            />

            <label style={estiloLabel}>Rua / Avenida</label>

            <input
              type="text"
              value={rua}
              onChange={(e) => setRua(e.target.value)}
              required
              autoComplete="street-address"
              style={estiloInput}
            />

            <label style={estiloLabel}>Número</label>

            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
              style={estiloInput}
            />

            <label style={estiloLabel}>Complemento (opcional)</label>

            <input
              type="text"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              style={estiloInput}
            />

            <label style={estiloLabel}>Bairro</label>

            <input
              type="text"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              required
              style={estiloInput}
            />

            <label style={estiloLabel}>Cidade</label>

            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              required
              style={estiloInput}
            />

            <label style={estiloLabel}>Estado (UF)</label>

            <input
              type="text"
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value.toUpperCase().slice(0, 2))
              }
              required
              maxLength={2}
              placeholder="Ex.: CE"
              style={estiloInput}
            />
          </>
        )}

        <label style={estiloLabel}>E-mail</label>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={estiloInput}
        />

        {modo === 'login' && (
          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => trocarModo('recuperar')}
              style={estiloLink}
            >
              Esqueci minha senha
            </button>
          </div>
        )}

        {modo !== 'recuperar' && (
          <>
            <label style={estiloLabel}>Senha</label>

            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              autoComplete={
                modo === 'login' ? 'current-password' : 'new-password'
              }
              style={estiloInput}
            />

            {modo === 'cadastro' && (
              <>
                <label style={estiloLabel}>Confirmar senha</label>

                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  style={estiloInput}
                />
              </>
            )}
          </>
        )}

        {erro && <p style={estiloErro}>{erro}</p>}

        {sucesso && <p style={estiloSucesso}>{sucesso}</p>}

        <button
          type="submit"
          disabled={carregando}
          style={{
            ...estiloBotaoPrincipal,
            cursor: carregando ? 'not-allowed' : 'pointer',
            opacity: carregando ? 0.7 : 1,
          }}
        >
          {carregando
            ? 'Aguarde...'
            : modo === 'login'
              ? 'Entrar'
              : modo === 'cadastro'
                ? 'Criar minha conta'
                : 'Enviar link de recuperação'}
        </button>

        <div style={estiloRodape}>
          {modo === 'login' ? (
            <p style={{ color: '#666' }}>
              Não tem conta?{' '}
              <button
                type="button"
                onClick={() => trocarModo('cadastro')}
                style={estiloLink}
              >
                Criar minha conta
              </button>
            </p>
          ) : (
            <p style={{ color: '#666' }}>
              {modo === 'recuperar'
                ? 'Lembrou sua senha? '
                : 'Já tem conta? '}
              <button
                type="button"
                onClick={() => trocarModo('login')}
                style={estiloLink}
              >
                Voltar para entrar
              </button>
            </p>
          )}
        </div>
      </form>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginContent />
    </Suspense>
  )
}

const estiloMain = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f4f5f7',
  padding: 20,
}

const estiloFormulario = {
  background: '#ffffff',
  padding: 35,
  borderRadius: 16,
  width: '100%',
  maxWidth: 520,
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  margin: '20px 0',
}

const estiloLabel = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
  marginTop: 2,
}

const estiloInput = {
  width: '100%',
  padding: 12,
  marginTop: 8,
  marginBottom: 18,
  border: '1px solid #ddd',
  borderRadius: 8,
  boxSizing: 'border-box' as const,
  fontSize: 15,
}

const estiloGrupoTipo = {
  display: 'flex',
  gap: 10,
  marginTop: 8,
  marginBottom: 22,
}

const estiloBotaoTipo = {
  flex: 1,
  padding: 12,
  border: '1px solid #ddd',
  borderRadius: 8,
  background: '#fff',
  color: '#444',
  fontWeight: 600,
  cursor: 'pointer',
}

const estiloBotaoTipoAtivo = {
  background: '#f0fdf4',
  border: '2px solid #16a34a',
  color: '#15803d',
}

const estiloBotaoPrincipal = {
  width: '100%',
  padding: 14,
  background: '#16a34a',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  fontWeight: 'bold',
  marginTop: 5,
}

const estiloErro = {
  color: '#dc2626',
  background: '#fef2f2',
  padding: 12,
  borderRadius: 8,
  marginBottom: 15,
  fontSize: 14,
}

const estiloSucesso = {
  color: '#166534',
  background: '#f0fdf4',
  padding: 12,
  borderRadius: 8,
  marginBottom: 15,
  fontSize: 14,
}

const estiloRodape = {
  textAlign: 'center' as const,
  marginTop: 22,
  fontSize: 14,
}

const estiloLink = {
  background: 'none',
  border: 'none',
  color: '#16a34a',
  fontWeight: 'bold',
  cursor: 'pointer',
  padding: 0,
  fontSize: 14,
}
