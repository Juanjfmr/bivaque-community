import "server-only"

/**
 * Geocodificação do CEP (RUN-029 / ADR-20261022-localizacao §4).
 *
 * Roda só no servidor: a BrasilAPI v2 é a fonte principal e o Google Places é
 * reserva, atrás de `GOOGLE_MAPS_API_KEY`. A coordenada é derivada aqui e vai
 * para o banco; nunca é devolvida ao cliente nem entra em log.
 *
 * Não há retry: ou o serviço responde dentro do prazo curto, ou o CEP fica para
 * depois. Nada aqui imprime CEP nem coordenada.
 */

export type FonteDaCoordenada = "brasilapi" | "google"

export type CoordenadaDoCep = Readonly<{
  latitude: number
  longitude: number
  fonte: FonteDaCoordenada
}>

/**
 * Cidade e bairro que a fonte devolve junto do CEP (RUN-175: o anúncio deriva o
 * bairro daqui). São texto da fonte, não validados: quem casa com
 * `neighborhoods` é o módulo da localização do anúncio.
 */
export type EnderecoDoCep = Readonly<{ cidade: string | null; bairro: string | null }>

export type ResultadoDaGeocodificacao =
  | Readonly<{ estado: "encontrado"; coordenada: CoordenadaDoCep; endereco: EnderecoDoCep }>
  | Readonly<{ estado: "sem-coordenada"; endereco: EnderecoDoCep }>
  | Readonly<{ estado: "nao-encontrado" }>
  | Readonly<{ estado: "indisponivel" }>

type Opcoes = Readonly<{
  /** Injetável nos testes; em produção é o `fetch` nativo. */
  buscar?: typeof fetch
  /** Chave do Google no servidor; vazia desliga a reserva. */
  chaveGoogle?: string | undefined
  /** Prazo de cada tentativa, em milissegundos. */
  tempoLimiteMs?: number
}>

type Tentativa =
  | Readonly<{
      estado: "encontrado"
      latitude: number
      longitude: number
      endereco: EnderecoDoCep
    }>
  /** A fonte respondeu que conhece o CEP, mas sem posição utilizável. */
  | Readonly<{ estado: "conhecido"; endereco: EnderecoDoCep }>
  | Readonly<{ estado: "nao-encontrado" }>
  | Readonly<{ estado: "falhou" }>

const TEMPO_LIMITE_PADRAO = 2500
const URL_DA_BRASILAPI = "https://brasilapi.com.br/api/cep/v2/"
const URL_DO_GOOGLE = "https://maps.googleapis.com/maps/api/geocode/json"

function registro(valor: unknown): Record<string, unknown> | null {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return null
  return valor as Record<string, unknown>
}

/** Texto aparado da fonte, ou `null` quando vazio/ausente. */
function textoDaFonte(valor: unknown): string | null {
  if (typeof valor !== "string") return null
  const aparado = valor.trim()
  return aparado === "" ? null : aparado
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  if (typeof valor !== "string" || valor.trim() === "") return null
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : null
}

function coordenadaValida(
  latitude: unknown,
  longitude: unknown,
): Readonly<{ latitude: number; longitude: number }> | null {
  const lat = numero(latitude)
  const lng = numero(longitude)
  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { latitude: lat, longitude: lng }
}

