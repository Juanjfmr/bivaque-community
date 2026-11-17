// CONTRATO DO SET DE ÍCONES — EXP-NATIVO-001 (gpt-6.1-terra) substitui a implementação.
// A API (NomeIcone, IconeProps, Icone) é fixa: as telas importam só daqui.
// Implementação provisória: lucide, até o set próprio em SVG chegar.
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Bookmark,
  BookOpen,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Heart,
  Home,
  type LucideIcon,
  MapPin,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  User,
  Users,
  UsersRound,
  X,
  Building2,
  Moon,
  LogOut,
} from "lucide-react-native"
import type { ColorValue } from "react-native"

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

const PROVISORIO: Record<NomeIcone, LucideIcon> = {
  inicio: Home,
  comunidade: MessagesSquare,
  criar: Plus,
  mercado: ShoppingBag,
  voce: User,
  conversas: MessageCircle,
  busca: Search,
  avisos: Bell,
  voltar: ArrowLeft,
  fechar: X,
  mais: MoreHorizontal,
  util: Heart,
  comentar: MessageCircle,
  compartilhar: Share2,
  salvar: Bookmark,
  local: MapPin,
  evento: Calendar,
  foto: Camera,
  enviar: Send,
  filtro: SlidersHorizontal,
  imovel: Building2,
  desapego: ShoppingBag,
  negocio: Store,
  guia: BookOpen,
  grupo: Users,
  familia: UsersRound,
  ajustes: Settings,
  confirmar: Check,
  alerta: AlertTriangle,
  editar: Pencil,
  sair: LogOut,
  tema: Moon,
  avancar: ChevronRight,
}

export function Icone({ nome, tamanho = 24, cor = "currentColor", ativo = false }: IconeProps) {
  const Componente = PROVISORIO[nome]
  return <Componente size={tamanho} color={cor} strokeWidth={ativo ? 2.25 : 1.75} />
}
