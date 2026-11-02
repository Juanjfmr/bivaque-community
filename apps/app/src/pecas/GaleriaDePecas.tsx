import { type ReactNode, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import {
  AreaDeTexto,
  Avatar,
  Aviso,
  Botao,
  BotaoDeIcone,
  Campo,
  CampoDeArquivo,
  CampoDeBusca,
  CampoDeCodigo,
  CampoDeEscolha,
  Cartao,
  Chip,
  Compositor,
  EscolhaIlustrada,
  Esqueleto,
  Estado,
  Folha,
  ILUSTRACOES,
  Ilustracao,
  Linha,
  Nota,
  Progresso,
  SELOS,
  Selo,
  useAviso,
} from "./pecas"
import "./galeria-de-pecas.css"

const base = import.meta.env.BASE_URL

/**
 * A galeria das peças (rodada de identidade, 02/11/2026): cada peça, cada
 * estado, nos dois temas. Só existe no servidor de desenvolvimento.
 */
export function GaleriaDePecas() {
  return (
    <div className="pc gp">
      <header className="gp-cabeca">
        <h1 className="pc-titulo">Peças do Bivaque</h1>
        <p className="pc-apoio">
          A biblioteca única das prévias. Tela nova se monta com estas peças; nenhuma redesenha
          botão, chip, campo ou cartão. As regras estão em IDENTIDADE-DAS-PECAS.md.
        </p>
      </header>
      <Texto />
      <Cores />
      <Botoes />
      <Escolhas />
      <EscolhaComSelo />
      <Campos />
      <Listas />
      <Publicacao />
      <Pessoas />
      <Imagens />
      <Estados />
      <Movimento />
      <Icones />
    </div>
  )
}

function Secao({
  titulo,
  regra,
  children,
}: {
  titulo: string
  regra: string
  children: ReactNode
}) {
  return (
    <section className="gp-secao" aria-label={titulo}>
      <div className="gp-secao-cabeca">
        <h2 className="pc-subtitulo">{titulo}</h2>
        <p className="pc-apoio">{regra}</p>
      </div>
      {children}
    </section>
  )
}

function Texto() {
  return (
    <Secao
      titulo="Texto"
      regra="Noto Sans em tudo. A serifa só no destaque: a frase da porta e as boas-vindas."
    >
      <div className="gp-pilha">
        <p className="pc-destaque">A comunidade militar da sua cidade.</p>
        <p className="pc-titulo">Qual é o seu CPF?</p>
        <p className="pc-subtitulo">Grupos para você</p>
        <p className="pc-corpo">
          Alguém indica pediatra que atenda sábado? Chegamos mês passado e ainda não temos plano.
        </p>
        <p className="pc-apoio">
          Leva menos de um minuto. Você continua preenchendo enquanto isso.
        </p>
        <p className="pc-miudo">Carla R., há 2 horas</p>
      </div>
      <p className="pc-miudo">
        Destaque 30 (40 no computador), título 24, subtítulo 17, corpo 16, apoio 14, miúdo 13.
      </p>
    </Secao>
  )
}

const CORES: readonly { nome: string; papel: string; variavel: string }[] = [
  { nome: "Papel", papel: "Fundo de toda tela", variavel: "--pc-fundo" },
  { nome: "Cartão", papel: "Publicação, campo, folha", variavel: "--pc-cartao" },
  { nome: "Grafite", papel: "Texto, seleção, link", variavel: "--pc-tinta" },
  { nome: "Suave", papel: "Apoio e hora", variavel: "--pc-suave" },
  { nome: "Brasa", papel: "Só a ação principal", variavel: "--pc-acao" },
  { nome: "Ardósia", papel: "Só o que está feito", variavel: "--pc-feito" },
]

function Cores() {
  return (
    <Secao
      titulo="Cor"
      regra="Brasa aparece uma vez por tela, no botão principal. Seleção é Grafite. Nada de cor para enfeitar rótulo."
    >
      <ul className="gp-cores">
        {CORES.map((cor) => (
          <li key={cor.nome}>
            <span className="gp-amostra" style={{ background: `var(${cor.variavel})` }} />
            <span className="pc-linha-texto">
              <span className="pc-linha-titulo">{cor.nome}</span>
              <span className="pc-apoio">{cor.papel}</span>
            </span>
          </li>
        ))}
      </ul>
    </Secao>
  )
}

function Botoes() {
  const [entrou, setEntrou] = useState(false)
  return (
    <Secao
      titulo="Botões"
      regra="Toda ação é pílula. Principal em Brasa, uma por tela; o resto em tom, contorno ou texto."
    >
      <div className="gp-linha">
        <Botao tom="principal">Continuar</Botao>
        <Botao>Agora não</Botao>
        <Botao tom="contorno">Continuar com e-mail</Botao>
        <Botao tom="texto">Recomeçar</Botao>
      </div>
      <div className="gp-linha">
        <Botao tom="principal" icone="edit_square">
          Escrever
        </Botao>
        <Botao tom="principal" carregando>
          Enviando…
        </Botao>
        <Botao tom="principal" disabled>
          Publicar
        </Botao>
      </div>
      <div className="gp-linha">
        <Botao compacto aria-pressed={entrou} onClick={() => setEntrou((e) => !e)}>
          {entrou ? <Icone nome="check" /> : null}
          {entrou ? "Entrou" : "Entrar"}
        </Botao>
        <Botao compacto icone="add_photo_alternate" tom="contorno">
          Fotos (0 de 4)
        </Botao>
        <BotaoDeIcone rotulo="Voltar" nome="arrow_back" />
        <BotaoDeIcone rotulo="Salvar" nome="bookmark_border" tom="tom" />
        <BotaoDeIcone rotulo="Enviar comentário" nome="send" tom="principal" />
      </div>
      <div className="gp-sobre-foto">
        <img src={`${base}demo/cake.jpg`} alt="Foto anexada de exemplo" />
        <BotaoDeIcone
          rotulo="Tirar a foto"
          nome="close"
          tom="sobre-foto"
          compacto
          className="gp-sobre-foto-botao"
        />
      </div>
    </Secao>
  )
}

function Escolhas() {
  const [marcados, setMarcados] = useState<readonly string[]>(["Saúde"])
  const [aba, setAba] = useState("recentes")
  const assuntos = ["Escola e creche", "Saúde", "Pets", "Mudança", "Esporte"]
  return (
    <Secao
      titulo="Chips e abas"
      regra="Marcado é Grafite cheio, com o check. Aba usa o mesmo chip."
    >
      <ul className="pc-chips" aria-label="Assuntos">
        {assuntos.map((assunto) => (
          <li key={assunto}>
            <Chip
              selecionado={marcados.includes(assunto)}
              onClick={() =>
                setMarcados((atual) =>
                  atual.includes(assunto)
                    ? atual.filter((x) => x !== assunto)
                    : [...atual, assunto],
                )
              }
            >
              {assunto}
            </Chip>
          </li>
        ))}
      </ul>
      <div className="pc-chips" role="tablist" aria-label="Publicações">
        {[
          ["recentes", "Recentes"],
          ["sem-resposta", "Sem resposta"],
        ].map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            className="pc-chip"
            aria-selected={aba === valor}
            onClick={() => setAba(valor ?? "recentes")}
          >
            {rotulo}
          </button>
        ))}
      </div>
    </Secao>
  )
}

