import type { ComponentType } from "react"
import {
  Avisos,
  Combinado,
  Documento,
  InteressesEGrupos,
  PreviaDaCidade,
  Verificacao,
} from "./etapas-comunidade"
import {
  Aceite,
  CidadeEMomento,
  Codigo,
  Cpf,
  Email,
  Nome,
  Porta,
  type PropsDaEtapa,
} from "./etapas-conta"
import type { IdDaEtapa } from "./fluxo"

/**
 * O mapa etapa → tela da entrada. Compartilhado pela prévia de design e pela
 * tela de produção (`src/entrada/TelaDeEntrada.tsx`), para que as duas rodem a
 * mesma máquina de estados e o mesmo visual aprovado — só a fonte de dados muda.
 * A etapa `inicio` não está aqui: cada uma resolve o fim do fluxo do seu jeito.
 */
export const TELAS_DA_ENTRADA: Record<Exclude<IdDaEtapa, "inicio">, ComponentType<PropsDaEtapa>> = {
  porta: Porta,
  email: Email,
  codigo: Codigo,
  aceite: Aceite,
  cpf: Cpf,
  nome: Nome,
  cidade: CidadeEMomento,
  verificacao: Verificacao,
  documento: Documento,
  "previa-cidade": PreviaDaCidade,
  interesses: InteressesEGrupos,
  combinado: Combinado,
  avisos: Avisos,
}
