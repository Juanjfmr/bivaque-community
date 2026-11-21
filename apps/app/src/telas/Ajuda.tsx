"use client"

import { type FormEvent, useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import {
  type AlvoDeDenuncia,
  type Denuncia,
  enviarDenuncia,
  EXPLICACAO_MAX,
  lerAlvosDeDenuncia,
  lerDenuncia,
  lerDenuncias,
  MOTIVOS_DA_DENUNCIA,
} from "@/lib/dados/denuncias"
import {
  useBuscaDaRota,
  useCargaDaLista,
  useNavegacao,
  useRolagemEFoco,
  useSobreposicaoDaEntrada,
  useTrocarBusca,
} from "@/lib/navegacao/react"
import { AreaDeTexto, Folha } from "@/src/pecas/pecas"
import { Segmentos } from "@/src/pecas/segmentos"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"

/**
 * Ajuda (onda 8 + TROCA-005). As perguntas da conta continuam aqui; o que o
 * site fazia em /denuncias entra como a segunda seção da MESMA tela: uma lista
 * com "Meus chamados" e "Minhas denúncias", a denúncia nova na Folha única do
 * NAV-001 e o acompanhamento em Folha. Nenhuma tela nova, nenhuma rota nova.
 */

type AbaDaAjuda = "chamados" | "denuncias"

const ABAS: readonly Readonly<{ id: AbaDaAjuda; rotulo: string }>[] = [
  { id: "chamados", rotulo: "Meus chamados" },
  { id: "denuncias", rotulo: "Minhas denúncias" },
]

const PERGUNTAS: readonly (readonly [pergunta: string, resposta: string])[] = [
  [
    "Por que pedem o CPF?",
    "Para confirmar seu vínculo na fonte oficial. O número só é conferido e não fica salvo no Bivaque.",
  ],
  [
    "Sou cônjuge ou dependente. Como entro?",
    "Pelo convite de quem é militar, veterano ou pensionista. Essa pessoa cria o código em Você → Família convidada. O convite vale só para o e-mail de quem foi convidado, por 7 dias, e não pede CPF.",
  ],
  [
    "A fonte oficial não confirmou meu vínculo.",
    "Envie um documento que mostre o vínculo, como o contracheque ou a identidade militar. A equipe responde em até 2 dias úteis e, enquanto isso, o conteúdo fica fechado.",
  ],
  [
    "Preciso de senha para entrar?",
    "Não, o Bivaque não usa senha. Em Entrar, toque em Continuar com e-mail; o código de 6 números chega na hora.",
  ],
  ["Como apago minha conta?", "Em Você → Apagar a conta. Você confirma digitando APAGAR."],
]

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR")
}

