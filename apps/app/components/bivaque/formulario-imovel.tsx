"use client"

import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import { publicarImovel } from "@/lib/dados/mercado"
import { errosDoImovel } from "@/src/criar/formularios"

/**
 * Anunciar imóvel (F06): a folha publica de verdade. O corpo fala a língua do
 * formulário de Moradia da web (`title`, `deal`, `propertyType`…), o servidor
 * valida com a mesma régua e a pessoa já vê o anúncio publicado. O erro preserva
 * o que foi digitado; nenhum campo ou anúncio é inventado na tela.
 */

const VAZIO = {
  titulo: "",
  tipo: "apartamento",
  finalidade: "aluguel",
  bairro: "",
  valor: "",
  quartos: "2",
  vagas: "1",
  area: "",
  endereco: "",
  descricao: "",
}

export function FormularioImovel({
  aberto,
  cidade,
  aoFechar,
  aoSalvar,
}: {
  readonly aberto: boolean
  readonly cidade: string
  readonly aoFechar: () => void
  readonly aoSalvar: (id: string) => void
}) {
  const [dados, setDados] = useState(VAZIO)
  const [erro, setErro] = useState("")
  const [salvando, setSalvando] = useState(false)
  const controle = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      controle.current?.abort()
    },
    [],
  )

  const erros = errosDoImovel(dados)
  const mudar = (pedaco: Partial<typeof dados>): void =>
    setDados((atual) => ({ ...atual, ...pedaco }))

  async function publicar() {
    if (controle.current) return
    const primeiro = Object.values(erros).find((mensagem) => mensagem !== undefined)
    if (primeiro !== undefined) {
      setErro(primeiro)
      return
    }
    const envio = new AbortController()
    controle.current = envio
    setSalvando(true)
    setErro("")
    try {
      const id = await publicarImovel(
        {
          title: dados.titulo,
          deal: dados.finalidade === "venda" ? "sale" : "rent",
          propertyType: dados.tipo === "casa" ? "house" : "apartment",
          valor: dados.valor,
          bedrooms: dados.quartos,
          vagas: dados.vagas,
          areaM2: dados.area,
          description: dados.descricao,
          neighborhood: dados.bairro,
          address: dados.endereco,
        },
        { signal: envio.signal },
      )
      if (envio.signal.aborted) return
      setDados(VAZIO)
      aoSalvar(id)
    } catch (falha) {
      if (!envio.signal.aborted) {
        setErro(
          falha instanceof FalhaDaApi && falha.codigo === "sem-sessao"
            ? "Sua sessão expirou. Entre de novo para publicar. Os campos foram mantidos."
            : falha instanceof FalhaDaApi && falha.mensagem
              ? falha.mensagem
              : "Não foi possível publicar o imóvel. Os campos foram mantidos. Tente de novo.",
        )
      }
    } finally {
      controle.current = null
      if (!envio.signal.aborted) setSalvando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novo) => {
        if (!novo && !salvando) aoFechar()
      }}
    >
      <DialogContent
        unstyled
        data-fluxo="rascunho-imovel"
        aria-describedby="rascunho-imovel-descricao"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[90dvh] w-full max-w-xl gap-3 overflow-y-auto rounded-t-2xl border border-(--outline-variant) bg-(--surface-lowest) p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl sm:p-6"
      >
        <DialogTitle className="pr-12 text-xl">Anunciar imóvel</DialogTitle>
        <DialogDescription id="rascunho-imovel-descricao">
          Descreva o imóvel e publique: ele aparece para a cidade de {cidade} assim que você
          publicar.
        </DialogDescription>
        <form
          data-formulario="imovel"
          className="grid gap-3"
          aria-busy={salvando}
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            void publicar()
          }}
        >
          <Campo
            id="imovel-titulo"
            rotulo="Título"
            valor={dados.titulo}
            aoMudar={(titulo) => mudar({ titulo })}
            maxLength={120}
            required
            placeholder="Apartamento com 3 quartos na Ponta Negra"
          />
          <div className="grid grid-cols-2 gap-3">
            <Selecao
              id="imovel-tipo"
              rotulo="Tipo"
              valor={dados.tipo}
              aoMudar={(tipo) => mudar({ tipo })}
              opcoes={[
                { valor: "apartamento", titulo: "Apartamento" },
                { valor: "casa", titulo: "Casa" },
              ]}
            />
            <Selecao
              id="imovel-finalidade"
              rotulo="Finalidade"
              valor={dados.finalidade}
              aoMudar={(finalidade) => mudar({ finalidade })}
              opcoes={[
                { valor: "aluguel", titulo: "Aluguel" },
                { valor: "venda", titulo: "Venda" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="imovel-bairro"
              rotulo="Bairro"
              valor={dados.bairro}
              aoMudar={(bairro) => mudar({ bairro })}
              maxLength={80}
              required
              placeholder="Ex.: Flores"
            />
            <Campo
              id="imovel-preco"
              rotulo={
                dados.finalidade === "aluguel" ? "Aluguel por mês (R$)" : "Valor de venda (R$)"
              }
              valor={dados.valor}
              aoMudar={(valor) => mudar({ valor })}
              inputMode="numeric"
              type="number"
              min="1"
              step="1"
              required
              placeholder="3200"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Campo
              id="imovel-quartos"
              rotulo="Quartos"
              valor={dados.quartos}
              aoMudar={(quartos) => mudar({ quartos })}
              type="number"
              inputMode="numeric"
              min="0"
              max="20"
              step="1"
            />
            <Campo
              id="imovel-area"
              rotulo="Área (m²)"
              valor={dados.area}
              aoMudar={(area) => mudar({ area })}
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
            />
            <Campo
              id="imovel-vagas"
              rotulo="Vagas"
              valor={dados.vagas}
              aoMudar={(vagas) => mudar({ vagas })}
              type="number"
              inputMode="numeric"
              min="0"
              max="20"
              step="1"
            />
          </div>
          <Campo
            id="imovel-endereco"
            rotulo="Endereço (opcional)"
            valor={dados.endereco}
            aoMudar={(endereco) => mudar({ endereco })}
            maxLength={200}
            autoComplete="street-address"
            nota="Opcional. Se preencher, o endereço aparece para quem vê o anúncio."
          />
          <Campo
            id="imovel-descricao"
            rotulo="Descrição (opcional)"
            valor={dados.descricao}
            aoMudar={(descricao) => mudar({ descricao })}
            area
            nota="Evite número do apartamento, documentos e telefone."
          />
          {erro === "" ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Botao type="button" tom="texto" disabled={salvando} onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" data-acao="publicar-imovel" disabled={salvando}>
              {salvando ? "Publicando…" : "Publicar imóvel"}
            </Botao>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
