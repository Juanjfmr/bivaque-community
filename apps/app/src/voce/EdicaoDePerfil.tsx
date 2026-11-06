"use client"

import { useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import type { PerfilDaPessoa } from "@/lib/dados/voce"

/**
 * A edição do próprio perfil (F10): nome e apresentação, os dois campos que a
 * web antiga editava. O formulário não conhece HTTP — quem grava é a tela, com
 * `salvarPerfil`; aqui só se coleta o texto e se mostra o que o servidor
 * respondeu.
 */
export function EdicaoDePerfil({
  perfil,
  salvando,
  mensagem,
  aoSalvar,
  aoCancelar,
}: {
  readonly perfil: PerfilDaPessoa
  readonly salvando: boolean
  readonly mensagem: string | null
  readonly aoSalvar: (dados: { nome: string; bio: string }) => void
  readonly aoCancelar: () => void
}) {
  const [nome, setNome] = useState(perfil.nome)
  const [bio, setBio] = useState(perfil.bio ?? "")

  return (
    <Secao titulo="Editar perfil">
      <form
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          aoSalvar({ nome, bio })
        }}
      >
        <Campo id="perfil-nome" rotulo="Nome" valor={nome} aoMudar={setNome} autoComplete="name" />
        <Campo
          id="perfil-bio"
          rotulo="Apresentação"
          valor={bio}
          aoMudar={setBio}
          area
          nota="Até 300 caracteres. Esvaziar apaga a apresentação."
        />
        {mensagem === null ? null : (
          <p role="alert" className="text-sm text-(--destructive)">
            {mensagem}
          </p>
        )}
        <div className="flex items-center justify-end gap-2">
          <Botao tom="texto" type="button" onClick={aoCancelar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </div>
      </form>
    </Secao>
  )
}