async function tentarBrasilApi(
  cep: string,
  buscar: typeof fetch,
  tempoLimiteMs: number,
): Promise<Tentativa> {
  try {
    const resposta = await buscar(`${URL_DA_BRASILAPI}${cep}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(tempoLimiteMs),
      cache: "no-store",
      // A URL é montada por concatenação: um 3xx para outro host não pode ser
      // seguido (SSRF defensivo). O CEP já vem validado por `geocodificarCep`.
      redirect: "error",
    })
    if (resposta.status === 404) return { estado: "nao-encontrado" }
    if (!resposta.ok) return { estado: "falhou" }
    const corpo = registro((await resposta.json()) as unknown)
    // Evidência positiva: a fonte só conhece o CEP quando devolve o próprio CEP
    // pedido. Corpo vazio, lista, objeto de erro ou outro CEP não prova nada.
    const cepDoCorpo = corpo?.["cep"]
    const conhece = typeof cepDoCorpo === "string" && cepDoCorpo.replace(/[^0-9]/g, "") === cep
    if (!conhece) return { estado: "falhou" }
    const local = registro(corpo?.["location"])
    const coordenadas = registro(local?.["coordinates"])
    const coordenada = coordenadaValida(coordenadas?.["latitude"], coordenadas?.["longitude"])
    // A BrasilAPI v2 devolve cidade e bairro junto do CEP; é deles que o anúncio
    // deriva o bairro (RUN-175).
    const endereco = {
      cidade: textoDaFonte(corpo?.["city"]),
      bairro: textoDaFonte(corpo?.["neighborhood"]),
    }
    return coordenada === null
      ? { estado: "conhecido", endereco }
      : { estado: "encontrado", ...coordenada, endereco }
  } catch {
    return { estado: "falhou" }
  }
}

async function tentarGoogle(
  cep: string,
  chave: string,
  buscar: typeof fetch,
  tempoLimiteMs: number,
): Promise<Tentativa> {
  try {
    const url = new URL(URL_DO_GOOGLE)
    url.searchParams.set("components", `country:BR|postal_code:${cep}`)
    url.searchParams.set("key", chave)
    const resposta = await buscar(url.toString(), {
      signal: AbortSignal.timeout(tempoLimiteMs),
      cache: "no-store",
      redirect: "error",
    })
    if (!resposta.ok) return { estado: "falhou" }
    const corpo = registro((await resposta.json()) as unknown)
    const status = corpo?.["status"]
    if (status === "ZERO_RESULTS") return { estado: "nao-encontrado" }
    if (status !== "OK") return { estado: "falhou" }
    // Evidência positiva: `OK` sem resultado é resposta sem prova.
    const resultados = corpo?.["results"]
    if (!Array.isArray(resultados) || resultados.length === 0) return { estado: "falhou" }
    const local = registro(registro(registro(resultados[0])?.["geometry"])?.["location"])
    const coordenada = coordenadaValida(local?.["lat"], local?.["lng"])
    // A reserva só serve para a POSIÇÃO: cidade e bairro vêm da BrasilAPI
    // (RUN-175), então aqui eles chegam vazios.
    const endereco = { cidade: null, bairro: null }
    return coordenada === null
      ? { estado: "conhecido", endereco }
      : { estado: "encontrado", ...coordenada, endereco }
  } catch {
    return { estado: "falhou" }
  }
}

/**
 * O CEP vira coordenada, ou a resposta diz por que não virou.
 *
 * `sem-coordenada` é o CEP que alguma fonte conhece e nenhuma localiza — o
 * Google é tentado antes de concluir (ADR-20261112). `nao-encontrado` é o CEP
 * que nenhuma fonte conhece; `indisponivel` é quando as fontes falham e nenhuma
 * chegou a dizer que conhece o CEP.
 */
export async function geocodificarCep(
  cep: string,
  opcoes: Opcoes = {},
): Promise<ResultadoDaGeocodificacao> {
  // A URL da BrasilAPI é montada por concatenação, então a entrada é validada
  // aqui também: oito dígitos ou nada sai deste processo (os chamadores já
  // normalizam e respondem 400 antes — isto é a segunda barreira, RUN-175 R3).
  if (!/^\d{8}$/.test(cep)) return { estado: "nao-encontrado" }
  const buscar = opcoes.buscar ?? fetch
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? TEMPO_LIMITE_PADRAO
  const chaveGoogle = opcoes.chaveGoogle ?? process.env["GOOGLE_MAPS_API_KEY"] ?? ""

  const brasil = await tentarBrasilApi(cep, buscar, tempoLimiteMs)
  if (brasil.estado === "encontrado") {
    return {
      estado: "encontrado",
      coordenada: {
        latitude: brasil.latitude,
        longitude: brasil.longitude,
        fonte: "brasilapi",
      },
      endereco: brasil.endereco,
    }
  }

  let google: Tentativa | null = null
  if (chaveGoogle !== "") {
    google = await tentarGoogle(cep, chaveGoogle, buscar, tempoLimiteMs)
    if (google.estado === "encontrado") {
      return {
        estado: "encontrado",
        coordenada: { latitude: google.latitude, longitude: google.longitude, fonte: "google" },
        // A cidade e o bairro só a BrasilAPI conta; a reserva dá a posição.
        endereco: brasil.estado === "conhecido" ? brasil.endereco : google.endereco,
      }
    }
  }

  // Uma fonte que conhece o CEP vale mais que outra que falhou: dá para
  // guardar a localização sem posição em vez de recusar um CEP verdadeiro.
  if (brasil.estado === "conhecido") return { estado: "sem-coordenada", endereco: brasil.endereco }
  if (google?.estado === "conhecido") {
    return { estado: "sem-coordenada", endereco: google.endereco }
  }
  if (brasil.estado === "falhou" || google?.estado === "falhou") {
    return { estado: "indisponivel" }
  }
  return { estado: "nao-encontrado" }
}
