import type { ReactNode } from "react"
import { useEffect } from "react"
import { AccessibilityInfo, Pressable, type PressableProps, Text, View } from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { MotiView } from "moti"
import { Canvas, Circle, LinearGradient, Rect, vec } from "@shopify/react-native-skia"
import LottieView from "lottie-react-native"
import { Path, Svg } from "react-native-svg"
import { useColorScheme } from "nativewind"
import * as Haptics from "expo-haptics"
import { HEX, THEME } from "../../lib/theme"
import { usarReduzirMovimento } from "./reduzir-movimento"

const carregando = require("../../assets/lottie/carregando.json")
const sucesso = require("../../assets/lottie/sucesso.json")
const vazio = require("../../assets/lottie/vazio.json")

export interface PressionavelProps extends Omit<PressableProps, "children"> {
  children: ReactNode
  /** Vibração leve ao tocar (expo-haptics). */
  haptico?: boolean
  className?: string
}

/** Toque com escala de mola (Reanimated) e háptico. Base de botões e cartões. */
export function Pressionavel({ children, haptico = false, onPressIn, onPressOut, ...resto }: PressionavelProps) {
  const { style, ...props } = resto
  const reduzir = usarReduzirMovimento()
  const escala = useSharedValue(1)
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }))
  return (
    <Animated.View style={[estilo, typeof style === "function" ? undefined : style]}>
      <Pressable
        {...props}
        style={{ flex: 1 }}
        onPressIn={(event) => {
          escala.value = reduzir ? 1 : withSpring(0.97, { damping: 18, stiffness: 300 })
          if (haptico) void Haptics.selectionAsync()
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          escala.value = reduzir ? 1 : withSpring(1, { damping: 18, stiffness: 300 })
          onPressOut?.(event)
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}

export interface ChipProps {
  rotulo: string
  ativo: boolean
  aoAlternar: (ativo: boolean) => void
}

/** Chip de filtro: estado ligado/desligado animado (Rive quando houver .riv; senão Moti). */
export function Chip({ rotulo, ativo, aoAlternar }: ChipProps) {
  const reduzir = usarReduzirMovimento()
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"
  return (
    <MotiView
      animate={{ backgroundColor: ativo ? THEME[esquema].primary : THEME[esquema].muted, scale: ativo ? 1 : 0.98 }}
      transition={{ type: "timing", duration: reduzir ? 0 : 220 }}
      style={{ borderRadius: 999 }}
    >
      <Pressable hitSlop={4} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => aoAlternar(!ativo)} style={{ minHeight: 44, paddingHorizontal: 16, justifyContent: "center" }}>
        <Text style={{ color: ativo ? HEX[esquema].primaryForeground : THEME[esquema].foreground }}>{rotulo}</Text>
      </Pressable>
    </MotiView>
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
export function BotaoAcao({ rotulo, estado, aoPressionar, variante = "acao" }: BotaoAcaoProps) {
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"
  const reduzir = usarReduzirMovimento()
  const tremor = useSharedValue(0)
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateX: tremor.value }] }))
  useEffect(() => {
    if (estado === "feito") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    if (estado === "erro") {
      tremor.value = reduzir ? 0 : withSequence(withTiming(-5, { duration: 45 }), withRepeat(withTiming(5, { duration: 45 }), 3, true), withTiming(0, { duration: 45 }))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }, [estado, reduzir, tremor])
  const brasa = variante === "brasa"
  const fundo = brasa ? THEME[esquema].brasa : THEME[esquema].primary
  const cor = brasa ? HEX[esquema].brasaForeground : HEX[esquema].primaryForeground
  const rotuloAtual = estado === "enviando" ? "Enviando" : estado === "erro" ? "Tentar de novo" : estado === "feito" ? "Concluído" : rotulo
  return (
    <Animated.View style={estilo}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: estado === "enviando", disabled: estado === "enviando" }}
        onPress={aoPressionar}
        disabled={estado === "enviando"}
        style={{ height: 48, borderRadius: 999, backgroundColor: fundo, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }}
      >
        {estado === "enviando" ? <ActivityDots cor={cor} reduzir={reduzir} /> : estado === "feito" ? <Check cor={cor} /> : null}
        <Text style={{ color: cor, fontWeight: "600" }}>{rotuloAtual}</Text>
      </Pressable>
    </Animated.View>
  )
}

function ActivityDots({ cor, reduzir }: { cor: string; reduzir: boolean }) {
  return <View style={{ flexDirection: "row", gap: 3 }}>{[0, 1, 2].map((i) => <ActivityDot key={i} cor={cor} atraso={i * 180} reduzir={reduzir} />)}</View>
}
function ActivityDot({ cor, atraso, reduzir }: { cor: string; atraso: number; reduzir: boolean }) {
  const opacidade = useSharedValue(0.35)
  useEffect(() => { opacidade.value = reduzir ? 1 : withRepeat(withSequence(withTiming(0.35, { duration: atraso }), withTiming(1, { duration: 350 }), withTiming(0.35, { duration: 350 })), -1, false) }, [atraso, opacidade, reduzir])
  const estilo = useAnimatedStyle(() => ({ opacity: opacidade.value }))
  return <Animated.View style={[{ width: 6, height: 6, borderRadius: 4, backgroundColor: cor }, estilo]} />
}
function Check({ cor }: { cor: string }) {
  const progresso = useSharedValue(24)
  useEffect(() => { progresso.value = withTiming(0, { duration: 220 }) }, [progresso])
  return <Svg width={18} height={18} viewBox="0 0 18 18"><Path d="M3 9l4 4L15 5" fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="24" strokeDashoffset={progresso as never} /></Svg>
}

