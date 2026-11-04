
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function TesteSupabase() {
  const [resultado, setResultado] = useState('Testando conexão...')

  useEffect(() => {
    async function testar() {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .limit(5)

      if (error) {
        setResultado('Erro: ' + error.message)
        return
      }

      setResultado(
        'Conexão realizada com sucesso! Restaurantes encontrados: ' +
        data.length
      )
    }

    testar()
  }, [])

  return (
    <main style={{ padding: 30 }}>
      <h1>Teste do Supabase - MenuFlow</h1>
      <p>{resultado}</p>
    </main>
  )
}
