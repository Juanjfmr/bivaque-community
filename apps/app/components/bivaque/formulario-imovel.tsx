"use client"

import { useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  type RascunhoImovel,
  salvarRascunhoImovel,
} from "@/lib/rascunhos-imoveis"

export function FormularioImovel({
  aberto,
  cidade,
  aoFechar,
  aoSalvar,
}: {
  readonly aberto: boolean
  readonly cidade: string
  readonly aoFechar: () => void
  readonly aoSalvar: (rascunho: RascunhoImovel) => void
}) {
  const [titulo, setTitulo] = useState("")
  const [tipo, setTipo] = useState("apartamento")
  const [finalidade, setFinalidade] = useState("aluguel")
  const [bairro, setBairro] = useState("")
  const [preco, setPreco] = useState("")
  const [quartos, setQuartos] = useState("2")
  const [area, setArea] = useState("")
  const [vagas, setVagas] = useState("1")
  const [descricao, setDescricao] = useState("")
  const [erro, setErro] = useState("")

  function salvar() {
    const valor = Number(preco.replace(",", "."))
    const metragem = Number(area.replace(",", "."))
    const quantidadeDeQuartos = Number(quartos)
    const quantidadeDeVagas = Number(vagas)
    const rascunho = salvarRascunhoImovel(cidade, {
      titulo,
      tipo: tipo === "casa" ? "casa" : "apartamento",
      finalidade: finalidade === "venda" ? "venda" : "aluguel",
      bairro,
      preco: valor,
      quartos: quantidadeDeQuartos,
      area: metragem,
      vagas: quantidadeDeVagas,
      descricao,
    })
    if (rascunho === null) {
      setErro("Confira título, bairro, preço, metragem e quantidades. O armazenamento desta sessão precisa estar disponível.")
      return
    }
    setErro("")
    setTitulo("")
    setBairro("")
    setPreco("")
    setArea("")
    setDescricao("")
    aoSalvar(rascunho)
  }

  return (
    <Dialog open={aberto} onOpenChange={(novo) => { if (!novo) aoFechar() }}>
      <DialogContent
        unstyled
        data-fluxo="rascunho-imovel"
        aria-describedby="rascunho-imovel-descricao"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[90dvh] w-full max-w-xl gap-3 overflow-y-auto rounded-t-2xl border border-(--outline-variant) bg-(--surface-lowest) p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl sm:p-6"
      >
        <DialogTitle className="pr-12 text-xl">Anunciar imóvel</DialogTitle>
        <DialogDescription id="rascunho-imovel-descricao">
          Crie um rascunho para revisar seu imóvel em {cidade}. Nesta demonstração, nada é publicado nem enviado a outros usuários.
        </DialogDescription>
        <form
          data-formulario="imovel"
          className="grid gap-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            salvar()
          }}
        >
          <Campo
            id="imovel-titulo"
            rotulo="Título"
            valor={titulo}
            aoMudar={setTitulo}
            minLength={10}
            maxLength={100}
            required
            placeholder="Apartamento com 3 quartos na Ponta Negra"
          />
          <div className="grid grid-cols-2 gap-3">
            <Selecao
              id="imovel-tipo"
              rotulo="Tipo"
              valor={tipo}
              aoMudar={setTipo}
              opcoes={[{ valor: "apartamento", titulo: "Apartamento" }, { valor: "casa", titulo: "Casa" }]}
            />
            <Selecao
              id="imovel-finalidade"
              rotulo="Finalidade"
              valor={finalidade}
              aoMudar={setFinalidade}
              opcoes={[{ valor: "aluguel", titulo: "Aluguel" }, { valor: "venda", titulo: "Venda" }]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="imovel-bairro"
              rotulo="Bairro"
              valor={bairro}
              aoMudar={setBairro}
              minLength={2}
              maxLength={80}
              required
              placeholder="Ex.: Flores"
            />
            <Campo
              id="imovel-preco"
              rotulo={finalidade === "aluguel" ? "Aluguel por mês (R$)" : "Valor de venda (R$)"}
              valor={preco}
              aoMudar={setPreco}
              inputMode="decimal"
              type="number"
              min="1"
              step="0.01"
              required
              placeholder="3200"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Campo
              id="imovel-quartos"
              rotulo="Quartos"
              valor={quartos}
              aoMudar={setQuartos}
              type="number"
              inputMode="numeric"
              min="0"
              max="30"
              step="1"
              required
            />
            <Campo
              id="imovel-area"
              rotulo="Área (m²)"
              valor={area}
              aoMudar={setArea}
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              required
            />
            <Campo
              id="imovel-vagas"
              rotulo="Vagas"
              valor={vagas}
              aoMudar={setVagas}
              type="number"
              inputMode="numeric"
              min="0"
              max="20"
              step="1"
              required
            />
          </div>
          <Campo
            id="imovel-descricao"
            rotulo="Descrição (opcional)"
            valor={descricao}
            aoMudar={setDescricao}
            area
            nota="Evite número do apartamento, documentos e telefone. Esses dados não são necessários para este rascunho."
          />
          {erro === "" ? null : <p role="alert" className="text-sm text-(--destructive)">{erro}</p>}
          <p className="text-xs text-(--on-surface-variant)">
            Rascunhos ficam apenas nesta aba do navegador. Fotos, contato e publicação real ainda não estão disponíveis.
          </p>
          <div className="flex justify-end gap-2">
            <Botao type="button" tom="texto" onClick={aoFechar}>Cancelar</Botao>
            <Botao type="submit" data-acao="salvar-rascunho-imovel">Salvar rascunho</Botao>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
