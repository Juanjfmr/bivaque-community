import { useEffect, useState } from "react"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { Secao } from "@/components/bivaque/secao"
import {
  buscarEncontro,
  cancelarPresenca,
  marcarPresenca,
  type Presenca,
} from "@/lib/dados/eventos"
import { type InicioDaCidade, lerInicio } from "@/lib/dados/inicio"
import { moeda } from "@/lib/formato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { DialogoDePergunta } from "@/src/criar/DialogoDePergunta"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"
import { rotuloDaCategoria } from "@/src/inicio/categorias"
import { Botao, Ilustracao, Linha, Selo } from "@/src/pecas/pecas"
import "@/src/inicio/inicio.css"

const ATALHOS = [
  { rota: "guia", selo: "chegadas", rotulo: "Chegadas" },
  { rota: "negocios", selo: "morando", rotulo: "Serviços" },
  { rota: "imoveis", selo: "mudancas", rotulo: "Moradia" },
  { rota: "agenda", selo: "familias", rotulo: "Agenda" },
] as const

function resumoDoEncontro(comecaEm: string | null, local: string | null): string {
  const data = new Date(comecaEm ?? "")
  if (Number.isNaN(data.getTime())) return local ?? "Local a combinar"
  return [
    data.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
    data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    local,
  ]
    .filter(Boolean)
    .join(" · ")
}

