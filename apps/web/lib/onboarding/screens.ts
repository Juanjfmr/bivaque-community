import type { DocumentSituation } from "./document-status"

/**
 * PORT-004 (lote 4, frente B): qual tela cada situação da entrada abre, e qual
 * forma o envio de documento assume. Fica aqui, e não dentro das páginas, para
 * a decisão ser medida sem navegador — foi o que a revisão independente pediu:
 * a recusa da análise manual estava caindo no resultado da consulta porque a
 * página desviava antes de ler o documento.
 *
 * A fonte é `renderEntryPending` e `renderEntryResult` de
 * prototypes/bivaque-html/src/features/entry/account.js. O protótipo guarda o
 * estado no aparelho (`e.asked`, `e.doc`); aqui o estado vem do banco:
 * `read_verification_status` diz o resultado e `readDocumentStatus` diz o que
 * aconteceu com o arquivo.
 */

export type StatusScreen =
  | { screen: "locality" }
  | { screen: "result" }
  | { screen: "pending"; askedForReplacement: boolean }

export interface StatusScreenInput {
  /** `read_verification_status`: pending, verified, rejected, temporary_error ou null. */
  status: string | null
  /** O que `readDocumentStatus` leu do último documento da pessoa. */
  document: DocumentSituation
}

export function statusScreen({ status, document }: StatusScreenInput): StatusScreen {
  if (status === "verified") return { screen: "locality" }

  // A recusa da análise manual não é "não localizamos o vínculo": quem recusou
  // foi a equipe, sobre um arquivo, e o caminho de recuperação é enviar outro.
  // O resultado `rejected` sem documento é a recusa da fonte oficial, e essa
  // continua sendo o resultado da consulta.
  if (document === "needs_replacement" && (status === "pending" || status === "rejected")) {
    return { screen: "pending", askedForReplacement: true }
  }

  if (status === "pending") return { screen: "pending", askedForReplacement: false }

  // rejected sem documento, temporary_error e a ausência de resultado voltam ao
  // resultado da consulta, que é onde `entryNext()` do protótipo os coloca.
  return { screen: "result" }
}

export type DocumentFormMode = "upload" | "replace" | "in-review"

/**
 * A forma do bloco de arquivo. `replace` é a recusa manual (a equipe pediu
 * outro arquivo); `in-review` é a troca enquanto a análise corre, que o
 * protótipo oferece com "Enviar outro documento" na própria análise pendente.
 * Um documento aprovado não se envia de novo — a página desvia antes.
 */
export function documentFormMode(situation: DocumentSituation): DocumentFormMode {
  if (situation === "needs_replacement") return "replace"
  if (situation === "in_review") return "in-review"
  return "upload"
}
