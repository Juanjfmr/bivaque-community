import type { ReactNode } from "react"
import Svg, { Circle, Path, Rect } from "react-native-svg"
import type { NomeIlustracao } from "@/components/motion"

const CENAS: Record<NomeIlustracao, ReactNode> = {
  "vazio-conversas": (
    <>
      <Rect x="29" y="148" width="182" height="6" rx="3" fill="#9CAAB2" />
      <Rect x="38" y="105" width="164" height="10" rx="4" fill="#26424F" />
      <Rect x="51" y="115" width="8" height="33" rx="4" fill="#9CAAB2" />
      <Rect x="181" y="115" width="8" height="33" rx="4" fill="#9CAAB2" />
      <Rect x="70" y="78" width="33" height="27" rx="4" fill="#DEE3E6" />
      <Rect x="137" y="78" width="33" height="27" rx="4" fill="#DEE3E6" />
      <Path d="M103 84h7v12h-7v-5h3v-3h-3z" fill="#B84A3A" />
      <Path d="M170 84h7v12h-7v-5h3v-3h-3z" fill="#B84A3A" />
      <Path d="M81 69c-7-8 7-10 0-18M148 69c-7-8 7-10 0-18" fill="#9CAAB2" />
    </>
  ),
  "vazio-mercado": (
    <>
      <Rect x="29" y="148" width="182" height="6" rx="3" fill="#9CAAB2" />
      <Path d="M63 86h114v62H63z" fill="#DEE3E6" />
      <Path d="M63 86 43 66h57l20 20z" fill="#9CAAB2" />
      <Path d="M177 86l20-20h-57l-20 20z" fill="#9CAAB2" />
      <Path d="M63 86h114l-20 20H83z" fill="#26424F" />
      <Path d="M120 112h35l13 13-17 17-31-22z" fill="#B84A3A" />
      <Circle cx="130" cy="119" r="3" fill="#DEE3E6" />
    </>
  ),
  "vazio-comunidade": (
    <>
      <Rect x="29" y="148" width="182" height="6" rx="3" fill="#9CAAB2" />
      <Rect x="42" y="115" width="65" height="7" rx="4" fill="#26424F" />
      <Rect x="45" y="125" width="59" height="7" rx="4" fill="#9CAAB2" />
      <Rect x="49" y="132" width="5" height="16" rx="4" fill="#26424F" />
      <Rect x="96" y="132" width="5" height="16" rx="4" fill="#26424F" />
      <Rect x="133" y="115" width="65" height="7" rx="4" fill="#26424F" />
      <Rect x="136" y="125" width="59" height="7" rx="4" fill="#9CAAB2" />
      <Rect x="140" y="132" width="5" height="16" rx="4" fill="#26424F" />
      <Rect x="187" y="132" width="5" height="16" rx="4" fill="#26424F" />
      <Path d="M52 43h54v39H79L65 94V82H52z" fill="#DEE3E6" />
      <Path d="M130 55h57v39h-8v12l-15-12h-34z" fill="#B84A3A" />
      <Rect x="63" y="56" width="31" height="4" rx="2" fill="#9CAAB2" />
      <Rect x="141" y="68" width="34" height="4" rx="2" fill="#DEE3E6" />
    </>
  ),
  "boas-vindas": (
    <>
      <Rect x="29" y="148" width="182" height="6" rx="3" fill="#9CAAB2" />
      <Path d="M43 145 120 49l77 96z" fill="#DEE3E6" />
      <Path d="M43 145 120 49v96z" fill="#9CAAB2" />
      <Path d="M91 145l29-47 29 47z" fill="#26424F" />
      <Path d="M120 49l77 96h-9L120 61 52 145h-9z" fill="#B84A3A" />
      <Path d="M183 29l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#B84A3A" />
      <Circle cx="59" cy="46" r="4" fill="#9CAAB2" />
    </>
  ),
  "sem-conexao": (
    <>
      <Rect x="29" y="148" width="182" height="6" rx="3" fill="#9CAAB2" />
      <Path d="M64 105a23 23 0 0 1 10-44 37 37 0 0 1 70-4 25 25 0 1 1 12 48z" fill="#DEE3E6" />
      <Path d="M85 91a50 50 0 0 1 70 0l-7 7a40 40 0 0 0-56 0z" fill="#26424F" />
      <Path d="M100 107a29 29 0 0 1 40 0l-7 7a19 19 0 0 0-26 0z" fill="#26424F" />
      <Circle cx="120" cy="122" r="5" fill="#26424F" />
      <Path d="M59 40l6-6 116 108-6 6z" fill="#B84A3A" />
    </>
  ),
  publicado: (
    <>
      <Rect x="29" y="148" width="182" height="6" rx="3" fill="#9CAAB2" />
      <Rect x="45" y="56" width="150" height="85" rx="8" fill="#DEE3E6" />
      <Path d="M45 66l75 54 75-54v11l-75 54-75-54z" fill="#9CAAB2" />
      <Path
        d="M45 135l52-41 7 6-47 41H53a8 8 0 0 1-8-6zM195 135l-52-41-7 6 47 41h4a8 8 0 0 0 8-6z"
        fill="#26424F"
      />
      <Circle cx="177" cy="54" r="25" fill="#B84A3A" />
      <Path d="M164 54l9 9 18-20 5 5-23 25-14-14z" fill="#DEE3E6" />
    </>
  ),
}

export function Ilustracao({ nome, largura = 240 }: { nome: NomeIlustracao; largura?: number }) {
  return (
    <Svg width={largura} height={largura * 0.75} viewBox="0 0 240 180">
      {CENAS[nome]}
    </Svg>
  )
}