export function Inicio() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<InicioDaCidade | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [presenca, setPresenca] = useState<Presenca | null>(null)
  const [erroPresenca, setErroPresenca] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [tentativaPresenca, setTentativaPresenca] = useState(0)
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(null)
    void lerInicio({ signal: controle.signal })
      .then((valor) => {
        if (!controle.signal.aborted) setDados(valor)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted)
          setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => controle.abort()
  }, [rodada])

  const eventoId = dados?.eventos[0]?.id
  // biome-ignore lint/correctness/useExhaustiveDependencies: tentativa solicita nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setPresenca(null)
    setErroPresenca(false)
    if (eventoId !== undefined) {
      void buscarEncontro(eventoId, { signal: controle.signal })
        .then((encontro) => {
          if (!controle.signal.aborted) setPresenca(encontro.presenca)
        })
        .catch(() => {
          if (!controle.signal.aborted) setErroPresenca(true)
        })
    }
    return () => controle.abort()
  }, [eventoId, tentativaPresenca])

  async function alternarPresenca(id: string) {
    if (presenca === null || gravando) return
    setGravando(true)
    setErroPresenca(false)
    try {
      setPresenca(
        presenca.minha === "going" ? await cancelarPresenca(id) : await marcarPresenca(id, "going"),
      )
    } catch {
      setErroPresenca(true)
    } finally {
      setGravando(false)
    }
  }

  const cidade = dados?.cidade ?? casca.cidade
  const perguntas = [...(dados?.perguntas ?? [])]
    .sort((a, b) => a.respostas - b.respostas)
    .slice(0, 3)
  const encontro = dados?.eventos[0]

  return (
    <section data-tela="inicio" className="pc bv-inicio">
      <header data-home="abertura" className="bv-chegada">
        <div data-home="apresentacao">
          <p className="pc-apoio">Seu ponto de encontro</p>
          <CabecaDePagina
            titulo={`A vida em ${cidade}, juntos.`}
            subtitulo="Um lugar para fazer parte."
          />
        </div>
        <Ilustracao nome="cidade" prioridade className="bv-chegada-arte" />
        <div data-home="ferramentas" className="bv-descoberta">
          <Botao
            tom="contorno"
            icone="search"
            data-acao="busca"
            onClick={() => void navegacao.irPara("busca")}
          >
            Buscar na cidade
          </Botao>
          <nav aria-label="Áreas" className="bv-caminhos">
            {ATALHOS.map((atalho) => (
              <Botao
                key={atalho.rota}
                tom="texto"
                compacto
                data-acao="atalho"
                data-valor={atalho.rota}
                onClick={() => void navegacao.irPara(atalho.rota)}
              >
                <span className="bv-caminho-conteudo">
                  <Selo nome={atalho.selo} tamanho={40} />
                  <span>{atalho.rotulo}</span>
                </span>
              </Botao>
            ))}
          </nav>
        </div>
      </header>

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso ao conteúdo desta cidade." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((valor) => valor + 1)} />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={4} />
      ) : (
        <div data-home="conteudo" className="bv-encontro-da-cidade">
          <div className="bv-home-principal">
            <Secao
              titulo="Uma indicação faz diferença"
              acoes={
                <Botao tom="texto" compacto onClick={() => void navegacao.irPara("comunidade")}>
                  Ver perguntas
                </Botao>
              }
            >
              <p className="pc-apoio">Compartilhe o que você já conhece de {cidade}.</p>
              <Botao
                data-acao="perguntar"
                tom="principal"
                icone="edit_square"
                onClick={() => void navegacao.abrir("perguntar")}
              >
                Perguntar à cidade
              </Botao>
              {perguntas.length === 0 ? (
                <EstadoVazio
                  titulo="A conversa pode começar com você"
                  texto="Peça uma indicação ou compartilhe uma dúvida com a cidade."
                  icone="forum"
                />
              ) : (
                <div className="bv-perguntas-da-cidade">
                  {perguntas.map((pergunta) => (
                    <LinhaDePergunta
                      key={pergunta.id}
                      pergunta={{
                        id: pergunta.id,
                        pergunta: pergunta.title,
                        autor: "Alguém da cidade",
                        tópico: pergunta.grupo ?? "",
                        cidade,
                        respostas: pergunta.respostas,
                        resolvida: pergunta.resolvida,
                      }}
                      onClick={() =>
                        void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                      }
                    />
                  ))}
                </div>
              )}
            </Secao>

            <Secao
              titulo="Circulando pela comunidade"
              acoes={
                <Botao tom="texto" compacto onClick={() => void navegacao.irPara("mercado")}>
                  Ver mercado
                </Botao>
              }
            >
              <p className="pc-apoio">Desapegos e moradia para o seu próximo passo.</p>
              {dados.anuncios.length === 0 ? (
                <p className="pc-apoio">
                  Ainda sem anúncios nesta cidade. Você pode publicar pelo Criar.
                </p>
              ) : (
                <div>
                  {dados.anuncios.slice(0, 4).map((anuncio) => (
                    <Linha
                      key={anuncio.id}
                      data-cartao="anuncio"
                      titulo={anuncio.title}
                      marca={<Icone nome={anuncio.tipo === "property" ? "apartment" : "sell"} />}
                      apoio={anuncio.bairro ?? cidade}
                      acessorio={
                        anuncio.precoCentavos === null ? (
                          <Icone nome="chevron_right" />
                        ) : (
                          moeda(anuncio.precoCentavos / 100)
                        )
                      }
                      onClick={() =>
                        void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })
                      }
                    />
                  ))}
                </div>
              )}
            </Secao>

            <Secao
              titulo="Serviços na cidade"
              acoes={
                <Botao tom="texto" compacto onClick={() => void navegacao.irPara("negocios")}>
                  Ver negócios
                </Botao>
              }
            >
              {dados.negocios.length === 0 ? (
                <p className="pc-apoio">Os negócios cadastrados nesta cidade aparecerão aqui.</p>
              ) : (
                <div>
                  {dados.negocios.slice(0, 4).map((negocio) => (
                    <Linha
                      key={negocio.id}
                      data-cartao="negocio"
                      marca={<Icone nome="storefront" />}
                      titulo={negocio.nome}
                      apoio={rotuloDaCategoria(negocio.categoria)}
                      onClick={() =>
                        void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                      }
                    />
                  ))}
                </div>
              )}
            </Secao>
          </div>

          <aside aria-label="Comunidade na cidade" className="bv-viver-a-cidade">
            <Secao titulo="Encontre sua turma">
              <Ilustracao nome="familias" className="bv-turma-arte" />
              {dados.grupos.length === 0 ? (
                <p className="pc-apoio">
                  Um interesse em comum já é um começo. Descubra os grupos da cidade.
                </p>
              ) : (
                <div>
                  {dados.grupos.slice(0, 2).map((grupo) => (
                    <Linha
                      key={grupo.id}
                      marca={<Icone nome="group" />}
                      titulo={grupo.nome}
                      apoio={`${grupo.membros} ${grupo.membros === 1 ? "membro" : "membros"} · Você participa`}
                      onClick={() =>
                        void navegacao.irPara("grupo", { parametros: { id: grupo.id } })
                      }
                    />
                  ))}
                </div>
              )}
              <Botao
                tom="contorno"
                onClick={() => void navegacao.irPara("comunidade", { filtros: { secao: "grp" } })}
              >
                Explorar grupos
              </Botao>
            </Secao>

            <Secao
              titulo="Para estar junto"
              acoes={
                <Botao tom="texto" compacto onClick={() => void navegacao.irPara("agenda")}>
                  Agenda
                </Botao>
              }
            >
              {encontro === undefined ? (
                <p className="pc-apoio">
                  Ainda sem encontros marcados. A agenda reúne os próximos eventos da cidade.
                </p>
              ) : (
                <>
                  <Linha
                    titulo={encontro.title}
                    apoio={resumoDoEncontro(encontro.comecaEm, encontro.local)}
                    marca={<Icone nome="event" />}
                    onClick={() =>
                      void navegacao.irPara("evento", { parametros: { id: encontro.id } })
                    }
                  />
                  <Botao
                    data-acao="presenca"
                    tom="contorno"
                    aria-pressed={presenca?.minha === "going"}
                    disabled={presenca === null || gravando}
                    carregando={gravando}
                    onClick={() => void alternarPresenca(encontro.id)}
                  >
                    {presenca?.minha === "going"
                      ? "Presença confirmada · Cancelar"
                      : "Confirmar presença"}
                  </Botao>
                  {erroPresenca ? (
                    <p role="alert" className="pc-apoio">
                      Não foi possível {presenca === null ? "carregar" : "gravar"} sua presença.{" "}
                      <Botao
                        tom="texto"
                        compacto
                        onClick={() =>
                          presenca === null
                            ? setTentativaPresenca((valor) => valor + 1)
                            : void alternarPresenca(encontro.id)
                        }
                      >
                        Tentar de novo
                      </Botao>
                    </p>
                  ) : null}
                </>
              )}
            </Secao>

            <Secao titulo={`De casa em ${cidade}`}>
              <Linha
                marca={<Selo nome="chegadas" tamanho={48} />}
                titulo="Um guia para se estabelecer"
                apoio="Moradia, mudança e vida na cidade."
                onClick={() => void navegacao.irPara("guia")}
              />
            </Secao>
          </aside>
        </div>
      )}
      <DialogoDePergunta />
    </section>
  )
}
