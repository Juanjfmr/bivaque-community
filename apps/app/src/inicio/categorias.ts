/**
 * Categorias de negócio do banco (enum `provider_category`) como a tela fala:
 * o rótulo de cada código e os grupos da grade "Explorar" da Busca.
 */

const ROTULOS: Readonly<Record<string, string>> = {
  alimentacao: "Alimentação",
  casa_e_reformas: "Casa e reformas",
  assistencia_tecnica: "Assistência técnica",
  mudanca_e_transporte: "Mudança e transporte",
  imoveis: "Imóveis",
  documentacao_e_financas: "Documentação e finanças",
  saude_e_bem_estar: "Saúde e bem-estar",
  beleza: "Beleza",
  educacao_e_aulas: "Educação e aulas",
  automotivo: "Automotivo",
  eventos_e_festas: "Eventos e festas",
  pets: "Pets",
}

/** Rótulo do código; código desconhecido aparece como veio, nunca some. */
export function rotuloDaCategoria(codigo: string): string {
  return ROTULOS[codigo] ?? codigo
}

export type GrupoDeCategoria = Readonly<{
  id: string
  rotulo: string
  icone: string
  codigos: readonly string[]
}>

export const EXPLORAR: readonly GrupoDeCategoria[] = [
  { id: "saude", rotulo: "Saúde", icone: "medical_services", codigos: ["saude_e_bem_estar"] },
  { id: "educacao", rotulo: "Educação", icone: "school", codigos: ["educacao_e_aulas"] },
  {
    id: "reparos",
    rotulo: "Casa e reparos",
    icone: "build",
    codigos: ["casa_e_reformas", "assistencia_tecnica"],
  },
  {
    id: "mudanca",
    rotulo: "Mudança e transporte",
    icone: "local_shipping",
    codigos: ["mudanca_e_transporte"],
  },
  { id: "pets", rotulo: "Pets", icone: "pets", codigos: ["pets"] },
  {
    id: "comida",
    rotulo: "Festas e comida",
    icone: "cake",
    codigos: ["alimentacao", "eventos_e_festas"],
  },
]

export function negocioDoGrupo(grupoId: string | null, categoria: string): boolean {
  const grupo = EXPLORAR.find((item) => item.id === grupoId)
  return grupo !== undefined && grupo.codigos.includes(categoria)
}
