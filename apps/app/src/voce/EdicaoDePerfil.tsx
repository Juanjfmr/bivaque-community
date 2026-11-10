"use client"

import { useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Secao } from "@/components/bivaque/secao"
import type { PerfilDaPessoa } from "@/lib/dados/voce"

/** Os oito dígitos de um CEP completo, ou `null` enquanto não fecha. */
export function digitosDoCep(texto: string): string | null {
  const digitos = texto.replace(/[^0-9]/g, "")
  return digitos.length === 8 ? digitos : null
}

/** A máscara `00000-000` enquanto se digita; campo vazio continua vazio. */
export function mascararCep(texto: string): string {
  const digitos = texto.replace(/[^0-9]/g, "").slice(0, 8)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}

/**
 * A edição do próprio perfil (F10): nome, apresentação e o CEP opcional.
 *
 * O CEP não aparece para outras pessoas: ele só calcula a distância até o
 * bairro, do lado do servidor. O formulário não conhece HTTP — quem grava é a
 * tela, com `salvarPerfil` e `salvarLocalizacao`; aqui só se coleta o texto e
 * se mostra o que o servidor respondeu.
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
  readonly aoSalvar: (dados: { nome: string; bio: string; cep: string | null }) => void
  readonly aoCancelar: () => void
}) {
  const [nome, setNome] = useState(perfil.nome)
  const [bio, setBio] = useState(perfil.bio ?? "")
  const [cep, setCep] = useState(perfil.localizacao.cep ?? "")

  return (
    <Secao titulo="Editar perfil">
      <form
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          aoSalvar({ nome, bio, cep: digitosDoCep(cep) })
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
        <Campo
          id="perfil-cep"
          rotulo="CEP"
          valor={cep}
          aoMudar={(texto) => setCep(mascararCep(texto))}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          nota="Opcional. O CEP só calcula a distância até o seu bairro e não aparece para outras pessoas."
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