function Campos() {
  const [cidade, setCidade] = useState("")
  const [codigo, setCodigo] = useState("4821")
  const [arquivo, setArquivo] = useState<string | null>(null)
  const [comentario, setComentario] = useState("")
  return (
    <Secao
      titulo="Campos"
      regra="O rótulo mora dentro do campo e sobe com o foco. Erro diz o que fazer, em vermelho, com o ícone."
    >
      <div className="gp-grade">
        <Campo rotulo="E-mail" type="email" ajuda="Vamos mandar um código de 6 números." />
        <Campo
          rotulo="CPF"
          defaultValue="529.982.247-24"
          erro="Esse CPF não existe. Confira os números."
        />
        <Campo
          rotulo="E-mail do convite"
          defaultValue="familia.souza@exemplo.com"
          readOnly
          acessorio={<Icone nome="lock" />}
        />
        <CampoDeEscolha
          rotulo="Cidade"
          value={cidade}
          onChange={(evento) => setCidade(evento.target.value)}
          opcoes={[
            { valor: "Manaus", rotulo: "Manaus, AM" },
            { valor: "Brasília", rotulo: "Brasília, DF" },
          ]}
        />
        <CampoDeBusca rotulo="Buscar grupos" placeholder="Buscar grupos em Manaus" />
        <AreaDeTexto rotulo="Texto da publicação" placeholder="O que você quer saber?" rows={3} />
        <CampoDeCodigo
          rotulo="Código de 6 números"
          valor={codigo}
          aoMudar={setCodigo}
          erro={codigo === "000000" ? "Código errado ou vencido. Confira ou peça outro." : null}
        />
        <CampoDeArquivo
          rotulo="Escolher arquivo"
          dica="PDF, JPG ou PNG, até 10 MB"
          escolhido={arquivo}
          aceitar="application/pdf,image/jpeg,image/png"
          aoEscolher={(escolhido) =>
            setArquivo(
              escolhido ? `${escolhido.name}, ${Math.round(escolhido.size / 1024)} KB` : null,
            )
          }
        />
      </div>
      <form className="gp-compositor" onSubmit={(evento) => evento.preventDefault()}>
        <Compositor
          rotulo="Escrever comentário"
          rotuloDoEnvio="Enviar comentário"
          valor={comentario}
          aoMudar={setComentario}
          placeholder="Escreva um comentário"
        />
      </form>
    </Secao>
  )
}