export function Ajuda() {
  const navegacao = useNavegacao()
  const busca = useBuscaDaRota()
  const trocarBusca = useTrocarBusca()
  const aba: AbaDaAjuda = busca["aba"] === "denuncias" ? "denuncias" : "chamados"

  const [denuncias, setDenuncias] = useState<readonly Denuncia[] | null>(null)
  const [erroDasDenuncias, setErroDasDenuncias] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)

  const nova = useSobreposicaoDaEntrada("denuncia-nova")
  const detalhe = useSobreposicaoDaEntrada("denuncia-detalhe")
  const [aberta, setAberta] = useState<Denuncia | null>(null)
  const [selecionada, setSelecionada] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: aba e rodada comandam a leitura
  useEffect(() => {
    if (aba !== "denuncias") return
    const controle = new AbortController()
    setErroDasDenuncias(null)
    void lerDenuncias({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setDenuncias(lidas)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErroDasDenuncias(falha)
      })
    return () => controle.abort()
  }, [aba, rodada])

  useRolagemEFoco(
    useCargaDaLista(aba !== "denuncias" || denuncias !== null || erroDasDenuncias !== null),
  )

  const irParaAba = (destino: AbaDaAjuda) => {
    void trocarBusca(destino === "chamados" ? {} : { aba: destino })
  }

  function abrirDetalhe(id: string) {
    setSelecionada(id)
    detalhe.aoMudarAberto(true)
  }

  function fecharDetalhe() {
    setSelecionada(null)
    setAberta(null)
    detalhe.aoMudarAberto(false)
  }

  function aplicarDenunciaEnviada() {
    nova.aoMudarAberto(false)
    setRodada((atual) => atual + 1)
  }

  return (
    <section data-tela="ajuda" className="grid gap-2">
      <CabecaDePagina titulo="Ajuda" subtitulo="Perguntas frequentes, contato e chamados." />

      <Segmentos
        itens={ABAS.map((item) => ({
          id: item.id,
          rotulo: item.rotulo,
          contagem: item.id === "denuncias" ? (denuncias?.length ?? null) : null,
        }))}
        valor={aba}
        aoEscolher={(id) => irParaAba(id as AbaDaAjuda)}
        rotulo="Seções da Ajuda"
        grupo="ajuda"
      />

      {aba === "chamados" ? (
        <Secao titulo="Meus chamados">
          <div className="grid gap-2">
            <EstadoVazio
              titulo="Nenhum chamado aberto"
              texto="Quando precisar, escreva para a gente — a resposta chega por e-mail."
              icone="inbox"
              acao={{
                rotulo: "Fale com a gente",
                aoAcionar: () => void navegacao.irPara("contato"),
              }}
            />
          </div>
        </Secao>
      ) : (
        <Secao
          titulo="Minhas denúncias"
          acoes={
            <Botao icone="flag" onClick={() => nova.aoMudarAberto(true)}>
              Nova denúncia
            </Botao>
          }
        >
          {erroDasDenuncias !== null ? (
            <FalhaDaLeitura
              falha={erroDasDenuncias}
              aoTentar={() => setRodada((atual) => atual + 1)}
            />
          ) : denuncias === null ? (
            <EsqueletoDeLista linhas={2} />
          ) : denuncias.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma denúncia enviada"
              texto="Se algo aqui na comunidade não estiver certo, conte para a gente. A equipe analisa e você acompanha por aqui."
              icone="flag"
              acao={{
                rotulo: "Nova denúncia",
                aoAcionar: () => nova.aoMudarAberto(true),
              }}
            />
          ) : (
            <Lista>
              {denuncias.map((denuncia) => (
                <LinhaDeLista
                  key={denuncia.id}
                  icone="flag"
                  titulo={denuncia.previaDeAlvo ?? denuncia.rotuloDoAlvo}
                  subtitulo={`${denuncia.rotuloDoAlvo} · ${dataCurta(denuncia.criadaEm)}`}
                  fim={
                    <Etiqueta tom={denuncia.resolvida ? "neutro" : "info"}>
                      {denuncia.resolvida ? "Resolvida" : "Em análise"}
                    </Etiqueta>
                  }
                  onClick={() => abrirDetalhe(denuncia.id)}
                />
              ))}
            </Lista>
          )}
        </Secao>
      )}

      <Secao titulo="Conta e entrada">
        <div className="grid gap-3">
          {PERGUNTAS.map(([pergunta, resposta]) => (
            <details
              key={pergunta}
              className="rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)"
            >
              <summary className="cursor-pointer text-[15px] font-semibold">{pergunta}</summary>
              <p className="mt-2 text-[15px] leading-6 text-(--on-surface-variant)">{resposta}</p>
            </details>
          ))}
        </div>
      </Secao>

      <Secao titulo="Precisa falar com a gente?">
        <div className="grid gap-2">
          <LinhaDeLista
            icone="support"
            titulo="Fale com a gente"
            subtitulo="Escreva o que aconteceu; respondemos em até 2 dias úteis"
            onClick={() => void navegacao.irPara("contato")}
          />
        </div>
      </Secao>

      <Folha
        aberta={nova.aberto}
        aoFechar={() => nova.aoMudarAberto(false)}
        sobreposicao="denuncia-nova"
        titulo="Nova denúncia"
        descricao="O motivo vai para a moderação. Não inclua dados pessoais na explicação."
      >
        <FormularioDeDenuncia aoEnviar={aplicarDenunciaEnviada} />
      </Folha>

      <Folha
        aberta={detalhe.aberto && selecionada !== null}
        aoFechar={fecharDetalhe}
        sobreposicao="denuncia-detalhe"
        titulo="Acompanhar denúncia"
      >
        <DetalheDaDenuncia id={selecionada} denuncia={aberta} aoLer={setAberta} />
      </Folha>
    </section>
  )
}

