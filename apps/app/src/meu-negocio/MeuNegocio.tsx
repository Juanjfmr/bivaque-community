import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo, Formulario } from "@/components/bivaque/campos"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { Secao } from "@/components/bivaque/secao"
import {
  criarMinhaFicha,
  type FotoDaFicha,
  legendarFoto,
  lerMinhaFicha,
  type MinhaFicha,
  moverFoto,
  moverServico,
  publicarFoto,
  publicarServico,
  removerFoto,
  removerServico,
  type ServicoDaFicha,
  salvarMinhaFicha,
} from "@/lib/dados/negocios"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"
import { mensagemDaFicha, validarFicha, validarServico } from "@/src/negocios/formulario"

/**
 * Meu negócio (F07, RUN-177) — a gestão da ficha do PRÓPRIO membro.
 *
 * Uma tela para as três coisas que a ficha tem: os dados da página, os itens de
 * serviço e as fotos do portfólio. Tudo grava pela porta `/api/app/negocio`
 * (ADR-20261105 §5): o navegador não fala com o Supabase. O dono do negócio
 * recebe os pedidos em Pedidos, e a ficha pública é o Negócio da lista.
 *
 * Sem ficha ainda, a mesma tela mostra o formulário de criação — é o caminho de
 * "Divulgar meu negócio" no menu Criar.
 */

type Pendente =
  | Readonly<{ tipo: "servico"; id: string; titulo: string }>
  | Readonly<{ tipo: "foto"; id: string; legenda: string | null }>

/**
 * A legenda é editada em campo próprio e gravada ao sair do campo: um PATCH por
 * edição concluída, não por tecla. O texto local existe porque o campo é
 * controlado — sem ele, o que a pessoa digita não apareceria.
 */
function LegendaDaFoto({
  foto,
  indice,
  aoSalvar,
}: {
  readonly foto: FotoDaFicha
  readonly indice: number
  readonly aoSalvar: (legenda: string) => void
}) {
  const [texto, setTexto] = useState(foto.legenda ?? "")
  useEffect(() => setTexto(foto.legenda ?? ""), [foto.legenda])
  return (
    <Campo
      id={`foto-legenda-${foto.id}`}
      rotulo={`Legenda da foto ${indice + 1}`}
      valor={texto}
      aoMudar={setTexto}
      maxLength={120}
      onBlur={() => {
        const limpa = texto.trim()
        if (limpa !== (foto.legenda ?? "")) aoSalvar(limpa)
      }}
    />
  )
}

