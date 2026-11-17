import type { ColorValue } from "react-native"
import Svg, { Path } from "react-native-svg"

export const NOMES_ICONES = [
  "inicio",
  "comunidade",
  "criar",
  "mercado",
  "voce",
  "conversas",
  "busca",
  "avisos",
  "voltar",
  "fechar",
  "mais",
  "util",
  "comentar",
  "compartilhar",
  "salvar",
  "local",
  "evento",
  "foto",
  "enviar",
  "filtro",
  "imovel",
  "desapego",
  "negocio",
  "guia",
  "grupo",
  "familia",
  "ajustes",
  "confirmar",
  "alerta",
  "editar",
  "sair",
  "tema",
  "avancar",
] as const

export type NomeIcone = (typeof NOMES_ICONES)[number]

export interface IconeProps {
  nome: NomeIcone
  tamanho?: number
  cor?: ColorValue
  /** Ícone preenchido para o estado ativo (aba selecionada, salvo, útil marcado). */
  ativo?: boolean
}

const DESENHOS: Record<NomeIcone, string> = {
  inicio: "M3 11 12 3l9 8M5 10v9h5v-5h4v5h5v-9",
  comunidade: "M3 5h12v8H8l-3 3v-3H3zM17 7h4v9h-2v3l-4-3h-4",
  criar: "M12 4v16M4 12h16",
  mercado: "M5 8h14l1 12H4zM9 8V6a3 3 0 0 1 6 0v2",
  voce: "M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM5 20v-1a7 7 0 0 1 14 0v1z",
  conversas: "M4 4h16v12H10l-4 4v-4H4zM8 8h8M8 12h5",
  busca: "M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM14.5 14.5 20 20",
  avisos: "M5 17h14l-1.5-3V10a5.5 5.5 0 0 0-11 0v4zM10 20h4M12 3v1.5",
  voltar: "M10 5 3 12l7 7M4 12h17",
  fechar: "M5 5l14 14M19 5 5 19",
  mais: "M5 12h.01M12 12h.01M19 12h.01",
  util: "M12 20 5 13C1 9 5 4 9.5 7L12 9l2.5-2C19 4 23 9 19 13z",
  comentar: "M4 4h16v12H10l-4 4v-4H4z",
  compartilhar:
    "M8 12l8-5M8 12l8 5M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  salvar: "M6 3h12v18l-6-4-6 4z",
  local: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0zM14 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  evento: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h2m4 0h2",
  foto: "M4 7h3l2-2h6l2 2h3v12H4zM15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  enviar: "M3 4l18 8-18 8 2-7 9-1-9-1z",
  filtro:
    "M3 6h3m4 0h11M3 12h11m4 0h3M3 18h4m4 0h10M10 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM18 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM11 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  imovel: "M4 20V5h16v15zM8 9h2m4 0h2M8 13h2m4 0h2M10 20v-4h4v4",
  desapego: "M3 3h8l10 10-8 8L3 11zM8.5 7.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z",
  negocio: "M4 10v10h16V10M3 9l2-5h14l2 5-2 2-3-2-3 2-3-2-3 2zM9 20v-6h6v6",
  guia: "M12 7C10 4.5 7 4 3 4.5v13c4-.5 7 0 9 2.5 2-2.5 5-3 9-2.5v-13C17 4 14 4.5 12 7zM12 7v13",
  grupo:
    "M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM3 19v-1a6 6 0 0 1 12 0v1zM15 5a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v1h-3",
  familia:
    "M11 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM19 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM3 20v-2a5 5 0 0 1 10 0v2zM14 15a4 4 0 0 1 7 3v2h-5",
  ajustes:
    "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM10 3h4l1 3 3-1 3 4-2 3 2 3-3 4-3-1-1 3h-4l-1-3-3 1-3-4 2-3-2-3 3-4 3 1z",
  confirmar: "M4 12l5 5L20 6",
  alerta: "M12 3 21 20H3zM12 9v4m0 3v.01",
  editar: "M4 17 16 5a2 2 0 0 1 3 3L7 20H4zM14 7l3 3",
  sair: "M11 4H4v16h7M14 7l5 5-5 5M8 12h11",
  tema: "M19 15A7 7 0 0 1 9 5a8 8 0 1 0 10 10z",
  avancar: "M9 5l7 7-7 7",
}

const ATIVOS: Partial<Record<NomeIcone, string>> = {
  comunidade: "M3 5h12v8H8l-3 3v-3H3zM17 7h4v9h-2v3l-4-3h-4",
  mercado: "M5 8h14l1 12H4zM9 8V6a3 3 0 0 1 6 0v2",
  voce: "M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM5 20v-1a7 7 0 0 1 14 0v1z",
  util: "M12 20 5 13C1 9 5 4 9.5 7L12 9l2.5-2C19 4 23 9 19 13z",
  salvar: "M6 3h12v18l-6-4-6 4z",
  inicio: "M3 11 12 3l9 8h-2v9h-5v-6h-4v6H5v-9z",
}

export function Icone({ nome, tamanho = 24, cor = "currentColor", ativo = false }: IconeProps) {
  const preenchido = ativo && ATIVOS[nome]
  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={preenchido || DESENHOS[nome]} fill={preenchido ? cor : "none"} />
    </Svg>
  )
}