function EscolhaComSelo() {
  const [momento, setMomento] = useState<"chegando" | "morando" | "saindo" | "">("chegando")
  return (
    <Secao
      titulo="Escolha com selo"
      regra="Poucas opções, uma só vale: rádios de verdade, cada um com o seu selo e o check no canto."
    >
      <div className="gp-estreita">
        <EscolhaIlustrada
          legenda="Seu momento na cidade"
          nome="galeria-momento"
          valor={momento}
          aoEscolher={setMomento}
          opcoes={[
            { valor: "chegando", rotulo: "Chegando", selo: "chegadas" },
            { valor: "morando", rotulo: "Moro aqui", selo: "morando" },
            { valor: "saindo", rotulo: "Saindo", selo: "saindo" },
          ]}
        />
      </div>
    </Secao>
  )
}

function Listas() {
  const [entrou, setEntrou] = useState<readonly string[]>([])
  const grupos = [
    { id: "chegadas", nome: "Chegadas 2026", apoio: "184 membros", selo: "chegadas" as const },
    { id: "pets", nome: "Pets da Vila", apoio: "97 membros", selo: "pets" as const },
  ]
  return (
    <Secao
      titulo="Listas"
      regra="Linha plana com divisória. Grupo leva o selo; ação leva o ícone de 24 na cor do texto."
    >
      <ul className="pc-lista">
        {grupos.map((grupo) => {
          const dentro = entrou.includes(grupo.id)
          return (
            <li key={grupo.id} className="gp-grupo">
              <Selo nome={grupo.selo} />
              <span className="pc-linha-texto">
                <span className="pc-linha-titulo">{grupo.nome}</span>
                <span className="pc-apoio">{grupo.apoio}</span>
              </span>
              <Botao
                compacto
                aria-pressed={dentro}
                onClick={() =>
                  setEntrou((atual) =>
                    dentro ? atual.filter((x) => x !== grupo.id) : [...atual, grupo.id],
                  )
                }
              >
                {dentro ? <Icone nome="check" /> : null}
                {dentro ? "Entrou" : "Entrar"}
              </Botao>
            </li>
          )
        })}
      </ul>
      <ul className="pc-lista">
        <li>
          <Linha
            marca={<Icone nome="chat_bubble" />}
            titulo="Diga olá"
            apoio="Conte quem você é e o que procura aqui."
          />
        </li>
        <li>
          <Linha
            marca={<Icone nome="person_add" />}
            titulo="Convidar alguém"
            apoio="Copia o link do grupo para mandar a quem você conhece."
            acessorio={<Icone nome="content_copy" />}
          />
        </li>
      </ul>
    </Secao>
  )
}

function Publicacao() {
  const [util, setUtil] = useState(false)
  return (
    <Secao
      titulo="Publicação"
      regra="No feed, cada publicação é um cartão branco sobre o Papel. O tipo é texto miúdo, sem cor."
    >
      <Cartao className="gp-publicacao">
        <header className="gp-autor">
          <Avatar nome="Carla R." />
          <span className="pc-linha-texto">
            <span className="pc-linha-titulo">Carla R.</span>
            <span className="pc-miudo">há 2 horas, Pergunta</span>
          </span>
        </header>
        <p className="pc-corpo">
          Alguém indica pediatra que atenda sábado? Chegamos mês passado e ainda não temos plano.
        </p>
        <Estado>Resolvida</Estado>
        <footer className="gp-acoes">
          <Botao
            tom="texto"
            compacto
            icone="thumb_up"
            aria-pressed={util}
            className="gp-acao"
            onClick={() => setUtil((u) => !u)}
          >
            Útil {util ? 12 : 11}
          </Botao>
          <Botao tom="texto" compacto icone="chat_bubble" className="gp-acao">
            4 comentários
          </Botao>
        </footer>
      </Cartao>
    </Secao>
  )
}

function Pessoas() {
  const nomes = ["Ana Souza", "Carla R.", "Marcos S.", "Luana M.", "João P.", "Beatriz T."]
  return (
    <Secao
      titulo="Pessoas"
      regra="Sem foto, as iniciais num dos quatro tons da família, sempre o mesmo para a mesma pessoa."
    >
      <div className="gp-linha">
        {nomes.map((nome) => (
          <Avatar key={nome} nome={nome} />
        ))}
        <Avatar nome="Ana Souza" tamanho={56} />
        <Avatar nome="Ana Souza" tamanho={32} />
      </div>
    </Secao>
  )
}