function FormularioDeDenuncia({ aoEnviar }: { readonly aoEnviar: () => void }) {
  const [alvos, setAlvos] = useState<readonly AlvoDeDenuncia[] | null>(null)
  const [erroDosAlvos, setErroDosAlvos] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [alvo, setAlvo] = useState<AlvoDeDenuncia | null>(null)
  const [motivo, setMotivo] = useState("")
  const [explicacao, setExplicacao] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const controle = new AbortController()
    setAlvos(null)
    setErroDosAlvos(null)
    void lerAlvosDeDenuncia({ signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setAlvos(lidos)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErroDosAlvos(falha)
      })
    return () => controle.abort()
  }, [rodada])

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (alvo === null || motivo === "" || enviando) return
    setEnviando(true)
    setMensagem(null)
    try {
      await enviarDenuncia({
        tipo: alvo.tipo,
        alvo: alvo.id,
        motivo,
        explicacao,
      })
      aoEnviar()
    } catch (falha: unknown) {
      const mensagemDoServidor =
        falha !== null && typeof falha === "object" && "mensagem" in falha
          ? (falha as { mensagem: unknown }).mensagem
          : null
      setMensagem(
        typeof mensagemDoServidor === "string"
          ? mensagemDoServidor
          : "Não foi possível enviar a denúncia agora. Tente novamente.",
      )
    } finally {
      setEnviando(false)
    }
  }

  if (erroDosAlvos !== null) {
    return <FalhaDaLeitura falha={erroDosAlvos} aoTentar={() => setRodada((atual) => atual + 1)} />
  }
  if (alvos === null) return <EsqueletoDeLista linhas={3} />
  if (alvos.length === 0) {
    return (
      <p className="text-sm text-(--on-surface-variant)">
        Não encontramos publicação ou grupo seu que possa ser denunciado agora. Abra o conteúdo que
        quer denunciar, use Denunciar no menu dele, e acompanhe a resposta aqui.
      </p>
    )
  }

  return (
    <form className="grid gap-4" onSubmit={enviar} aria-busy={enviando} noValidate>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">O que você quer denunciar?</legend>
        {alvos.map((item) => (
          <label
            key={`${item.tipo}:${item.id}`}
            className="flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm"
          >
            <input
              type="radio"
              name="alvo-da-denuncia"
              checked={alvo?.id === item.id && alvo.tipo === item.tipo}
              onChange={() => setAlvo(item)}
            />
            <span className="grid min-w-0 gap-0.5">
              <b className="break-words font-medium">{item.titulo}</b>
              <small className="text-[12px] text-(--on-surface-variant)">
                {item.tipo === "post" ? "Publicação" : "Grupo"}
              </small>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Motivo</legend>
        {MOTIVOS_DA_DENUNCIA.map((item) => (
          <label key={item.valor} className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="radio"
              name="motivo-da-denuncia"
              value={item.valor}
              checked={motivo === item.valor}
              onChange={() => setMotivo(item.valor)}
            />
            {item.rotulo}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-1">
        <AreaDeTexto
          rotulo="Explique (opcional)"
          rows={3}
          maxLength={EXPLICACAO_MAX}
          value={explicacao}
          placeholder="Explique (opcional)"
          onChange={(evento) => setExplicacao(evento.target.value.slice(0, EXPLICACAO_MAX))}
        />
        <p className="text-right text-[12px] text-(--on-surface-variant)">
          {explicacao.length}/{EXPLICACAO_MAX} caracteres
        </p>
        <p className="text-[12px] text-(--on-surface-variant)">
          Não inclua CPF, telefone ou endereço: quem analisa não precisa deles.
        </p>
      </div>

      {mensagem === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {mensagem}
        </p>
      )}

      <div className="flex justify-end">
        <Botao type="submit" disabled={enviando || alvo === null || motivo === ""}>
          {enviando ? "Enviando…" : "Enviar denúncia"}
        </Botao>
      </div>
    </form>
  )
}

function DetalheDaDenuncia({
  id,
  denuncia,
  aoLer,
}: {
  readonly id: string | null
  readonly denuncia: Denuncia | null
  readonly aoLer: (denuncia: Denuncia) => void
}) {
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: a denúncia muda com o id aberto
  useEffect(() => {
    if (id === null) return
    const controle = new AbortController()
    setErro(null)
    void lerDenuncia(id, { signal: controle.signal })
      .then((lida) => {
        if (!controle.signal.aborted) aoLer(lida)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [id, rodada])

  if (erro !== null) {
    return <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
  }
  if (denuncia === null || denuncia.id !== id) return <EsqueletoDeLista linhas={2} />

  return (
    <div className="grid gap-4" data-denuncia={denuncia.id}>
      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta tom={denuncia.resolvida ? "neutro" : "info"}>
          {denuncia.resolvida ? "Resolvida" : "Em análise"}
        </Etiqueta>
        <span className="text-[13px] text-(--on-surface-variant)">
          Enviada em {dataCurta(denuncia.criadaEm)}
        </span>
      </div>

      <div className="rounded-xl bg-(--surface-lowest) px-3 py-2 ring-1 ring-(--outline-variant)">
        <p className="text-[13px] text-(--on-surface-variant)">{denuncia.rotuloDoAlvo}</p>
        <p className="break-words text-sm">
          {denuncia.previaDeAlvo ?? "O conteúdo desta denúncia foi removido."}
        </p>
      </div>

      <div className="grid gap-1">
        <h3 className="text-sm font-semibold">Motivo da denúncia</h3>
        <p className="text-sm">{denuncia.motivo}</p>
      </div>

      {denuncia.explicacao === null ? null : (
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold">Sua explicação</h3>
          <p className="whitespace-pre-wrap break-words text-sm">{denuncia.explicacao}</p>
        </div>
      )}

      {denuncia.resolvidaEm === null ? null : (
        <p className="text-[13px] text-(--on-surface-variant)">
          Encerrada em {dataCurta(denuncia.resolvidaEm)}.
        </p>
      )}
    </div>
  )
}
