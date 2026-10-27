"use client"

import { useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { criarRascunhoCriacao, DEFINICOES_CRIAR, type TipoRascunho } from "@/lib/rascunhos-criacao"

export function FormularioDeCriacao({
  tipo,
  cidade,
  aoCancelar,
  aoConcluir,
}: {
  readonly tipo: TipoRascunho
  readonly cidade: string
  readonly aoCancelar: () => void
  readonly aoConcluir: () => void
}) {
  const definicao = DEFINICOES_CRIAR[tipo]
  const [titulo, setTitulo] = useState("")
  const [complemento, setComplemento] = useState("")
  const [descricao, setDescricao] = useState("")
  const [valor, setValor] = useState("")
  const [horario, setHorario] = useState("")
  const [erro, setErro] = useState("")

  return (
    <div data-formulario-criacao={tipo} className="grid min-w-0 gap-3">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{definicao.titulo}</h2>
        <p className="text-sm text-(--on-surface-variant)">{definicao.contexto}</p>
      </header>
      <form
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          const item = criarRascunhoCriacao(cidade, tipo, {
            titulo,
            complemento,
            descricao,
            valor: valor.trim() === "" ? null : Number(valor),
            horario: horario.trim() === "" ? null : horario,
          })
          if (item === "limite") {
            setErro(
              "Limite de 30 rascunhos atingido. Exclua um rascunho antes de salvar outro. Os anteriores foram preservados.",
            )
            return
          }
          if (item === null) {
            setErro("Verifique os dados e se o armazenamento da sessão está disponível.")
            return
          }
          setErro("")
          aoConcluir()
        }}
      >
        <Campo
          id="criacao-titulo"
          rotulo={definicao.principal}
          valor={titulo}
          aoMudar={setTitulo}
          placeholder={definicao.exemplo}
          minLength={5}
          maxLength={120}
          required
        />
        <Campo
          id="criacao-complemento"
          rotulo={definicao.secundario}
          valor={complemento}
          aoMudar={setComplemento}
          maxLength={100}
          required
        />
        {tipo === "create-item" ? (
          <Campo
            id="criacao-preco"
            rotulo="Preço pedido (R$)"
            valor={valor}
            aoMudar={setValor}
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            required
          />
        ) : null}
        {tipo === "create-event" ? (
          <Campo
            id="criacao-horario"
            rotulo="Dia e horário"
            valor={horario}
            aoMudar={setHorario}
            type="datetime-local"
            required
          />
        ) : null}
        <Campo
          id="criacao-descricao"
          rotulo={definicao.detalhe}
          valor={descricao}
          aoMudar={setDescricao}
          area
          nota="Informe ao menos 10 caracteres. Evite documentos pessoais, telefones e endereços privados."
        />
        {erro !== "" ? (
          <p role="alert" className="text-sm text-(--destructive)">
            {erro}
          </p>
        ) : null}
        <p className="text-xs text-(--on-surface-variant)">
          Apenas rascunho local de {cidade}. Nada será enviado a outros membros.
        </p>
        <div className="flex justify-end gap-2">
          <Botao type="button" tom="texto" onClick={aoCancelar}>
            Voltar
          </Botao>
          <Botao type="submit" data-acao="salvar-rascunho-criacao">
            Salvar rascunho
          </Botao>
        </div>
      </form>
    </div>
  )
}
