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

export type ResultadoDaGeocodificacao =
  | Readonly<{ estado: "encontrado"; coordenada: CoordenadaDoCep }>
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
  | Readonly<{ estado: "encontrado"; latitude: number; longitude: number }>
  | Readonly<{ estado: "nao-encontrado" }>
  | Readonly<{ estado: "falhou" }>

const TEMPO_LIMITE_PADRAO = 2500
const URL_DA_BRASILAPI = "https://brasilapi.com.br/api/cep/v2/"
const URL_DO_GOOGLE = "https://maps.googleapis.com/maps/api/geocode/json"

function registro(valor: unknown): Record<string, unknown> | null {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) return null
  return valor as Record<string, unknown>
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
    })
    if (resposta.status === 404) return { estado: "nao-encontrado" }
    if (!resposta.ok) return { estado: "falhou" }
    const corpo = registro((await resposta.json()) as unknown)
    const local = registro(corpo?.["location"])
    const coordenadas = registro(local?.["coordinates"])
    const coordenada = coordenadaValida(coordenadas?.["latitude"], coordenadas?.["longitude"])
    return coordenada === null
      ? { estado: "nao-encontrado" }
      : { estado: "encontrado", ...coordenada }
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
    })
    if (!resposta.ok) return { estado: "falhou" }
    const corpo = registro((await resposta.json()) as unknown)
    const status = corpo?.["status"]
    if (status === "ZERO_RESULTS") return { estado: "nao-encontrado" }
    if (status !== "OK") return { estado: "falhou" }
    const resultados = corpo?.["results"]
    const primeiro = Array.isArray(resultados) ? resultados[0] : undefined
    const local = registro(registro(registro(primeiro)?.["geometry"])?.["location"])
    const coordenada = coordenadaValida(local?.["lat"], local?.["lng"])
    return coordenada === null
      ? { estado: "nao-encontrado" }
      : { estado: "encontrado", ...coordenada }
  } catch {
    return { estado: "falhou" }
  }
}

/**
 * O CEP vira coordenada, ou a resposta diz por que não virou.
 *
 * `nao-encontrado` é o CEP que nenhuma fonte conhece; `indisponivel` é quando
 * alguma fonte falhou e não dá para afirmar que o CEP não existe.
 */
export async function geocodificarCep(
  cep: string,
  opcoes: Opcoes = {},
): Promise<ResultadoDaGeocodificacao> {
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
    }
  }

  let google: Tentativa | null = null
  if (chaveGoogle !== "") {
    google = await tentarGoogle(cep, chaveGoogle, buscar, tempoLimiteMs)
    if (google.estado === "encontrado") {
      return {
        estado: "encontrado",
        coordenada: { latitude: google.latitude, longitude: google.longitude, fonte: "google" },
      }
    }
  }

  if (brasil.estado === "falhou" || google?.estado === "falhou") {
    return { estado: "indisponivel" }
  }
  return { estado: "nao-encontrado" }
}
