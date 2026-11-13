
'use client'

import { Suspense, useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'

type TipoCadastro = 'restaurant' | 'customer'
type Modo =
  | 'login'
  | 'cadastro'
  | 'recuperar'
  | 'cadastro-cliente'
  | 'cadastro-estabelecimento'

type EstadoIBGE = {
  id: number
  sigla: string
  nome: string
}

type MunicipioIBGE = {
  id: number
  nome: string
}

type ViaCepResposta = {
  cep?: string
  logradouro?: string
  bairro?: string
  complemento?: string
}

type CepOpcao = {
  cep: string
  logradouro: string
  bairro: string
  complemento: string
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [modo, setModo] = useState<Modo>('login')
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

  const [estados, setEstados] = useState<EstadoIBGE[]>([])
  const [municipios, setMunicipios] = useState<MunicipioIBGE[]>([])
  const [carregandoEstados, setCarregandoEstados] = useState(false)
  const [carregandoMunicipios, setCarregandoMunicipios] = useState(false)
  const [erroEstados, setErroEstados] = useState('')
  const [erroMunicipios, setErroMunicipios] = useState('')

  const [cepsEncontrados, setCepsEncontrados] = useState<CepOpcao[]>([])
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [statusCep, setStatusCep] = useState('')

  const [mostrarEscolhaAcesso, setMostrarEscolhaAcesso] = useState(false)
  const [temAcessoCliente, setTemAcessoCliente] = useState(false)
  const [temAcessoEstabelecimento, setTemAcessoEstabelecimento] =
    useState(false)
  const [statusSolicitacao, setStatusSolicitacao] = useState('')
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [cpfCliente, setCpfCliente] = useState('')

  const modoCadastro =
    modo === 'cadastro' ||
    modo === 'cadastro-cliente' ||
    modo === 'cadastro-estabelecimento'

  const cadastroClienteExistente = modo === 'cadastro-cliente'
  const cadastroEstabelecimentoExistente =
    modo === 'cadastro-estabelecimento'

  const tipoAtual: TipoCadastro = cadastroClienteExistente
    ? 'customer'
    : cadastroEstabelecimentoExistente
      ? 'restaurant'
      : tipoCadastro

  useEffect(() => {
    const cadastro = searchParams.get('cadastro') === 'true'
    setModo(cadastro ? 'cadastro' : 'login')
  }, [searchParams])

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

  // Carrega os estados brasileiros.
  useEffect(() => {
    const controller = new AbortController()

    async function carregarEstados() {
      setCarregandoEstados(true)
      setErroEstados('')

      try {
        const resposta = await fetch(
          'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome',
          { signal: controller.signal }
        )

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar os estados.')
        }

        const dados: EstadoIBGE[] = await resposta.json()
        setEstados(dados)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro ao carregar estados:', error)
          setErroEstados(
            'Não foi possível carregar os estados. Atualize a página e tente novamente.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoEstados(false)
        }
      }
    }

    carregarEstados()

    return () => controller.abort()
  }, [])

  // Carrega os municípios do estado selecionado.
  useEffect(() => {
    const controller = new AbortController()

    if (!estado) {
      setMunicipios([])
      setCidade('')
      setErroMunicipios('')
      setCarregandoMunicipios(false)

      return () => controller.abort()
    }

    async function carregarMunicipios() {
      setCarregandoMunicipios(true)
      setMunicipios([])
      setErroMunicipios('')

      try {
        const resposta = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`,
          { signal: controller.signal }
        )

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar os municípios.')
        }

        const dados: MunicipioIBGE[] = await resposta.json()
        setMunicipios(dados)
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro ao carregar municípios:', error)
          setErroMunicipios(
            'Não foi possível carregar as cidades. Tente selecionar o estado novamente.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregandoMunicipios(false)
        }
      }
    }

    carregarMunicipios()

    return () => controller.abort()
  }, [estado])

  // Busca CEP sem apagar um CEP que já veio do cadastro existente.
  useEffect(() => {
    if (
      !modoCadastro ||
      !estado ||
      !cidade ||
      rua.trim().length < 3
    ) {
      setCepsEncontrados([])
      setStatusCep('')
      setBuscandoCep(false)
      return
    }

    const controller = new AbortController()

    setCepsEncontrados([])
    setStatusCep('')

    const temporizador = setTimeout(async () => {
      setBuscandoCep(true)
      setStatusCep('Consultando CEP...')

      try {
        const url =
          `https://viacep.com.br/ws/` +
          `${estado}/${encodeURIComponent(cidade)}/` +
          `${encodeURIComponent(rua.trim())}/json/`

        const resposta = await fetch(url, {
          signal: controller.signal,
        })

        if (!resposta.ok) {
          throw new Error('Erro ao consultar CEP.')
        }

        const dados: ViaCepResposta[] | { erro?: boolean } =
          await resposta.json()

        if (!Array.isArray(dados)) {
          setCepsEncontrados([])
          setStatusCep('Nenhum CEP encontrado para esse endereço.')
          return
        }

        const resultados: CepOpcao[] = dados
          .filter(
            (
              item
            ): item is ViaCepResposta & { cep: string } =>
              typeof item.cep === 'string' && item.cep.length > 0
          )
          .map((item) => ({
            cep: item.cep,
            logradouro: item.logradouro || '',
            bairro: item.bairro || '',
            complemento: item.complemento || '',
          }))

        setCepsEncontrados(resultados)

        if (resultados.length === 0) {
          setStatusCep(
            'Nenhum CEP encontrado. Você pode informar o CEP manualmente.'
          )
          return
        }

        if (resultados.length === 1) {
          setCep((atual) => atual || resultados[0].cep)

          if (resultados[0].bairro) {
            setBairro((atual) => atual || resultados[0].bairro)
          }

          setStatusCep('CEP encontrado automaticamente!')
          return
        }

        setStatusCep(
          'Encontramos mais de um CEP. Selecione o correto abaixo.'
        )
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Erro ao buscar CEP:', error)
          setStatusCep(
            'Não foi possível consultar o CEP. Você pode preenchê-lo manualmente.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoCep(false)
        }
      }
    }, 700)

    return () => {
      clearTimeout(temporizador)
      controller.abort()
    }
  }, [rua, cidade, estado, modoCadastro])

  
