"use client"

import { Modal, SearchField } from "@heroui/react"
import type { ComponentProps } from "react"

// RÓTULO DE FECHAR EM PORTUGUÊS — a lacuna que o wrapper do HeroUI abre.
//
// ORIGEM (medida, não suposta): `@heroui/react` fixa o nome acessível em inglês
// dentro do PRÓPRIO `CloseButton`, em
// node_modules/@heroui/react/dist/components/close-button/close-button.js:21 —
// `"aria-label": "Close"`. Não é o chamador que escreve "Close": nenhum arquivo
// deste app contém essa string. Todo componente do HeroUI que monta um
// `CloseButton` sem passar rótulo próprio herda "Close".
//
// Quem monta `CloseButton` na v3.2.3 (varredura em
// node_modules/@heroui/react/dist/components/*): modal, alert-dialog, drawer,
// search-field, tag, toast, além do próprio close-button. Destes, o app usa
// modal (12 pontos), search-field (3 pontos) e o toast. `tag` passa o próprio
// rótulo ("Remove tag", também em inglês) e alert-dialog/drawer não são usados.
//
// O QUE ESTE MÓDULO RESOLVE: como o rótulo mora no wrapper do fornecedor e o
// `...rest` do fornecedor é espalhado DEPOIS do default, um `aria-label` do
// chamador vence. Estes wrappers põem o rótulo em português como DEFAULT e
// deixam o chamador sobrescrever. Assim o caminho fácil passa a ser o caminho
// certo: um modal novo que use estes wrappers já nasce em pt-BR.
//
// LIMITE DECLARADO: o gatilho de fechar do TOAST não está aqui. O rótulo dele
// vive no template interno do `Toast.Provider` (`jsx(ToastCloseButton, {})` sem
// rótulo), e sobrescrever exige reescrever o template inteiro — indicador,
// spinner de carregamento, posição da ação no mobile — contra um
// `@heroui/react` de faixa `^3.2.3`. Reproduzir interno de fornecedor sob faixa
// de versão é troca ruim: um detalhe errado quebra o toast de sucesso da
// publicação. Fica relatado como pendência, com o caminho concreto.

/** Gatilho de fechar de modal. O nome acessível default é "Fechar". */
export function ModalCloseTrigger({
  className,
  ...rest
}: ComponentProps<typeof Modal.CloseTrigger>) {
  return <Modal.CloseTrigger aria-label="Fechar" {...(className ? { className } : {})} {...rest} />
}

/** Botão de limpar do campo de busca. O nome acessível default é
 *  "Limpar busca" — o mesmo verbo que o /recommendations já usa em
 *  "Limpar busca do Guia". "Close" era, além de inglês, semanticamente errado
 *  para um botão que apaga o termo digitado. */
export function SearchClearButton({
  className,
  ...rest
}: ComponentProps<typeof SearchField.ClearButton>) {
  return (
    <SearchField.ClearButton
      aria-label="Limpar busca"
      {...(className ? { className } : {})}
      {...rest}
    />
  )
}