export interface BotaoCriarProps { aoPressionar: () => void }

/** O botão Criar da barra: Brasa, desenhado em Skia, com respiração sutil. */
export function BotaoCriar({ aoPressionar }: BotaoCriarProps) {
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"
  const reduzir = usarReduzirMovimento()
  const escala = useSharedValue(1)
  useEffect(() => {
    escala.value = reduzir ? 1 : withRepeat(withSequence(withTiming(1.03, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1, false)
  }, [reduzir, escala])
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }))
  return (
    <Animated.View style={estilo}>
      <Pressionavel accessibilityRole="button" accessibilityLabel="Criar" onPress={aoPressionar}>
        <Canvas style={{ width: 56, height: 56 }}>
          <Circle cx={28} cy={28} r={28}>
            <LinearGradient start={vec(8, 4)} end={vec(48, 52)} colors={[HEX[esquema].brasa, HEX[esquema].brasa]} />
          </Circle>
        </Canvas>
        <Text pointerEvents="none" style={{ position: "absolute", color: HEX[esquema].brasaForeground, fontSize: 30, lineHeight: 56, width: 56, textAlign: "center" }}>+</Text>
      </Pressionavel>
    </Animated.View>
  )
}

export interface CarregandoProps { rotulo?: string }

/** Carregamento de assinatura (Lottie "carregando"; respeita reduzir movimento). */
export function Carregando({ rotulo = "Carregando" }: CarregandoProps) {
  const reduzir = usarReduzirMovimento()
  return <View accessibilityLabel={rotulo}><LottieView source={carregando} autoPlay={!reduzir} loop={!reduzir} style={{ width: 48, height: 24 }} /></View>
}

export interface EsqueletoProps { largura: number | `${number}%`; altura: number; raio?: number }

/** Esqueleto com brilho desenhado em Skia. */
export function Esqueleto({ largura, altura, raio = 12 }: EsqueletoProps) {
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"
  const reduzir = usarReduzirMovimento()
  const deslocamento = useSharedValue(-100)
  useEffect(() => { deslocamento.value = reduzir ? -100 : withRepeat(withTiming(240, { duration: 1200, easing: Easing.linear }), -1, false) }, [reduzir, deslocamento])
  const brilho = useAnimatedStyle(() => ({ transform: [{ translateX: deslocamento.value }] }))
  return (
    <View style={{ width: largura, height: altura, borderRadius: raio, overflow: "hidden", backgroundColor: THEME[esquema].muted }}>
      {!reduzir ? <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, bottom: 0, width: 100 }, brilho]}><Canvas style={{ flex: 1 }}><Rect x={0} y={0} width={100} height={altura}><LinearGradient start={vec(0, 0)} end={vec(100, 0)} colors={["transparent", HEX[esquema].card, "transparent"]} /></Rect></Canvas></Animated.View> : null}
    </View>
  )
}

export type NomeIlustracao = "vazio-conversas" | "vazio-mercado" | "vazio-comunidade" | "boas-vindas" | "sem-conexao" | "publicado"
export interface EstadoVazioProps { ilustracao: NomeIlustracao; titulo: string; texto: string; acao?: { rotulo: string; aoPressionar: () => void } }

/** Tela vazia: ilustração Lottie provisória + entrada animada (Moti) + ação opcional. */
export function EstadoVazio({ titulo, texto, acao }: EstadoVazioProps) {
  const reduzir = usarReduzirMovimento()
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"
  return <View style={{ alignItems: "center", gap: 12, padding: 24 }}>
    <LottieView source={vazio} autoPlay={!reduzir} loop={!reduzir} style={{ width: 240, height: 180 }} />
    <Text style={{ color: THEME[esquema].foreground, fontSize: 20, fontWeight: "700", textAlign: "center", maxWidth: 300 }}>{titulo}</Text>
    <Text style={{ color: THEME[esquema].mutedForeground, fontSize: 15, textAlign: "center", maxWidth: 300 }}>{texto}</Text>
    {acao ? <BotaoAcao rotulo={acao.rotulo} estado="parado" aoPressionar={acao.aoPressionar} /> : null}
  </View>
}

export interface SucessoProps { visivel: boolean; texto: string; aoTerminar: () => void }

/** Confirmação de publicação (Lottie "sucesso" + háptico de sucesso). */
export function Sucesso({ visivel, texto, aoTerminar }: SucessoProps) {
  const reduzir = usarReduzirMovimento()
  const { colorScheme } = useColorScheme()
  const esquema = colorScheme ?? "light"
  useEffect(() => { if (visivel) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }, [visivel])
  if (!visivel) return null
  return <View accessibilityLiveRegion="polite" style={{ alignItems: "center" }}><LottieView source={sucesso} autoPlay={!reduzir} loop={false} onAnimationFinish={aoTerminar} style={{ width: 64, height: 64 }} /><Text style={{ color: THEME[esquema].foreground, fontSize: 15, textAlign: "center", maxWidth: 300 }}>{texto}</Text></View>
}

export interface EntradaProps { children: ReactNode; indice?: number }

/** Entrada escalonada de itens de lista (Moti), desligada com reduzir movimento. */
export function Entrada({ children, indice = 0 }: EntradaProps) {
  const reduzir = usarReduzirMovimento()
  const atraso = reduzir ? 0 : Math.min(Math.max(indice, 0), 7) * 40
  return <MotiView from={{ opacity: reduzir ? 1 : 0, translateY: reduzir ? 0 : 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: reduzir ? 0 : 240, delay: atraso }}>{children}</MotiView>
}