async function entrar(e: FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setErro('')
  setSucesso('')
  setCarregando(true)
  setMostrarEscolhaAcesso(false)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })

    if (error) {
      console.error('Erro de autenticação:', error)
      setErro(
        'E-mail ou senha incorretos. Verifique também se confirmou seu e-mail.'
      )
      return
    }

    if (!data.user) {
      setErro('Não foi possível identificar o usuário.')
      return
    }

    const userId = data.user.id

    console.log('USUÁRIO AUTENTICADO:', {
      id: userId,
      email: data.user.email,
    })

    // Confirma que a sessão foi estabelecida.
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession()

    if (sessionError || !sessionData.session) {
      console.error('Erro ao verificar sessão:', sessionError)
      setErro('Não foi possível confirmar sua sessão. Entre novamente.')
      return
    }

    // PRIMEIRO: verifica se é administrador da plataforma.
    const { data: admin, error: adminError } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    console.log('VERIFICAÇÃO DO ADMINISTRADOR:', {
      userId,
      admin,
      adminError,
    })

    if (adminError) {
      console.error('Erro ao consultar administrador:', adminError)
      setErro(
        `Não foi possível verificar suas permissões: ${adminError.message}`
      )
      return
    }

    if (admin?.user_id === userId) {
      console.log('ADMINISTRADOR CONFIRMADO. ABRINDO SUPERADMIN.')

      router.replace('/superadmin')
      return
    }

    // Somente usuários não administradores consultam os outros perfis.
    const [
      { data: memberships, error: membershipError },
      { data: customer, error: customerError },
      { data: request, error: requestError },
    ] = await Promise.all([
      supabase
        .from('memberships')
        .select('restaurant_id, role')
        .eq('user_id', userId),

      supabase
        .from('customer_profiles')
        .select(`
          user_id,
          full_name,
          document,
          phone,
          postal_code,
          street,
          address_number,
          complement,
          neighborhood,
          city,
          state
        `)
        .eq('user_id', userId)
        .maybeSingle(),

      supabase
        .from('restaurant_requests')
        .select(`
          status,
          rejection_reason,
          contact_name,
          business_name,
          business_type,
          document,
          phone,
          postal_code,
          street,
          address_number,
          complement,
          neighborhood,
          city,
          state
        `)
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    if (membershipError) {
      console.error('Erro ao consultar estabelecimentos:', membershipError)
      setErro('Não foi possível verificar seus estabelecimentos.')
      return
    }

    if (customerError) {
      console.error('Erro ao consultar cliente:', customerError)
      setErro('Não foi possível verificar seu cadastro de cliente.')
      return
    }

    if (requestError) {
      console.error('Erro ao consultar solicitação:', requestError)
      setErro('Não foi possível consultar sua solicitação.')
      return
    }

    const possuiCliente = !!customer
    const possuiEstabelecimento =
      !!memberships && memberships.length > 0

    console.log('PERFIS ENCONTRADOS:', {
      possuiCliente,
      possuiEstabelecimento,
      customer,
      memberships,
      request,
    })

    setTemAcessoCliente(possuiCliente)
    setTemAcessoEstabelecimento(possuiEstabelecimento)

    const metadata = data.user.user_metadata || {}

    setNomeUsuario(
      customer?.full_name ||
      request?.contact_name ||
      metadata.contact_name ||
      data.user.email ||
      ''
    )

    setNome(
      customer?.full_name ||
      request?.contact_name ||
      metadata.contact_name ||
      ''
    )

    setTelefone(
      customer?.phone ||
      request?.phone ||
      metadata.phone ||
      ''
    )

    setCep(
      customer?.postal_code ||
      request?.postal_code ||
      metadata.postal_code ||
      ''
    )

    setRua(
      customer?.street ||
      request?.street ||
      metadata.street ||
      ''
    )

    setNumero(
      customer?.address_number ||
      request?.address_number ||
      metadata.address_number ||
      ''
    )

    setComplemento(
      customer?.complement ||
      request?.complement ||
      metadata.complement ||
      ''
    )

    setBairro(
      customer?.neighborhood ||
      request?.neighborhood ||
      metadata.neighborhood ||
      ''
    )

    setEstado(
      customer?.state ||
      request?.state ||
      metadata.state ||
      ''
    )

    setCidade(
      customer?.city ||
      request?.city ||
      metadata.city ||
      ''
    )

    setEmpresa(request?.business_name || metadata.business_name || '')

    setTipoEstabelecimento(
      request?.business_type || metadata.business_type || ''
    )

    setDocumento(
  cadastroEstabelecimentoExistente
    ? request?.document || ''
    : customer?.document || request?.document || metadata.document || ''
)

    setStatusSolicitacao(request?.status || '')
    setMotivoRejeicao(request?.rejection_reason || '')

    if (possuiCliente || possuiEstabelecimento) {
      setMostrarEscolhaAcesso(true)
      return
    }

    if (request?.status === 'pending') {
      setErro(
        'Sua solicitação de estabelecimento está aguardando aprovação do MenuFlow.'
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

    setErro('Sua conta ainda não possui um cadastro válido.')
  } catch (error) {
    console.error('Erro inesperado no login:', error)
    setErro('Ocorreu um erro ao entrar. Tente novamente.')
  } finally {
    setCarregando(false)
  }
}


  async function sairDaConta() {
    setCarregando(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setErro('Não foi possível sair da conta.')
      setCarregando(false)
      return
    }

    setMostrarEscolhaAcesso(false)
    setTemAcessoCliente(false)
    setTemAcessoEstabelecimento(false)
    setStatusSolicitacao('')
    setMotivoRejeicao('')
    setEmail('')
    setSenha('')
    setErro('')
    setSucesso('')
    setModo('login')
    setCarregando(false)
  }

  // Cadastro convencional: cria uma nova conta.
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

    if (!telefone.trim()) {
      setErro('Informe seu telefone.')
      return
    }

    if (!rua.trim() || !numero.trim() || !bairro.trim()) {
      setErro('Preencha rua, número e bairro.')
      return
    }

    if (cepLimpo.length !== 8) {
      setErro('O CEP precisa ter 8 números.')
      return
    }

    if (!/^[A-Za-z]{2}$/.test(estado.trim())) {
      setErro('Informe a sigla do estado com duas letras. Exemplo: CE.')
      return
    }

    if (!cidade.trim()) {
      setErro('Selecione a cidade.')
      return
    }

    if (!municipios.some((municipio) => municipio.nome === cidade)) {
      setErro('Selecione uma cidade válida para o estado informado.')
      return
    }

    if (!email.trim()) {
      setErro('Informe seu e-mail.')
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

      if (
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        setErro(
          'Este e-mail já possui uma conta. Entre com sua senha para adicionar outro perfil.'
        )
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
      setCepsEncontrados([])
      setStatusCep('')
    } catch (error) {
      console.error('Erro no cadastro:', error)
      setErro('Ocorreu um erro ao criar sua conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  // Cadastro complementar: cria apenas o perfil de cliente
  // na conta que já está autenticada.
  async function cadastrarClienteNaContaExistente(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const documentoLimpo = somenteNumeros(documento)
    const cepLimpo = somenteNumeros(cep)

    if (!nome.trim()) {
      setErro('Informe seu nome completo.')
      return
    }

    if (!validarCPF(documentoLimpo)) {
      setErro('Informe um CPF válido.')
      return
    }

    if (!telefone.trim()) {
      setErro('Informe seu telefone.')
      return
    }

    if (!rua.trim() || !numero.trim() || !bairro.trim()) {
      setErro('Preencha rua, número e bairro.')
      return
    }

    if (cepLimpo.length !== 8) {
      setErro('O CEP precisa ter 8 números.')
      return
    }

    if (!/^[A-Za-z]{2}$/.test(estado.trim())) {
      setErro('Selecione um estado válido.')
      return
    }

    if (
      !cidade.trim() ||
      !municipios.some((municipio) => municipio.nome === cidade)
    ) {
      setErro('Selecione uma cidade válida.')
      return
    }

    setCarregando(true)

    try {
      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser()

      if (usuarioError || !usuarioData.user) {
        setErro('Sua sessão expirou. Entre novamente.')
        return
      }

      const { error: rpcError } = await supabase.rpc(
        'complete_customer_profile_for_current_user',
        {
          p_full_name: nome.trim(),
          p_document: documentoLimpo,
          p_phone: telefone.trim(),
          p_postal_code: cepLimpo,
          p_street: rua.trim(),
          p_address_number: numero.trim(),
          p_complement: complemento.trim(),
          p_neighborhood: bairro.trim(),
          p_city: cidade.trim(),
          p_state: estado.trim().toUpperCase(),
        }
      )

      if (rpcError) {
        console.error('Erro ao criar perfil de cliente:', rpcError)
        setErro(
          rpcError.message ||
          'Não foi possível criar seu perfil de cliente.'
        )
        return
      }

      setTemAcessoCliente(true)
      setMostrarEscolhaAcesso(true)
      setNomeUsuario(nome.trim())
      setSucesso('Seu perfil de cliente foi confirmado e criado com sucesso!')

      setNome('')
      setDocumento('')
      setTelefone('')
      setCep('')
      setRua('')
      setNumero('')
      setComplemento('')
      setBairro('')
      setCidade('')
      setEstado('')
      setCepsEncontrados([])
      setStatusCep('')
    } catch (error) {
      console.error('Erro ao completar cadastro:', error)
      setErro('Ocorreu um erro ao criar seu perfil. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  // Solicita um estabelecimento usando a conta de cliente já autenticada.
  async function cadastrarEstabelecimentoNaContaExistente(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const documentoLimpo = somenteNumeros(documento)
    const cepLimpo = somenteNumeros(cep)

    if (!empresa.trim()) {
      setErro('Informe o nome do estabelecimento.')
      return
    }

    if (!tipoEstabelecimento) {
      setErro('Selecione o tipo do estabelecimento.')
      return
    }

    const documentoValido =
      documentoLimpo.length === 11
        ? validarCPF(documentoLimpo)
        : validarCNPJ(documentoLimpo)

    if (!documentoValido) {
      setErro('Informe um CPF ou CNPJ válido para o estabelecimento.')
      return
    }

    if (!telefone.trim()) {
      setErro('Informe o telefone / WhatsApp.')
      return
    }

    if (!rua.trim() || !numero.trim() || !bairro.trim()) {
      setErro('Preencha rua, número e bairro.')
      return
    }

    if (cepLimpo.length !== 8) {
      setErro('O CEP precisa ter 8 números.')
      return
    }

    if (!/^[A-Za-z]{2}$/.test(estado.trim())) {
      setErro('Selecione um estado válido.')
      return
    }

    if (
      !cidade.trim() ||
      !municipios.some((municipio) => municipio.nome === cidade)
    ) {
      setErro('Selecione uma cidade válida.')
      return
    }

    setCarregando(true)

    try {
      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser()

      if (usuarioError || !usuarioData.user) {
        setErro('Sua sessão expirou. Entre novamente.')
        return
      }

      const { error: rpcError } = await supabase.rpc(
        'request_restaurant_for_current_user',
        {
          p_business_name: empresa.trim(),
          p_business_type: tipoEstabelecimento,
          p_document: documentoLimpo,
          p_phone: telefone.trim(),
          p_postal_code: cepLimpo,
          p_street: rua.trim(),
          p_address_number: numero.trim(),
          p_complement: complemento.trim(),
          p_neighborhood: bairro.trim(),
          p_city: cidade.trim(),
          p_state: estado.trim().toUpperCase(),
        }
      )

      if (rpcError) {
        console.error('Erro ao solicitar estabelecimento:', rpcError)
        setErro(
          rpcError.message ||
          'Não foi possível enviar sua solicitação de estabelecimento.'
        )
        return
      }

      setStatusSolicitacao('pending')
      setMotivoRejeicao('')
      setTemAcessoCliente(true)
      setTemAcessoEstabelecimento(false)
      setMostrarEscolhaAcesso(true)
      setNomeUsuario(nomeUsuario || nome)
      setSucesso(
        'Solicitação enviada com sucesso! Ela será analisada pela equipe MenuFlow. Você pode continuar acessando sua área de cliente.'
      )

      setEmpresa('')
      setTipoEstabelecimento('')
      setDocumento('')
      setCepsEncontrados([])
      setStatusCep('')
    } catch (error) {
      console.error('Erro ao solicitar estabelecimento:', error)
      setErro(
        'Ocorreu um erro ao enviar sua solicitação. Tente novamente.'
      )
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

  function abrirCadastroEstabelecimento() {
    setTipoCadastro('restaurant')
    setDocumento('')
    setErro('')
    setSucesso('')
    setMostrarEscolhaAcesso(false)
    trocarModo('cadastro-estabelecimento')
  }

  function selecionarCep(valor: string) {
    const selecionado = cepsEncontrados.find(
      (item) => item.cep === valor
    )

    if (!selecionado) return

    setCep(selecionado.cep)

    if (selecionado.bairro) {
      setBairro(selecionado.bairro)
    }

    setStatusCep('CEP selecionado com sucesso!')
  }

  return mostrarEscolhaAcesso ? (
    <main style={estiloMain}>
      <div style={estiloFormulario}>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>
          MenuFlow
        </h1>

        <p style={{ color: '#666', marginBottom: 25 }}>
          Olá! Como deseja acessar sua conta?
        </p>

        <p style={{ marginBottom: 20, fontSize: 14, color: '#666' }}>
          {nomeUsuario}
        </p>

        {sucesso && <p style={estiloSucesso}>{sucesso}</p>}

        {temAcessoCliente && (
          <button
            type="button"
            onClick={() => router.replace('/restaurantes')}
            style={estiloBotaoPrincipal}
          >
            Acessar como cliente
          </button>
        )}

        {!temAcessoCliente && (
          <button
            type="button"
            onClick={() => {
              setTipoCadastro('customer')
setDocumento(cpfCliente)
setErro('')
setSucesso('')
setMostrarEscolhaAcesso(false)
trocarModo('cadastro-cliente')
            }}
            style={estiloBotaoPrincipal}
          >
            Completar cadastro de cliente
          </button>
        )}

        {temAcessoEstabelecimento && (
          <button
            type="button"
            onClick={() => router.replace('/painel')}
            style={{
              ...estiloBotaoPrincipal,
              marginTop: 12,
              background: '#2563eb',
            }}
          >
            Acessar como estabelecimento
          </button>
        )}

        {temAcessoCliente && !temAcessoEstabelecimento && (
          <>
            {!statusSolicitacao && (
              <button
                type="button"
                onClick={abrirCadastroEstabelecimento}
                style={{
                  ...estiloBotaoPrincipal,
                  marginTop: 12,
                  background: '#2563eb',
                }}
              >
                Cadastrar meu estabelecimento
              </button>
            )}

            {statusSolicitacao === 'pending' && (
              <p style={estiloInfoCep}>
                Sua solicitação de estabelecimento está aguardando aprovação
                da equipe MenuFlow.
              </p>
            )}

            {statusSolicitacao === 'rejected' && (
              <div style={estiloErro}>
                <strong>Solicitação recusada.</strong>
                {motivoRejeicao ? (
                  <p style={{ marginBottom: 0 }}>
                    Motivo: {motivoRejeicao}
                  </p>
                ) : (
                  <p style={{ marginBottom: 0 }}>
                    Entre em contato com o suporte para obter mais informações.
                  </p>
                )}
              </div>
            )}

            {statusSolicitacao === 'approved' && (
              <p style={estiloInfoCep}>
                Sua solicitação consta como aprovada, mas ainda não foi
                localizado um acesso de estabelecimento para sua conta.
                Entre em contato com o suporte.
              </p>
            )}
          </>
        )}

        {!temAcessoCliente && statusSolicitacao === 'pending' && (
          <p style={estiloInfoCep}>
            Sua solicitação de estabelecimento está aguardando aprovação.
          </p>
        )}

        {!temAcessoCliente && statusSolicitacao === 'rejected' && (
          <p style={estiloErro}>
            Sua solicitação foi recusada.
            {motivoRejeicao ? ` Motivo: ${motivoRejeicao}` : ''}
          </p>
        )}

        <button
          type="button"
          onClick={sairDaConta}
          disabled={carregando}
          style={{
            ...estiloLink,
            display: 'block',
            margin: '25px auto 0',
          }}
        >
          Sair da conta
        </button>
      </div>
    </main>
  ) : (
    <main style={estiloMain}>
      <form
        onSubmit={
          modo === 'login'
            ? entrar
            : modo === 'cadastro'
              ? cadastrar
              : modo === 'cadastro-cliente'
                ? cadastrarClienteNaContaExistente
                : modo === 'cadastro-estabelecimento'
                  ? cadastrarEstabelecimentoNaContaExistente
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
              : modo === 'cadastro-cliente'
                ? 'Confira seus dados e complete seu cadastro de cliente.'
                : modo === 'cadastro-estabelecimento'
                  ? 'Preencha os dados do estabelecimento que deseja cadastrar.'
                  : 'Informe seu e-mail para receber o link de recuperação.'}
        </p>

        {modoCadastro && (
          <>
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
              </>
            )}

            {cadastroEstabelecimentoExistente && (
              <p style={estiloInfoCep}>
                Sua conta de cliente será mantida. Esta solicitação será
                vinculada ao mesmo usuário.
              </p>
            )}

            {cadastroEstabelecimentoExistente ? (
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
            ) : (
              <>
                <label style={estiloLabel}>
                  {tipoAtual === 'customer'
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

                {modo === 'cadastro' && tipoCadastro === 'restaurant' && (
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
              </>
            )}

            <label style={estiloLabel}>
              {tipoAtual === 'customer' ? 'CPF' : 'CPF ou CNPJ'}
            </label>

            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              required
              inputMode="numeric"
              placeholder={
                tipoAtual === 'customer'
                  ? 'Digite seu CPF'
                  : 'Digite o CPF ou CNPJ do estabelecimento'
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

            {!cadastroEstabelecimentoExistente && (
              <>
                <label style={estiloLabel}>Rua / Avenida</label>

                <input
                  type="text"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  required
                  autoComplete="street-address"
                  placeholder="Digite o nome da rua"
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

                <label style={estiloLabel}>Estado (UF)</label>

                <select
                  value={estado}
                  onChange={(e) => {
                    setEstado(e.target.value)
                    setCidade('')
                    setCep('')
                    setBairro('')
                    setCepsEncontrados([])
                    setStatusCep('')
                    setErroMunicipios('')
                  }}
                  required
                  disabled={carregandoEstados || estados.length === 0}
                  style={estiloInput}
                >
                  <option value="">
                    {carregandoEstados
                      ? 'Carregando estados...'
                      : estados.length > 0
                        ? 'Selecione o estado'
                        : 'Estados indisponíveis'}
                  </option>

                  {estados.map((item) => (
                    <option key={item.id} value={item.sigla}>
                      {item.nome} ({item.sigla})
                    </option>
                  ))}
                </select>

                {erroEstados && (
                  <p style={estiloErro}>{erroEstados}</p>
                )}

                <label style={estiloLabel}>Cidade</label>

                <select
                  value={cidade}
                  onChange={(e) => {
                    setCidade(e.target.value)
                    setCep('')
                    setBairro('')
                    setCepsEncontrados([])
                    setStatusCep('')
                  }}
                  required
                  disabled={
                    !estado ||
                    carregandoMunicipios ||
                    municipios.length === 0
                  }
                  style={estiloInput}
                >
                  <option value="">
                    {!estado
                      ? 'Selecione primeiro o estado'
                      : carregandoMunicipios
                        ? 'Carregando cidades...'
                        : municipios.length > 0
                          ? 'Selecione a cidade'
                          : 'Cidades indisponíveis'}
                  </option>

                  {municipios.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>

                {erroMunicipios && (
                  <p style={estiloErro}>{erroMunicipios}</p>
                )}

                <label style={estiloLabel}>CEP</label>

                <input
                  type="text"
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value)
                    setStatusCep('')
                  }}
                  required
                  inputMode="numeric"
                  placeholder="Preenchido automaticamente ou digite"
                  autoComplete="postal-code"
                  style={estiloInput}
                />

                {buscandoCep && (
                  <p style={estiloInfoCep}>
                    Consultando CEP...
                  </p>
                )}

                {statusCep && (
                  <p
                    style={{
                      ...estiloInfoCep,
                      color:
                        statusCep.includes('automaticamente') ||
                        statusCep.includes('selecionado')
                          ? '#15803d'
                          : statusCep.includes('Consultando')
                            ? '#2563eb'
                            : '#64748b',
                    }}
                  >
                    {statusCep}
                  </p>
                )}

                {cepsEncontrados.length > 1 && (
                  <>
                    <label style={estiloLabel}>
                      Selecione o CEP correto
                    </label>

                    <select
                      value={cep}
                      onChange={(e) => selecionarCep(e.target.value)}
                      style={estiloInput}
                      required
                    >
                      <option value="">Escolha o CEP</option>

                      {cepsEncontrados.map((item, indice) => (
                        <option
                          key={`${item.cep}-${indice}`}
                          value={item.cep}
                        >
                          {item.cep}
                          {item.logradouro
                            ? ` - ${item.logradouro}`
                            : ''}
                          {item.bairro ? ` - ${item.bairro}` : ''}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}

            {cadastroEstabelecimentoExistente && (
              <>
                <label style={estiloLabel}>Rua / Avenida</label>

                <input
                  type="text"
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  required
                  autoComplete="street-address"
                  placeholder="Digite o endereço do estabelecimento"
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

                <label style={estiloLabel}>Estado (UF)</label>

                <select
                  value={estado}
                  onChange={(e) => {
                    setEstado(e.target.value)
                    setCidade('')
                    setCep('')
                    setBairro('')
                    setCepsEncontrados([])
                    setStatusCep('')
                    setErroMunicipios('')
                  }}
                  required
                  disabled={carregandoEstados || estados.length === 0}
                  style={estiloInput}
                >
                  <option value="">
                    {carregandoEstados
                      ? 'Carregando estados...'
                      : estados.length > 0
                        ? 'Selecione o estado'
                        : 'Estados indisponíveis'}
                  </option>

                  {estados.map((item) => (
                    <option key={item.id} value={item.sigla}>
                      {item.nome} ({item.sigla})
                    </option>
                  ))}
                </select>

                {erroEstados && (
                  <p style={estiloErro}>{erroEstados}</p>
                )}

                <label style={estiloLabel}>Cidade</label>

                <select
                  value={cidade}
                  onChange={(e) => {
                    setCidade(e.target.value)
                    setCep('')
                    setBairro('')
                    setCepsEncontrados([])
                    setStatusCep('')
                  }}
                  required
                  disabled={
                    !estado ||
                    carregandoMunicipios ||
                    municipios.length === 0
                  }
                  style={estiloInput}
                >
                  <option value="">
                    {!estado
                      ? 'Selecione primeiro o estado'
                      : carregandoMunicipios
                        ? 'Carregando cidades...'
                        : municipios.length > 0
                          ? 'Selecione a cidade'
                          : 'Cidades indisponíveis'}
                  </option>

                  {municipios.map((item) => (
                    <option key={item.id} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
                </select>

                {erroMunicipios && (
                  <p style={estiloErro}>{erroMunicipios}</p>
                )}

                <label style={estiloLabel}>CEP</label>

                <input
                  type="text"
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value)
                    setStatusCep('')
                  }}
                  required
                  inputMode="numeric"
                  placeholder="Preenchido automaticamente ou digite"
                  autoComplete="postal-code"
                  style={estiloInput}
                />

                {buscandoCep && (
                  <p style={estiloInfoCep}>
                    Consultando CEP...
                  </p>
                )}

                {statusCep && (
                  <p
                    style={{
                      ...estiloInfoCep,
                      color:
                        statusCep.includes('automaticamente') ||
                        statusCep.includes('selecionado')
                          ? '#15803d'
                          : statusCep.includes('Consultando')
                            ? '#2563eb'
                            : '#64748b',
                    }}
                  >
                    {statusCep}
                  </p>
                )}

                {cepsEncontrados.length > 1 && (
                  <>
                    <label style={estiloLabel}>
                      Selecione o CEP correto
                    </label>

                    <select
                      value={cep}
                      onChange={(e) => selecionarCep(e.target.value)}
                      style={estiloInput}
                      required
                    >
                      <option value="">Escolha o CEP</option>

                      {cepsEncontrados.map((item, indice) => (
                        <option
                          key={`${item.cep}-${indice}`}
                          value={item.cep}
                        >
                          {item.cep}
                          {item.logradouro
                            ? ` - ${item.logradouro}`
                            : ''}
                          {item.bairro ? ` - ${item.bairro}` : ''}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </>
            )}
          </>
        )}

        {(modo === 'login' || modo === 'cadastro') && (
          <>
            <label style={estiloLabel}>E-mail</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={estiloInput}
            />
          </>
        )}

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

        {(modo === 'login' || modo === 'cadastro') && (
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

        {modo === 'recuperar' && (
          <>
            <label style={estiloLabel}>E-mail</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={estiloInput}
            />
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
                : modo === 'cadastro-cliente'
                  ? 'Confirmar cadastro de cliente'
                  : modo === 'cadastro-estabelecimento'
                    ? 'Enviar solicitação de estabelecimento'
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
          ) : modo === 'cadastro-cliente' ||
            modo === 'cadastro-estabelecimento' ? (
            <p style={{ color: '#666' }}>
              <button
                type="button"
                onClick={() => {
                  setErro('')
                  setSucesso('')
                  setMostrarEscolhaAcesso(true)
                }}
                style={estiloLink}
              >
                Voltar para escolha de acesso
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
  cursor: 'pointer',
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

const estiloInfoCep = {
  color: '#64748b',
  fontSize: 13,
  marginTop: -12,
  marginBottom: 15,
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