export function MeuNegocio() {
  const navegacao = useNavegacao()
  const { aberto: confirmando, aoMudarAberto: setConfirmando } =
    useSobreposicaoDaEntrada("confirmacao")
  const [carregado, setCarregado] = useState(false)
  const [ficha, setFicha] = useState<MinhaFicha | null>(null)
  const [categorias, setCategorias] = useState<readonly Readonly<{ id: string; nome: string }>[]>(
    [],
  )
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [nome, setNome] = useState("")
  const [categoria, setCategoria] = useState("")
  const [descricao, setDescricao] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [tituloDoServico, setTituloDoServico] = useState("")
  const [descricaoDoServico, setDescricaoDoServico] = useState("")
  const [legenda, setLegenda] = useState("")
  const [pendente, setPendente] = useState<Pendente | null>(null)
  const campoDaFoto = useRef<HTMLInputElement | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de tentar de novo
  useEffect(() => {
    const controle = new AbortController()
    setCarregado(false)
    setErro(null)
    void lerMinhaFicha({ signal: controle.signal })
      .then((lida) => {
        if (controle.signal.aborted) return
        setFicha(lida.ficha)
        setCategorias(lida.categorias)
        setCarregado(true)
        if (lida.ficha === null) return
        setNome(lida.ficha.nome)
        setCategoria(lida.ficha.categoria)
        setDescricao(lida.ficha.descricao ?? "")
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => controle.abort()
  }, [rodada])

  async function executar<T>(acao: () => Promise<T>, aoConcluir: (valor: T) => void) {
    if (ocupado) return
    setOcupado(true)
    setMensagem(null)
    setAviso(null)
    try {
      aoConcluir(await acao())
    } catch (falha: unknown) {
      setMensagem(mensagemDaFicha(falha))
    } finally {
      setOcupado(false)
    }
  }

  function gravarFicha(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = validarFicha(nome, categoria, descricao)
    if (problema !== null) {
      setMensagem(problema)
      return
    }
    const dados = { nome, categoria, descricao }
    void executar(
      () => (ficha === null ? criarMinhaFicha(dados) : salvarMinhaFicha(dados)),
      (gravada) => {
        setFicha(gravada)
        setAviso(ficha === null ? "Sua página foi criada." : "Sua página foi salva.")
      },
    )
  }

  function publicarItem(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const problema = validarServico(tituloDoServico, descricaoDoServico)
    if (problema !== null) {
      setMensagem(problema)
      return
    }
    void executar(
      () => publicarServico({ titulo: tituloDoServico, descricao: descricaoDoServico }),
      (servicos) => {
        setFicha((atual) => (atual === null ? atual : { ...atual, servicos }))
        setTituloDoServico("")
        setDescricaoDoServico("")
        setAviso("Serviço publicado.")
      },
    )
  }

  function escolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    evento.target.value = ""
    if (arquivo === undefined) return
    void executar(
      () => publicarFoto(arquivo, legenda),
      (fotos) => {
        setFicha((atual) => (atual === null ? atual : { ...atual, fotos }))
        setLegenda("")
        setAviso("Foto publicada.")
      },
    )
  }

  function ordenarServico(servico: ServicoDaFicha, direcao: "cima" | "baixo") {
    void executar(
      () => moverServico(servico.id, direcao),
      (servicos) => setFicha((atual) => (atual === null ? atual : { ...atual, servicos })),
    )
  }

  function ordenarFoto(foto: FotoDaFicha, direcao: "cima" | "baixo") {
    void executar(
      () => moverFoto(foto.id, direcao),
      (fotos) => setFicha((atual) => (atual === null ? atual : { ...atual, fotos })),
    )
  }

  function legendar(foto: FotoDaFicha, texto: string) {
    void executar(
      () => legendarFoto(foto.id, texto),
      (fotos) => setFicha((atual) => (atual === null ? atual : { ...atual, fotos })),
    )
  }

  function confirmarRemocao() {
    const alvo = pendente
    setConfirmando(false)
    if (alvo === null) return
    setPendente(null)
    if (alvo.tipo === "servico") {
      void executar(
        () => removerServico(alvo.id),
        (servicos) => {
          setFicha((atual) => (atual === null ? atual : { ...atual, servicos }))
          setAviso("Serviço removido.")
        },
      )
      return
    }
    void executar(
      () => removerFoto(alvo.id),
      (fotos) => {
        setFicha((atual) => (atual === null ? atual : { ...atual, fotos }))
        setAviso("Foto removida.")
      },
    )
  }

  if (erro !== null) {
    return (
      <section data-tela="meu-negocio" className="grid gap-2">
        <CabecaDePagina titulo="Meu negócio" />
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  return (
    <section data-tela="meu-negocio" className="grid gap-2">
      <CabecaDePagina
        titulo="Meu negócio"
        subtitulo={
          ficha === null
            ? "Crie a página do seu negócio e receba pedidos da comunidade."
            : "Sua página reúne seus serviços, suas fotos e os pedidos que você recebe."
        }
        acao={
          <Botao tom="texto" onClick={() => void navegacao.irPara("pedidos")}>
            Pedidos recebidos
          </Botao>
        }
      />
      {!carregado ? (
        <EsqueletoDeLista linhas={4} />
      ) : (
        <>
          <Secao titulo={ficha === null ? "Criar a página" : "Sua página"}>
            {mensagem === null ? null : (
              <p role="alert" className="text-sm text-(--destructive)">
                {mensagem}
              </p>
            )}
            {aviso === null ? null : (
              <p role="status" className="text-sm text-(--primary)">
                {aviso}
              </p>
            )}
            <form onSubmit={gravarFicha} aria-busy={ocupado}>
              <Formulario>
                <Campo
                  id="negocio-nome"
                  rotulo="Nome do negócio"
                  valor={nome}
                  aoMudar={setNome}
                  minLength={2}
                  maxLength={80}
                />
                <div className="grid gap-1.5">
                  <label htmlFor="negocio-categoria" className="text-sm font-medium">
                    Categoria
                  </label>
                  <select
                    id="negocio-categoria"
                    value={categoria}
                    onChange={(evento) => setCategoria(evento.target.value)}
                    className="min-h-11 w-full rounded-xl border border-(--border) bg-(--card) px-3 text-sm"
                  >
                    <option value="" disabled>
                      Escolha uma categoria
                    </option>
                    {categorias.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <Campo
                  id="negocio-descricao"
                  rotulo="O que você oferece (opcional)"
                  area
                  valor={descricao}
                  aoMudar={setDescricao}
                  nota={`${descricao.length}/800 caracteres.`}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  {ficha === null ? null : (
                    <Botao
                      tom="texto"
                      icone="visibility"
                      onClick={() =>
                        void navegacao.irPara("negocio", { parametros: { id: ficha.id } })
                      }
                    >
                      Ver página pública
                    </Botao>
                  )}
                  <Botao type="submit" disabled={ocupado}>
                    {ocupado
                      ? "Salvando…"
                      : ficha === null
                        ? "Criar minha página"
                        : "Salvar alterações"}
                  </Botao>
                </div>
              </Formulario>
            </form>
          </Secao>

          {ficha === null ? null : (
            <>
              <Secao titulo="Serviços">
                {ficha.servicos.length === 0 ? (
                  <p className="text-sm text-(--on-surface-variant)">
                    Publique o que você faz. Os itens aparecem na sua página pública.
                  </p>
                ) : (
                  <ul data-lista="servicos" className="grid gap-2">
                    {ficha.servicos.map((servico, indice) => (
                      <li
                        key={servico.id}
                        data-servico={servico.id}
                        className="flex flex-wrap items-start gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)"
                      >
                        <div className="grid min-w-0 grow gap-0.5">
                          <b className="break-words text-[15px] font-semibold">{servico.titulo}</b>
                          {servico.descricao === null ? null : (
                            <small className="break-words text-[13px] text-(--on-surface-variant)">
                              {servico.descricao}
                            </small>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <BotaoDeIcone
                            rotulo={`Mover ${servico.titulo} para cima`}
                            nome="expand_more"
                            className="rotate-180"
                            disabled={ocupado || indice === 0}
                            onClick={() => ordenarServico(servico, "cima")}
                          />
                          <BotaoDeIcone
                            rotulo={`Mover ${servico.titulo} para baixo`}
                            nome="expand_more"
                            disabled={ocupado || indice === ficha.servicos.length - 1}
                            onClick={() => ordenarServico(servico, "baixo")}
                          />
                          <BotaoDeIcone
                            rotulo={`Remover ${servico.titulo}`}
                            nome="delete"
                            disabled={ocupado}
                            onClick={() => {
                              setPendente({
                                tipo: "servico",
                                id: servico.id,
                                titulo: servico.titulo,
                              })
                              setConfirmando(true)
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <form onSubmit={publicarItem} aria-busy={ocupado}>
                  <Formulario>
                    <Campo
                      id="servico-titulo"
                      rotulo="Título do item"
                      valor={tituloDoServico}
                      aoMudar={setTituloDoServico}
                      minLength={2}
                      maxLength={120}
                    />
                    <Campo
                      id="servico-descricao"
                      rotulo="Descrição do item (opcional)"
                      valor={descricaoDoServico}
                      aoMudar={setDescricaoDoServico}
                      nota={`${descricaoDoServico.length}/600 caracteres.`}
                    />
                    <div className="flex justify-end">
                      <Botao type="submit" tom="contornado" disabled={ocupado}>
                        Publicar item
                      </Botao>
                    </div>
                  </Formulario>
                </form>
              </Secao>

              <Secao titulo="Fotos">
                <p className="text-sm text-(--on-surface-variant)">
                  A primeira foto é a capa da sua página. Use JPEG, PNG ou WebP de até 5 MB.
                </p>
                {ficha.fotos.length === 0 ? (
                  <p className="text-sm text-(--on-surface-variant)">Nenhuma foto publicada.</p>
                ) : (
                  <ul data-lista="fotos" className="grid gap-3 sm:grid-cols-2">
                    {ficha.fotos.map((foto, indice) => (
                      <li
                        key={foto.id}
                        data-foto={foto.id}
                        className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-2 ring-1 ring-(--outline-variant)"
                      >
                        <img
                          src={foto.url}
                          alt={foto.legenda ?? `Foto ${indice + 1} do negócio`}
                          className="aspect-video w-full rounded-xl object-cover"
                        />
                        <LegendaDaFoto
                          foto={foto}
                          indice={indice}
                          aoSalvar={(texto) => legendar(foto, texto)}
                        />
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <BotaoDeIcone
                              rotulo={`Mover foto ${indice + 1} para cima`}
                              nome="expand_more"
                              className="rotate-180"
                              disabled={ocupado || indice === 0}
                              onClick={() => ordenarFoto(foto, "cima")}
                            />
                            <BotaoDeIcone
                              rotulo={`Mover foto ${indice + 1} para baixo`}
                              nome="expand_more"
                              disabled={ocupado || indice === ficha.fotos.length - 1}
                              onClick={() => ordenarFoto(foto, "baixo")}
                            />
                          </div>
                          <BotaoDeIcone
                            rotulo={`Remover foto ${indice + 1}`}
                            nome="delete"
                            disabled={ocupado}
                            onClick={() => {
                              setPendente({ tipo: "foto", id: foto.id, legenda: foto.legenda })
                              setConfirmando(true)
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Formulario>
                  <Campo
                    id="foto-legenda-nova"
                    rotulo="Legenda da foto (opcional)"
                    valor={legenda}
                    aoMudar={setLegenda}
                    maxLength={120}
                  />
                  <input
                    ref={campoDaFoto}
                    id="foto-arquivo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={ocupado}
                    onChange={escolherFoto}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    <Botao
                      tom="contornado"
                      icone="add_photo_alternate"
                      disabled={ocupado}
                      onClick={() => campoDaFoto.current?.click()}
                    >
                      Escolher imagem
                    </Botao>
                    <Botao
                      tom="texto"
                      icone="storefront"
                      onClick={() => void navegacao.irPara("pedidos")}
                    >
                      Pedidos recebidos
                    </Botao>
                  </div>
                </Formulario>
              </Secao>
            </>
          )}
        </>
      )}

      {confirmando ? (
        <Confirmacao
          titulo={pendente?.tipo === "foto" ? "Remover foto?" : "Remover serviço?"}
          texto={
            pendente?.tipo === "foto"
              ? "A foto sai da sua página pública. Os outros dados continuam."
              : `${pendente?.titulo ?? "O item"} sai da sua página pública. Você pode publicar de novo depois.`
          }
          confirmar="Remover"
          perigo
          aoConfirmar={confirmarRemocao}
        />
      ) : null}
    </section>
  )
}
