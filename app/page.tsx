
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function Home() {
  const router = useRouter()

  const [modo, setModo] = useState<'login' | 'cadastro'>('login')

  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setCarregando(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        setErro('E-mail ou senha incorretos. Verifique também se confirmou seu e-mail.')
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

      const { data: membership, error: membershipError } = await supabase
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
        setErro('Sua solicitação está aguardando aprovação do MenuFlow.')
      } else if (request?.status === 'rejected') {
        setErro(
          request.rejection_reason
            ? `Sua solicitação foi recusada. Motivo: ${request.rejection_reason}`
            : 'Sua solicitação foi recusada. Entre em contato com o suporte.'
        )
      } else {
        setErro('Sua conta ainda não possui um estabelecimento aprovado.')
      }
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
        email: email.trim(),
        password: senha,
        options: {
          emailRedirectTo: 'http://localhost:3000',
          data: {
            registration_type: 'restaurant',
            contact_name: nome.trim(),
            business_name: empresa.trim(),
            phone: telefone.trim(),
          },
        },
      })

      if (error) {
        setErro(error.message)
        return
      }

      if (!data.user) {
        setErro('Não foi possível criar sua conta. Tente novamente.')
        return
      }

      setSucesso(
        'Conta criada! Enviamos um e-mail de confirmação. Confirme seu endereço de e-mail para que sua solicitação possa ser analisada pelo MenuFlow. Depois, aguarde a aprovação do estabelecimento.'
      )

      setNome('')
      setEmpresa('')
      setTelefone('')
      setEmail('')
      setSenha('')
      setConfirmarSenha('')
    } catch (error) {
      console.error('Erro no cadastro:', error)
      setErro('Ocorreu um erro ao criar sua conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  function trocarModo(novoModo: 'login' | 'cadastro') {
    setModo(novoModo)
    setErro('')
    setSucesso('')
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f5f7',
      padding: 20
    }}>
      <form
        onSubmit={modo === 'login' ? entrar : cadastrar}
        style={{
          background: '#ffffff',
          padding: 35,
          borderRadius: 16,
          width: '100%',
          maxWidth: 430,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}
      >
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          MenuFlow
        </h1>

        <p style={{ color: '#666', marginBottom: 25 }}>
          {modo === 'login'
            ? 'Entre na sua conta para continuar.'
            : 'Crie sua conta e solicite o cadastro do seu estabelecimento.'}
        </p>

        {modo === 'cadastro' && (
          <>
            <label>Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
              style={estiloInput}
            />

            <label>Nome da empresa ou estabelecimento</label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
              style={estiloInput}
            />

            <label>Telefone / WhatsApp</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
              autoComplete="tel"
              style={estiloInput}
            />
          </>
        )}

        <label>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          style={estiloInput}
        />

        <label>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={6}
          autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
          style={estiloInput}
        />

        {modo === 'cadastro' && (
          <>
            <label>Confirmar senha</label>
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

        {erro && (
          <p style={{
            color: '#dc2626',
            background: '#fef2f2',
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
            fontSize: 14
          }}>
            {erro}
          </p>
        )}

        {sucesso && (
          <p style={{
            color: '#166534',
            background: '#f0fdf4',
            padding: 12,
            borderRadius: 8,
            marginBottom: 15,
            fontSize: 14
          }}>
            {sucesso}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          style={{
            width: '100%',
            padding: 14,
            background: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: carregando ? 'not-allowed' : 'pointer',
            opacity: carregando ? 0.7 : 1,
            marginTop: 5
          }}
        >
          {carregando
            ? 'Aguarde...'
            : modo === 'login'
              ? 'Entrar'
              : 'Criar minha conta'}
        </button>

        <div style={{
          textAlign: 'center',
          marginTop: 22,
          fontSize: 14
        }}>
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
              Já tem conta?{' '}
              <button
                type="button"
                onClick={() => trocarModo('login')}
                style={estiloLink}
              >
                Já tenho conta
              </button>
            </p>
          )}
        </div>
      </form>
    </main>
  )
}

const estiloInput = {
  width: '100%',
  padding: 12,
  marginTop: 8,
  marginBottom: 18,
  border: '1px solid #ddd',
  borderRadius: 8,
  boxSizing: 'border-box' as const,
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