function Imagens() {
  return (
    <Secao
      titulo="Ilustrações e selos"
      regra="Recorte de papel, cinco cores e um toque de Brasa. Foto só quando é de um membro."
    >
      <ul className="gp-selos" aria-label="Selos de grupo">
        {SELOS.map((selo) => (
          <li key={selo}>
            <Selo nome={selo} tamanho={64} />
            <span className="pc-miudo">{selo}</span>
          </li>
        ))}
      </ul>
      <ul className="gp-cenas" aria-label="Cenas">
        {ILUSTRACOES.map((cena) => (
          <li key={cena}>
            <Ilustracao nome={cena} />
            <span className="pc-miudo">{cena}</span>
          </li>
        ))}
      </ul>
    </Secao>
  )
}

function Estados() {
  return (
    <Secao
      titulo="Estado, nota e progresso"
      regra="Ardósia com ícone cheio só para o que já está feito. Nota em tom, sem cor de alerta."
    >
      <div className="gp-pilha">
        <Estado icone="verified_user">Vínculo confirmado</Estado>
        <Nota>Neste grupo: fotos de crianças só com autorização dos pais.</Nota>
        <Progresso fracao={0.4} rotulo="Progresso do cadastro" />
      </div>
    </Secao>
  )
}

function Movimento() {
  const [aberta, setAberta] = useState(false)
  const [salva, setSalva] = useState(false)
  const { aviso, mostrar, limpar } = useAviso()
  const [carregando, setCarregando] = useState(true)
  return (
    <Secao
      titulo="Folha, aviso e carregamento"
      regra="A folha sobe de baixo e fecha arrastando. Toda ação desfeita a um toque. Carregar mostra a forma do que vem."
    >
      <div className="gp-linha">
        <Botao icone="info" onClick={() => setAberta(true)}>
          Sobre o grupo
        </Botao>
        <Botao
          icone={salva ? "bookmark" : "bookmark_border"}
          aria-pressed={salva}
          onClick={() => {
            setSalva(true)
            mostrar("Publicação salva.", () => setSalva(false))
          }}
        >
          {salva ? "Salva" : "Salvar"}
        </Botao>
        <Botao tom="texto" onClick={() => setCarregando((c) => !c)}>
          {carregando ? "Ver carregado" : "Ver carregando"}
        </Botao>
      </div>
      <Cartao className="gp-publicacao">
        {carregando ? (
          <>
            <div className="gp-autor">
              <Esqueleto largura="40px" altura={40} redondo />
              <span className="gp-pilha-curta">
                <Esqueleto largura="120px" altura={14} />
                <Esqueleto largura="80px" altura={12} />
              </span>
            </div>
            <Esqueleto altura={14} />
            <Esqueleto largura="70%" altura={14} />
          </>
        ) : (
          <>
            <header className="gp-autor">
              <Avatar nome="Marcos S." />
              <span className="pc-linha-texto">
                <span className="pc-linha-titulo">Marcos S.</span>
                <span className="pc-miudo">ontem, Conversa</span>
              </span>
            </header>
            <p className="pc-corpo">Café de boas-vindas no sábado, às 9h, na praça do Parque 10.</p>
          </>
        )}
      </Cartao>
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Sobre o grupo">
        <p className="pc-corpo">
          Escola, pediatra, festa e troca de roupa entre famílias com filhos de até 6 anos.
        </p>
        <ul className="gp-regras">
          <li>Oferta de negócio de membro: uma por semana.</li>
          <li>Indicação vale mais com a experiência de quem usou.</li>
        </ul>
        <Botao cheio onClick={() => setAberta(false)}>
          Fechar
        </Botao>
      </Folha>
      <Aviso aviso={aviso} aoSumir={limpar} />
    </Secao>
  )
}

function Icones() {
  return (
    <Secao
      titulo="Ícones"
      regra="Material Symbols com o peso do texto ao lado: 300 junto de texto comum, 500 em botão, 400 sozinho. Cheio só quando está ligado."
    >
      <div className="gp-pilha">
        <p className="gp-icone-texto">
          <Icone nome="lock" /> Seu CPF não fica guardado
        </p>
        <div className="gp-linha">
          <Botao compacto icone="thumb_up">
            Útil
          </Botao>
          <Botao compacto icone="thumb_up" aria-pressed>
            Útil
          </Botao>
          <BotaoDeIcone rotulo="Salvo" nome="bookmark" preenchido />
          <BotaoDeIcone rotulo="Salvar" nome="bookmark_border" />
        </div>
      </div>
    </Secao>
  )
}
