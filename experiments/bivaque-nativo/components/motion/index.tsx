// CONTRATO DO MOVIMENTO DE ASSINATURA — EXP-NATIVO-002 (gpt-6-luna) substitui a implementação.
// As assinaturas exportadas são fixas: as telas importam só daqui.
// Implementação provisória: sem animação, só para as telas compilarem.
import type { ReactNode } from "react"
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from "react-native"

export interface PressionavelProps extends Omit<PressableProps, "children"> {
  children: ReactNode
  /** Vibração leve ao tocar (expo-haptics). */
  haptico?: boolean
  className?: string
}

/** Toque com escala de mola (Reanimated) e háptico. Base de botões e cartões. */
export function Pressionavel({ children, haptico: _h, ...resto }: PressionavelProps) {
  return <Pressable {...resto}>{children}</Pressable>
}

export interface ChipProps {
  rotulo: string
  ativo: boolean
  aoAlternar: (ativo: boolean) => void
}

/** Chip de filtro: estado ligado/desligado animado (Rive quando houver .riv; senão Moti). */
export function Chip({ rotulo, ativo, aoAlternar }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={() => aoAlternar(!ativo)}
    >
      <Text>{rotulo}</Text>
    </Pressable>
  )
}

export type EstadoBotao = "parado" | "enviando" | "feito" | "erro"

export interface BotaoAcaoProps {
  rotulo: string
  estado: EstadoBotao
  aoPressionar: () => void
  variante?: "acao" | "brasa"
}

/** Botão principal com estados animados (Rive state machine "botao"; fallback Reanimated). */
export function BotaoAcao({ rotulo, estado, aoPressionar }: BotaoAcaoProps) {
  return (
    <Pressable accessibilityRole="button" onPress={aoPressionar} disabled={estado === "enviando"}>
      <Text>{estado === "enviando" ? "Enviando…" : rotulo}</Text>
    </Pressable>
  )
}

export interface BotaoCriarProps {
  aoPressionar: () => void
}

/** O botão Criar da barra: Brasa, desenhado em Skia, com respiração sutil. */
export function BotaoCriar({ aoPressionar }: BotaoCriarProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Criar" onPress={aoPressionar}>
      <Text>+</Text>
    </Pressable>
  )
}

export interface CarregandoProps {
  rotulo?: string
}

/** Carregamento de assinatura (Lottie "carregando"; respeita reduzir movimento). */
export function Carregando({ rotulo = "Carregando" }: CarregandoProps) {
  return (
    <View accessibilityLabel={rotulo}>
      <ActivityIndicator />
    </View>
  )
}

export interface EsqueletoProps {
  largura: number | `${number}%`
  altura: number
  raio?: number
}

/** Esqueleto com brilho desenhado em Skia. */
export function Esqueleto({ largura, altura, raio = 12 }: EsqueletoProps) {
  return <View style={{ width: largura, height: altura, borderRadius: raio, opacity: 0.2 }} />
}

export type NomeIlustracao =
  | "vazio-conversas"
  | "vazio-mercado"
  | "vazio-comunidade"
  | "boas-vindas"
  | "sem-conexao"
  | "publicado"

export interface EstadoVazioProps {
  ilustracao: NomeIlustracao
  titulo: string
  texto: string
  acao?: { rotulo: string; aoPressionar: () => void }
}

/** Tela vazia: ilustração do set próprio + entrada animada (Moti) + ação opcional. */
export function EstadoVazio({ titulo, texto, acao }: EstadoVazioProps) {
  return (
    <View>
      <Text>{titulo}</Text>
      <Text>{texto}</Text>
      {acao ? <Text onPress={acao.aoPressionar}>{acao.rotulo}</Text> : null}
    </View>
  )
}

export interface SucessoProps {
  visivel: boolean
  texto: string
  aoTerminar: () => void
}

/** Confirmação de publicação (Lottie "sucesso" + háptico de sucesso). */
export function Sucesso({ visivel, texto }: SucessoProps) {
  return visivel ? <Text>{texto}</Text> : null
}

export interface EntradaProps {
  children: ReactNode
  /** Posição na lista, para escalonar a entrada. */
  indice?: number
}

/** Entrada escalonada de itens de lista (Moti), desligada com reduzir movimento. */
export function Entrada({ children }: EntradaProps) {
  return <View>{children}</View>
}
