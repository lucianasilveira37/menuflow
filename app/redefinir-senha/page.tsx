'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function RedefinirSenha() {
  const router = useRouter()

  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function salvarSenha(e: FormEvent<HTMLFormElement>) {
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
      const { error } = await supabase.auth.updateUser({
        password: senha,
      })

      if (error) {
        setErro(
          'Não foi possível redefinir a senha. Solicite um novo link de recuperação.'
        )
        return
      }

      setSucesso('Senha alterada com sucesso! Você será direcionado ao login.')

      await supabase.auth.signOut()

      setTimeout(() => {
        router.replace('/login')
      }, 1500)
    } catch (error) {
      console.error('Erro ao redefinir senha:', error)
      setErro('Ocorreu um erro. Solicite um novo link.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f5f7',
        padding: 20,
      }}
    >
      <form
        onSubmit={salvarSenha}
        style={{
          background: '#fff',
          padding: 35,
          borderRadius: 16,
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>
          MenuFlow
        </h1>

        <p style={{ color: '#666', marginBottom: 25 }}>
          Escolha sua nova senha.
        </p>

        <label style={estiloLabel}>Nova senha</label>

        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          style={estiloInput}
        />

        <label style={estiloLabel}>Confirmar nova senha</label>

        <input
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          style={estiloInput}
        />

        {erro && <p style={estiloErro}>{erro}</p>}
        {sucesso && <p style={estiloSucesso}>{sucesso}</p>}

        <button
          type="submit"
          disabled={carregando}
          style={{
            width: '100%',
            padding: 14,
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            cursor: carregando ? 'not-allowed' : 'pointer',
            opacity: carregando ? 0.7 : 1,
          }}
        >
          {carregando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </main>
  )
}

const estiloLabel = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#333',
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

const estiloErro = {
  color: '#dc2626',
  background: '#fef2f2',
  padding: 12,
  borderRadius: 8,
  fontSize: 14,
}

const estiloSucesso = {
  color: '#166534',
  background: '#f0fdf4',
  padding: 12,
  borderRadius: 8,
  fontSize: 14,
}
