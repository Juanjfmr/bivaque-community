import { useState } from "react"

import { AcoesDoDetalhe } from "@/components/bivaque/acoes-do-detalhe"
import { AvataresEmpilhados, MembroAvatar } from "@/components/bivaque/avatar"
import { useAvisos } from "@/components/bivaque/avisos"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Campo, Selecao } from "@/components/bivaque/campos"
import { Capa } from "@/components/bivaque/capa"
import { CartaoDeFoto, CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { CartaoDePublicacao, type Publicacao } from "@/components/bivaque/cartao-de-publicacao"
import { ChipDeAjuda, ChipDeSugestao } from "@/components/bivaque/chips"
import { ChipsDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { Contador } from "@/components/bivaque/contador"
import { EsqueletoDeImagem, EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { FaixaDeContexto, FaixaDeVisita } from "@/components/bivaque/faixa-de-contexto"
import { FimDeBloco, FimDeLista } from "@/components/bivaque/fim-de-lista"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDeEncontro, LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeAjuste, LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { ListaPaginada } from "@/components/bivaque/lista-paginada"
import { Marca } from "@/components/bivaque/marca"
import { ItemDoMenu, MenuDaLinha } from "@/components/bivaque/menu-de-linha"
import { Secao, TituloDeSecao } from "@/components/bivaque/secao"
import { SeloVerificado } from "@/components/bivaque/selo-verificado"
import { assetUrl } from "@/lib/assets"
import { dataISO, diasAte, moeda, rotuloDeData } from "@/lib/formato"
import { ITENS_DA_GALERIA, type ItemDaGaleria, MOVIMENTOS } from "@/lib/galeria"
import { NOMES_DE_ICONE } from "@/lib/icones"
import { idLocal } from "@/lib/id"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais, normalizar } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"

/**
 * A galeria de prova.
 *
 * A onda 1c entrega a casca e os componentes comuns, não as telas das ondas 2 a
 * 8 — e um componente sem tela não tem onde ser visto. Aqui cada linha da seção
 * 7 do inventário tem o seu lugar, com estados que a tela de produto ainda não
 * tem (contador com número, aviso com desfazer, lista paginada cheia) e com os
 * 100 ícones da seção 9.
 *
 * **Ela não aparece na navegação real e não existe fora do modo de prova**: o
 * endereço só responde quando a bateria liga o modo; em uso normal é o mesmo
 * fallback de qualquer endereço fora do catálogo. Nada aqui inventa conteúdo de
 * produto: o que não tem consumidor ainda está marcado como tal.
 */
export function TelaGaleria() {
  // A galeria restaura rolagem e foco como qualquer tela: sem isto, o foco não
  // volta ao acionador depois de fechar uma sobreposição aberta aqui.
  useRolagemEFoco(CARGA_CONCLUIDA)
  return (
    <section data-tela="galeria">
      <CabecaDePagina
        titulo="Galeria de prova"
        subtitulo="Componentes e estados da onda 1c, fora da navegação real."
      />
      {ITENS_DA_GALERIA.map((item) => (
        <BlocoDaGaleria key={item.id} item={item} />
      ))}
      <Secao titulo="Os 100 ícones (inventário §9)">
        <ListaDeIcones />
      </Secao>
      <Secao titulo="Os 40 movimentos (inventário §6)">
        <ListaDeMovimentos />
      </Secao>
    </section>
  )
}

function BlocoDaGaleria({ item }: { readonly item: ItemDaGaleria }) {
  return (
    <section data-galeria={item.id}>
      <p data-galeria-titulo="sim">{item.titulo}</p>
      <p data-galeria-regra="sim">{item.regra}</p>
      <p data-galeria-consumidor="sim">{`Consumidor: ${item.consumidor}`}</p>
      <div data-galeria-exemplo="sim">
        <ExemploDaGaleria id={item.id} forma={item.forma} />
      </div>
    </section>
  )
}

function Nota({ children }: { children: string }) {
  return <p className="text-[13px] text-(--on-surface-variant)">{children}</p>
}

/** O que cada linha do inventário mostra aqui. */
function ExemploDaGaleria({ id, forma }: { readonly id: string; readonly forma: string }) {
  const navegacao = useNavegacao()
  const avisos = useAvisos()
  const casca = useCasca()
  const [cidade, definirCidade] = useState("Manaus")
  const [filtro, definirFiltro] = useState("para-ajudar")

  if (forma === "nota" && id === "sem-ponteiro-de-dom") {
    return (
      <Nota>
        {"Não portado: em React quem consulta o DOM são ref e estado; não há componente a criar."}
      </Nota>
    )
  }
  if (id === "sem-escape-manual") {
    return (
      <Nota>
        Não portado: o JSX escapa sozinho. O único escape manual que resta é o seletor do descritor
        de foco (`lib/navegacao/entrada.ts`).
      </Nota>
    )
  }
  if (id === "guarda-de-edicao") {
    return (
      <Nota>
        Editor com alteração não salva é da onda 6; a confirmação de descarte já existe aqui.
      </Nota>
    )
  }
  if (id === "historico-da-sobreposicao") {
    return (
      <Nota>
        Uma sobreposição, uma entrada: quem empilha é o roteador (`lib/navegacao/transicoes.ts`), e
        o Voltar do sistema fecha antes de trocar de rota.
      </Nota>
    )
  }

  switch (id) {
    case "imagem-do-asset":
      return (
        <div data-galeria-exemplo="sim" className="grid gap-2">
          <Nota>{`data: URI passa direto; chave sem asset devolve "${assetUrl("foto-inexistente")}" (o mapa chega na onda 1d).`}</Nota>
          <Capa alt="Capa sem foto" rotulo="Sem foto" />
        </div>
      )
    case "capa":
      return <Capa alt="Capa de exemplo" rotulo="Desapego" icone="sell" className="max-w-sm" />
    case "botao":
      return (
        <div data-galeria-exemplo="sim" className="flex flex-wrap items-center gap-2">
          <Botao data-exemplo="botao-padrao">Publicar</Botao>
          <Botao tom="tonal" data-exemplo="botao-tonal">
            Ver mais
          </Botao>
          <Botao tom="texto" data-exemplo="botao-texto">
            Cancelar
          </Botao>
          <Botao tom="perigo" data-exemplo="botao-perigo">
            Apagar
          </Botao>
        </div>
      )
    case "botao-de-icone":
      return <BotaoDeIcone rotulo="Buscar" nome="search" data-exemplo="botao-de-icone" />
    case "selecao":
      return (
        <div data-galeria-exemplo="sim" className="max-w-sm">
          <Selecao
            id="galeria-selecao"
            rotulo="Ordenar"
            valor={cidade}
            opcoes={[
              { valor: "recente", titulo: "Mais recentes" },
              { valor: "preco", titulo: "Menor preço" },
            ]}
            aoMudar={definirCidade}
          />
        </div>
      )
    case "campo":
      return (
        <div data-galeria-exemplo="sim" className="grid max-w-sm gap-3">
          <Campo
            id="galeria-campo"
            rotulo="Título"
            valor={cidade}
            aoMudar={definirCidade}
            nota="Uma linha por campo."
          />
          <Campo id="galeria-area" rotulo="Detalhe" valor="" area />
        </div>
      )
    case "etiqueta":
      return (
        <div data-galeria-exemplo="sim" className="flex flex-wrap gap-2">
          <Etiqueta tom="neutro">Neutra</Etiqueta>
          <Etiqueta tom="ok" icone="check_circle">
            Resolvida
          </Etiqueta>
          <Etiqueta tom="aviso">Vencida</Etiqueta>
          <Etiqueta tom="patrocinado">Patrocinado</Etiqueta>
          <Etiqueta tom="info" icone="verified_user">
            Verificado
          </Etiqueta>
        </div>
      )
    case "titulo-de-secao":
      return (
        <TituloDeSecao
          acoes={
            <Botao tom="texto" data-exemplo="acao-da-secao">
              Ver tudo
            </Botao>
          }
        >
          Perto de você
        </TituloDeSecao>
      )
    case "arte-vazia":
      return <ArteVaziaDaGaleria />
    case "estado-vazio":
      return (
        <EstadoVazio
          titulo="Nada por aqui ainda"
          texto="Quando aparecer algo nesta cidade, ele entra nesta lista."
          acao={{
            rotulo: "Perguntar",
            aoAcionar: () => avisos.avisar({ texto: "Pergunta aberta" }),
          }}
        />
      )
    case "cartao-de-foto":
      return (
        <Grade className="max-w-md">
          <CartaoDeFoto
            anuncio={{
              id: "a-1",
              titulo: "Mesa de jantar de madeira",
              rotulo: "Desapego",
              icone: "sell",
              preco: 450,
              meta: "Centro · Manaus",
              salvo: true,
            }}
          />
        </Grade>
      )
    case "cartao-de-negocio":
      return (
        <Grade className="max-w-md">
          <CartaoDeNegocio
            negocio={{
              id: "n-1",
              nome: "Marcenaria do Bairro",
              categoria: "Reformas",
              cidade: "Manaus",
              bairro: "Flores",
              indicacoes: 12,
              salvo: true,
            }}
          />
        </Grade>
      )
    case "linha-de-pergunta":
      return (
        <Lista>
          <LinhaDePergunta
            pergunta={{
              id: "q-1",
              pergunta: "Alguém indica eletricista na Zona Norte?",
              autor: "Ana",
              tópico: "Serviços",
              cidade: "Manaus",
              respostas: 3,
              trecho: "Preciso de alguém para trocar o quadro de luz.",
            }}
          />
        </Lista>
      )
    case "linha-de-encontro":
      return (
        <Lista>
          <LinhaDeEncontro
            encontro={{
              id: "e-1",
              titulo: "Café da vizinhança",
              data: dataISO(3),
              mes: "out",
              dia: "28",
              local: "Praça do Bairro",
              horario: "9h",
              confirmados: 14,
              confirmado: true,
            }}
          />
        </Lista>
      )
    case "texto-normalizado":
      return (
        <div data-galeria-exemplo="sim" className="grid gap-1">
          <Nota>{`normalizar("Indicação") = "${normalizar("Indicação")}"`}</Nota>
          <Nota>{`iniciais("Ana Paula Souza") = "${iniciais("Ana Paula Souza")}"`}</Nota>
        </div>
      )
    case "icone":
      return (
        <div data-galeria-exemplo="sim" className="flex items-center gap-3">
          <Icone nome="search" className="size-6" />
          <Icone nome="bookmark" preenchido className="size-6" />
        </div>
      )
    case "marca":
      return <Marca className="size-10" />
    case "moeda":
      return <Nota>{`moeda(1250) = "${moeda(1250)}"`}</Nota>
    case "id-local":
      return <Nota>{`idLocal("item-") = "${idLocal("item-")}"`}</Nota>
    case "data-iso":
      return <Nota>{`dataISO(2) = "${dataISO(2)}"`}</Nota>
    case "rotulo-de-data":
      return <Nota>{`rotuloDeData("2026-03-07") = "${rotuloDeData("2026-03-07")}"`}</Nota>
    case "dias-ate":
      return <Nota>{`diasAte(dataISO(7)) = "${diasAte(dataISO(7))}"`}</Nota>
    case "iniciais":
      return (
        <div data-galeria-exemplo="sim" className="flex items-center gap-3">
          <MembroAvatar nome="Ana Paula Souza" />
          <MembroAvatar nome="Bivaque" propria />
          <AvataresEmpilhados nomes={["Ana", "João", "Maria"]} total={7} />
        </div>
      )
    case "lista-paginada":
      return <ListaDaGaleria />
    case "pe-de-lista":
      return (
        <FimDeBloco
          mostrados={48}
          total={120}
          porBloco={24}
          carregando={false}
          aoMostrarMais={() => avisos.avisar({ texto: "Mais um bloco" })}
        />
      )
    case "fim-de-lista":
      return (
        <FimDeLista
          titulo="Não achou sua dúvida?"
          texto="Pergunte: quem mora aqui responde."
          rotulo="Perguntar"
          aoAcionar={() => avisos.avisar({ texto: "Pergunta aberta" })}
        />
      )
    case "chips-de-filtro":
      return (
        <div data-galeria-exemplo="sim">
          <ChipsDeFiltro
            rotulo="Filtrar as perguntas"
            valor={filtro}
            aoEscolher={definirFiltro}
            itens={[
              { id: "para-ajudar", rotulo: "Para ajudar" },
              { id: "resolvidas", rotulo: "Resolvidas" },
              { id: "minhas", rotulo: "Minhas" },
            ]}
          />
        </div>
      )
    case "indicador-de-segmento":
      return (
        <div data-galeria-exemplo="sim">
          <ChipsDeFiltro
            rotulo="Filtrar o mercado"
            valor={filtro === "resolvidas" ? "resolvidas" : "para-ajudar"}
            aoEscolher={definirFiltro}
            itens={[
              { id: "para-ajudar", rotulo: "Desapegos" },
              { id: "resolvidas", rotulo: "Imóveis com quintal" },
            ]}
          />
        </div>
      )
    case "sobreposicao":
    case "fechar-sobreposicao":
      return (
        <Botao
          data-acao="abrir-exemplo"
          data-valor="sobreposicao"
          onClick={() => void navegacao.abrir("dialogo")}
        >
          Abrir sobreposição
        </Botao>
      )
    case "confirmacao":
      return (
        <div data-galeria-exemplo="sim" className="grid gap-2">
          <Botao
            data-acao="abrir-exemplo"
            data-valor="confirmacao"
            onClick={() => void navegacao.abrir("confirmacao")}
          >
            Abrir confirmação
          </Botao>
          <Confirmacao
            titulo="Descartar alterações?"
            texto="Você pode continuar editando ou descartar o que ainda não foi salvo."
            perigo
            aoConfirmar={() => avisos.avisar({ texto: "Descartado" })}
          />
        </div>
      )
    case "aviso":
      return (
        <div data-galeria-exemplo="sim" className="flex flex-wrap gap-2">
          <Botao
            data-acao="exemplo-aviso"
            onClick={() => avisos.avisar({ texto: "Anúncio salvo" })}
          >
            Aviso simples
          </Botao>
          <Botao
            data-acao="exemplo-aviso-com-desfazer"
            tom="tonal"
            onClick={() =>
              avisos.avisar({
                texto: "Anúncio ocultado",
                desfazer: { aoDesfazer: () => avisos.avisar({ texto: "De volta" }) },
              })
            }
          >
            Aviso com desfazer
          </Botao>
        </div>
      )
    case "selo-verificado":
      return <SeloVerificado aoAbrir={() => void navegacao.abrir("selo")} />
    case "explicacao-do-selo":
      return (
        <Botao tom="contornado" icone="info" onClick={() => void navegacao.abrir("selo")}>
          Ver a explicação do selo
        </Botao>
      )
    case "contagem-animada":
      return (
        <div data-galeria-exemplo="sim" className="flex items-center gap-4">
          <Contador para={128} rotulo="indicações" />
          <AvataresEmpilhados nomes={["Ana", "João"]} total={12} />
        </div>
      )
    case "cabeca-de-pagina":
      return (
        <CabecaDePagina
          titulo="Salvos"
          subtitulo="O que você guardou para depois"
          acao={<BotaoDeIcone rotulo="Opções de Salvos" nome="more_vert" />}
        />
      )
    case "secao":
      return (
        <Secao titulo="Perto de você" acoes={<Botao tom="texto">Ver tudo</Botao>}>
          <Nota>O conteúdo da seção é da tela; a seção só dá o título e o espaço.</Nota>
        </Secao>
      )
    case "grade":
      return (
        <Grade>
          {["um", "dois", "tres", "quatro"].map((chave) => (
            <span key={chave} className="rounded-xl bg-(--surface-lowest) p-4 text-sm">
              {`Cartão ${chave}`}
            </span>
          ))}
        </Grade>
      )
    case "lista":
      return (
        <Lista>
          <LinhaDeLista icone="sell" titulo="Meus anúncios" subtitulo="3 ativos" />
          <LinhaDeAjuste icone="bookmark" titulo="Salvos" subtitulo="12 itens" />
          <LinhaDeLista icone="settings" titulo="Configurações" subtitulo="Conta e avisos" />
        </Lista>
      )
    case "cartao-de-publicacao":
      return (
        <div data-galeria-exemplo="sim" className="grid gap-3">
          {PUBLICACOES.map((publicacao) => (
            <CartaoDePublicacao key={publicacao.id} publicacao={publicacao} />
          ))}
        </div>
      )
    case "linha-de-ajuste":
      return (
        <Lista>
          <LinhaDeAjuste icone="person" titulo="Seu momento" subtitulo="Perfil e preferências" />
          <LinhaDeAjuste icone="notifications" titulo="Alertas de busca" subtitulo="2 ligados" />
        </Lista>
      )
    case "faixa-de-visita":
      return (
        <div data-galeria-exemplo="sim" className="grid gap-3">
          <FaixaDeContexto icone="lock" tom="nota">
            Grupo fechado: só quem entra vê as publicações.
          </FaixaDeContexto>
          <FaixaDeVisita
            cidadeVista={casca.cidade === casca.cidadeDeCasa ? "Recife" : casca.cidade}
            cidadeDaPessoa={casca.cidadeDeCasa}
            aoVoltar={() => casca.voltarParaCasa()}
          />
        </div>
      )
    case "fim-de-bloco":
      return (
        <FimDeLista
          titulo="Não achou o que procura?"
          texto="Filtre por bairro, preço e mais para achar mais rápido."
          rotulo="Filtrar"
          icone="tune"
          aoAcionar={() => avisos.avisar({ texto: "Filtros abertos" })}
        />
      )
    case "chips":
      return (
        <div data-galeria-exemplo="sim" className="flex flex-wrap items-center gap-2">
          <Etiqueta tom="ok">Etiqueta</Etiqueta>
          <ChipDeAjuda>Mobiliado</ChipDeAjuda>
          <ChipDeSugestao onClick={() => avisos.avisar({ texto: "Resposta rápida" })}>
            Ainda está disponível?
          </ChipDeSugestao>
        </div>
      )
    case "avatar":
      return (
        <div data-galeria-exemplo="sim" className="flex items-center gap-3">
          <MembroAvatar nome="Ana Paula" tamanho="grande" />
          <MembroAvatar nome="João" propria />
          <AvataresEmpilhados nomes={["Ana", "João", "Maria"]} total={9} />
        </div>
      )
    case "menu-de-linha":
      return (
        <MenuDaLinha rotulo="Opções da publicação">
          <ItemDoMenu>Ação de exemplo</ItemDoMenu>
        </MenuDaLinha>
      )
    case "acoes-do-detalhe":
      return (
        <AcoesDoDetalhe>
          <Botao tom="tonal" icone="share">
            Compartilhar
          </Botao>
          <Botao icone="chat_bubble">Falar com quem publicou</Botao>
        </AcoesDoDetalhe>
      )
    case "esqueleto":
      return (
        <div data-galeria-exemplo="sim" className="grid max-w-md gap-3">
          <Nota>
            O protótipo não tem esqueleto geral: tem o pé da lista paginada e o brilho da foto que
            ainda não chegou. Os dois estão aqui.
          </Nota>
          <EsqueletoDeLista linhas={2} />
          <EsqueletoDeImagem rotulo="Foto do anúncio" />
        </div>
      )
    default:
      return <Nota>Ainda sem exemplo nesta galeria.</Nota>
  }
}

function ArteVaziaDaGaleria() {
  return (
    <div
      data-galeria-exemplo="sim"
      className="grid max-w-xs justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) p-4"
    >
      <Icone nome="search_off" className="size-8 text-(--on-surface-variant)" />
      <Nota>A arte entra dentro do estado vazio, com o ícone no meio.</Nota>
    </div>
  )
}

function ListaDaGaleria() {
  const itens = Array.from({ length: 60 }, (_, indice) => `item-${indice + 1}`)
  return (
    <ListaPaginada
      itens={itens}
      identificar={(item) => item}
      renderizar={(item) => (
        <span className="block rounded-xl bg-(--surface-lowest) px-4 py-3 text-sm">
          {`Publicação ${item.replace("item-", "")}`}
        </span>
      )}
    />
  )
}

const PUBLICACOES: readonly Publicacao[] = [
  {
    id: "p-1",
    tipo: "pergunta",
    autor: "Ana",
    quando: "há 2 h",
    texto: "Alguém indica eletricista na Zona Norte?",
    resolvida: true,
    comentarios: 3,
    uteis: 2,
    util: true,
  },
  {
    id: "p-2",
    tipo: "evento",
    autor: "João",
    quando: "ontem",
    texto: "Café da vizinhança no sábado.",
    comentarios: 8,
    uteis: 5,
    encontro: { data: dataISO(3), local: "Praça do Bairro", confirmado: true },
  },
  {
    id: "p-3",
    tipo: "enquete",
    autor: "Maria",
    quando: "há 3 dias",
    texto: "Qual horário funciona melhor para a reunião?",
    comentarios: 4,
    uteis: 1,
    enquete: {
      opcoes: [
        { rotulo: "Manhã", votos: 12 },
        { rotulo: "Tarde", votos: 5 },
      ],
      votada: "Manhã",
    },
  },
  {
    id: "p-4",
    tipo: "oferta",
    autor: "Marcenaria do Bairro",
    quando: "há 1 semana",
    texto: "Conserto de móveis com retirada e entrega.",
    comentarios: 2,
    uteis: 0,
    tambemNaCidade: true,
  },
]

function ListaDeIcones() {
  return (
    <div data-icone-lista="sim">
      {NOMES_DE_ICONE.map((nome) => (
        <span key={nome}>
          <Icone nome={nome} className="size-7" />
          <span>{nome}</span>
        </span>
      ))}
    </div>
  )
}

function ListaDeMovimentos() {
  return (
    <Lista>
      {MOVIMENTOS.map((movimento) => (
        <LinhaDeLista
          key={movimento.numero}
          data-movimento={movimento.numero}
          titulo={`${movimento.numero}. ${movimento.nome}`}
          subtitulo={`${movimento.ondeVive} · ${movimento.consumidor}`}
          fim={
            <span className="text-[12px] text-(--on-surface-variant)">{movimento.consumidor}</span>
          }
        />
      ))}
    </Lista>
  )
}
