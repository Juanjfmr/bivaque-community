// Texto e tempo: as regras de comparação que o protótipo usa na busca
// (`features/search/views.js`, queryTerms e matches) e a idade de um registro
// escrita em palavras. Não pertence à demonstração — a tela do diálogo usa os
// termos para validar a pergunta antes de publicar.

const UM_DIA = 24 * 60 * 60 * 1000

// As palavras de ligação que não contam como termo de busca.
const PARADAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "para",
  "com",
  "um",
  "uma",
  "por",
  "perto",
])

const SINONIMOS: Record<string, string> = {
  dentista: "odonto odontopediatra odontopediatria",
  pediatra: "pediatria",
  escola: "colegio escolas",
  mecanico: "mecanica oficina",
  eletricista: "eletrica",
  diarista: "faxina limpeza",
  mudanca: "transportadora frete",
  berco: "berço",
  imovel: "apartamento casa imóveis",
  saude: "odontopediatria pediatra clinica",
  pets: "veterinario veterinaria",
  climatizacao: "ar condicionado split",
  carro: "mecanica oficina despachante",
  casa: "eletrica limpeza reparos",
  aula: "aulas reforco",
}

export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function termosDeBusca(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((palavra) => palavra.length > 1 && !PARADAS.has(palavra))
}

export function combina(texto: string, alvo: string): boolean {
  const termos = termosDeBusca(texto)
  if (termos.length === 0) return true
  const palheiro = normalizar(alvo)
  return termos.every((termo) => {
    if (palheiro.includes(termo)) return true
    const sinonimos = (SINONIMOS[termo] ?? "").split(" ").filter(Boolean).map(normalizar)
    return sinonimos.some((sinonimo) => palheiro.includes(sinonimo))
  })
}

export function quandoRelativo(iso: string, agora: number = Date.now()): string {
  const dias = Math.floor((agora - Date.parse(iso)) / UM_DIA)
  if (dias <= 0) return "agora"
  if (dias === 1) return "ontem"
  if (dias < 7) return `há ${dias} dias`
  const semanas = Math.floor(dias / 7)
  return semanas === 1 ? "semana passada" : `há ${semanas} semanas`
}
