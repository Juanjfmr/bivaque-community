import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Campo } from "@/components/bivaque/campos"
import { EntradaAcesso } from "@/components/bivaque/entrada-acesso"
import { EntradaEtapa } from "@/components/bivaque/entrada-etapa"
import { FormularioNegocio } from "@/components/bivaque/formulario-negocio"
import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { dadosDoApp } from "@/lib/dados"
import type { Grupo } from "@/lib/dados/contrato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { ESTADOS_DA_ENTRADA, type EstadoDaEntrada } from "@/lib/navegacao/rotas"
import { registro, texto } from "@/src/telas/comum"

// Composição adaptada de Login Form Card, Felipe Menezes, licença MIT:
// https://21st.dev/@felipemenezes098/components/card-06

// Envio de identidade (protótipo `features/entry/account.js`): do documento
// ficam só o tipo e o tamanho — o nome pode trazer o CPF e nunca vai para a tela.
const TIPOS_DE_DOCUMENTO: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
}
const LIMITE_DO_DOCUMENTO = 10 * 1024 * 1024

const MOMENTOS = [
  ["chegando", "Chegando"],
  ["morando", "Moro aqui"],
  ["saindo", "Saindo"],
] as const

function documentoAceito(escolhido: File): boolean {
  return (
    Object.hasOwn(TIPOS_DE_DOCUMENTO, escolhido.type) &&
    escolhido.size > 0 &&
    escolhido.size <= LIMITE_DO_DOCUMENTO
  )
}

function rotuloDoArquivo(escolhido: File): string {
  const kb = escolhido.size / 1024
  const tamanho =
    kb < 1024
      ? `${Math.max(1, Math.round(kb))} KB`
      : `${(kb / 1024).toFixed(1).replace(".", ",")} MB`
  return `${TIPOS_DE_DOCUMENTO[escolhido.type] ?? "Documento"} · ${tamanho}`
}

export function Entrar() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const bruto = parametros["estado"] ?? "conta"
  const estado: EstadoDaEntrada = ESTADOS_DA_ENTRADA.find((item) => item === bruto) ?? "conta"
  const navegacao = useNavegacao()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [cpf, setCpf] = useState("")
  const [codigo, setCodigo] = useState("")
  const [cidade, setCidade] = useState(() => dadosDoApp.resumoDaCasca().cidade)
  const [destino, setDestino] = useState("")
  const [data, setData] = useState("")
  const [momento, setMomento] = useState<"chegando" | "morando" | "saindo">("morando")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erroArquivo, setErroArquivo] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [avisar, setAvisar] = useState(false)
  const [aceitou, setAceitou] = useState(false)
  const [grupos, setGrupos] = useState<Grupo[] | null>(null)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [negocioSalvo, setNegocioSalvo] = useState(false)

  useEffect(() => {
    if (estado !== "sugestoes-grupos") return
    let ativo = true
    setGrupos(null)
    void dadosDoApp.lerCidade(cidade.trim()).then(
      (dados) => {
        if (!ativo) return
        setGrupos(
          dados.grupos
            .filter((grupo) => {
              const info = grupo.apresentacao
              return (
                info !== null &&
                typeof info === "object" &&
                !Array.isArray(info) &&
                info["privacy"] === "aberto"
              )
            })
            .slice(0, 4),
        )
      },
      () => {
        if (ativo) setGrupos([])
      },
    )
    return () => {
      ativo = false
    }
  }, [estado, cidade])

  useRolagemEFoco(CARGA_CONCLUIDA)
  const irPara = (destino: EstadoDaEntrada) =>
    void navegacao.irPara("entrar", { parametros: { estado: destino } })
  const irInicio = () => void navegacao.irPara("inicio")
  const escolherDocumento = (escolhido: File | null) => {
    if (escolhido === null) return
    if (!documentoAceito(escolhido)) {
      setArquivo(null)
      setErroArquivo("Escolha um PDF, JPG ou PNG de até 10 MB.")
      return
    }
    setArquivo(escolhido)
    setErroArquivo("")
  }
  const acao = (texto: string, executar: () => void, secundaria = false, desabilitada = false) => (
    <Button
      type="button"
      variant={secundaria ? "outline" : "default"}
      className="entrada-botao"
      onClick={executar}
      disabled={desabilitada}
    >
      {texto}
    </Button>
  )
  const campoSenha = (id: string) => (
    <div className="entrada-senha">
      <Campo
        id={id}
        rotulo="Senha"
        valor={senha}
        aoMudar={setSenha}
        type={mostrarSenha ? "text" : "password"}
        autoComplete={estado === "login" ? "current-password" : "new-password"}
      />
      <button
        type="button"
        className="entrada-mostrar"
        onClick={() => setMostrarSenha(!mostrarSenha)}
      >
        {mostrarSenha ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  )
  const aceite = () => (
    <div className="entrada-aceite">
      <input
        id="aceite-entrada"
        type="checkbox"
        checked={aceitou}
        onChange={(e) => setAceitou(e.target.checked)}
      />{" "}
      <span>
        <label htmlFor="aceite-entrada">Li e concordo com a</label>{" "}
        <button
          type="button"
          className="entrada-link"
          onClick={() => void navegacao.irPara("privacidade")}
        >
          Política de privacidade
        </button>{" "}
        e o{" "}
        <button
          type="button"
          className="entrada-link"
          onClick={() => void navegacao.irPara("conduta")}
        >
          Código de conduta
        </button>
        .
      </span>
    </div>
  )
  const titulo: Record<EstadoDaEntrada, string> = {
    conta: "Vamos começar.",
    login: "Que bom ter você de volta.",
    aceite: "Só falta aceitar o combinado.",
    cpf: "Confirme seu vínculo.",
    resultado: "Vínculo confirmado.",
    analise: "Vínculo em análise.",
    documento: "Envie sua identidade.",
    "consulta-indisponivel": "Não foi possível concluir a consulta.",
    "convite-indisponivel": "Convite indisponível.",
    cidade: "Sua cidade e seu momento.",
    "sugestoes-grupos": "Encontre seus grupos.",
    negocio: "Você tem um negócio ou oferece algum serviço?",
    "negocio-formulario": "Apresente seu negócio.",
    "negocio-interesse": "Ideias para seu negócio.",
    "boas-vindas": "Bem-vindo ao Bivaque.",
    retomar: "Continue de onde parou.",
    senha: "Esqueci minha senha.",
    convite: "Convite de família.",
    apagada: "Conta apagada.",
  }

  // Login, criar conta e recuperar senha usam a composição A; as telas do
  // vínculo — aceite, CPF, consulta indisponível, documento e análise — usam a B,
  // no passo 2 (contrato ENT-003).
  const apoioDaEtapa: Partial<Record<EstadoDaEntrada, string>> = {
    aceite: "Leia e aceite para continuar com sua conta Google.",
    cpf: "Vamos conferir seu CPF para confirmar seu vínculo.",
    resultado: "Tudo certo. Agora escolha sua cidade.",
    "consulta-indisponivel": "A fonte oficial está fora do ar agora. Não é nada com seus dados.",
    documento:
      "Se a consulta por CPF não for concluída, você pode enviar sua identidade militar digital.",
    analise: "Acompanhe as etapas da análise por aqui.",
    "sugestoes-grupos": `Conheça alguns grupos de ${cidade || "sua cidade"}. Escolher é opcional.`,
  }

  /** A consulta indisponível explica a causa e o próximo passo em duas frases. */
  const apoioExtraDaEtapa: Partial<Record<EstadoDaEntrada, string>> = {
    "consulta-indisponivel":
      "Tente novamente em alguns minutos ou envie sua identidade para análise.",
  }

  const iconeDaEtapa = () => {
    if (estado === "resultado") {
      return (
        <span className="entrada-etapa-confirmacao">
          <Icone nome="check" />
        </span>
      )
    }
    // cloud_off não está no subconjunto hospedado dos Material Symbols: a lupa
    // cortada diz a mesma coisa (a consulta não está disponível agora).
    if (estado === "consulta-indisponivel") {
      return <Icone nome="search_off" className="entrada-etapa-icone" />
    }
    return null
  }

  if (
    estado === "aceite" ||
    estado === "cpf" ||
    estado === "resultado" ||
    estado === "consulta-indisponivel" ||
    estado === "documento" ||
    estado === "analise" ||
    estado === "cidade" ||
    estado === "sugestoes-grupos"
  ) {
    return (
      <EntradaEtapa
        passo={
          estado === "aceite" ? 1 : estado === "cidade" ? 3 : estado === "sugestoes-grupos" ? 4 : 2
        }
        titulo={titulo[estado]}
        apoio={apoioDaEtapa[estado] ?? ""}
        apoioExtra={apoioExtraDaEtapa[estado] ?? null}
        icone={iconeDaEtapa()}
        aoSair={() => irPara("login")}
      >
        {estado === "aceite" ? (
          <>
            <div className="entrada-etapa-aceite">
              <input
                id="aceite-entrada"
                type="checkbox"
                checked={aceitou}
                onChange={(evento) => setAceitou(evento.target.checked)}
              />
              <span>
                <label htmlFor="aceite-entrada">Li e concordo com a</label>{" "}
                <button
                  type="button"
                  className="entrada-etapa-link"
                  onClick={() => void navegacao.irPara("privacidade")}
                >
                  Política de privacidade
                </button>{" "}
                e o{" "}
                <button
                  type="button"
                  className="entrada-etapa-link"
                  onClick={() => void navegacao.irPara("conduta")}
                >
                  Código de conduta
                </button>
                .
              </span>
            </div>
            <Button
              type="button"
              className="entrada-etapa-acao"
              onClick={() => irPara("cpf")}
              disabled={!aceitou}
            >
              Aceitar e continuar
            </Button>
          </>
        ) : null}
        {estado === "cpf" ? (
          <>
            <Campo
              id="entrar-cpf"
              rotulo="CPF"
              valor={cpf}
              aoMudar={setCpf}
              inputMode="numeric"
              autoComplete="off"
            />
            <p className="entrada-etapa-aviso">
              <Icone nome="lock" className="size-5" />
              Seu CPF é usado só nesta consulta e não fica guardado.
            </p>
            <details className="entrada-etapa-detalhe" open>
              <summary>Por que pedimos seu CPF?</summary>
              <p>
                Conferimos na fonte oficial se você é militar federal da ativa, veterano ou
                pensionista. Leva poucos segundos. Familiares entram pelo convite, sem CPF.
              </p>
            </details>
            <Button
              type="button"
              className="entrada-etapa-acao"
              onClick={() => irPara("resultado")}
            >
              Continuar
            </Button>
            <p className="entrada-etapa-rodape">
              É familiar?{" "}
              <button
                type="button"
                className="entrada-etapa-link"
                onClick={() => irPara("convite")}
              >
                Usar convite
              </button>
            </p>
            <button
              type="button"
              className="entrada-etapa-simulacao"
              onClick={() => irPara("consulta-indisponivel")}
            >
              Simular consulta indisponível
            </button>
          </>
        ) : null}
        {estado === "resultado" ? (
          <Button type="button" className="entrada-etapa-acao" onClick={() => irPara("cidade")}>
            Continuar
          </Button>
        ) : null}
        {estado === "consulta-indisponivel" ? (
          <>
            <Button type="button" className="entrada-etapa-acao" onClick={() => irPara("cpf")}>
              Tentar novamente
            </Button>
            <Button
              type="button"
              variant="outline"
              className="entrada-etapa-acao"
              onClick={() => irPara("documento")}
            >
              Enviar identidade
            </Button>
          </>
        ) : null}
        {estado === "documento" ? (
          <>
            <div className="entrada-envio">
              <span className="entrada-envio-marco">
                <Icone nome="badge" />
              </span>
              {arquivo ? <p className="entrada-envio-cartao">{rotuloDoArquivo(arquivo)}</p> : null}
              <label className="entrada-envio-botao">
                {arquivo ? "Trocar arquivo" : "Selecionar arquivo"}
                <input
                  className="entrada-envio-campo"
                  id="documento"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(evento) => escolherDocumento(evento.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <p className="entrada-envio-nota">
              Envie um único arquivo completo. PDF, JPG ou PNG, até 10 MB.
            </p>
            {erroArquivo ? (
              <p className="entrada-envio-erro" role="alert">
                {erroArquivo}
              </p>
            ) : null}
            <Button
              type="button"
              className="entrada-etapa-acao"
              onClick={() => irPara("analise")}
              disabled={!arquivo}
            >
              Enviar arquivo
            </Button>
            <p className="entrada-etapa-rodape">
              <button type="button" className="entrada-etapa-link" onClick={() => irPara("cpf")}>
                Voltar
              </button>
            </p>
          </>
        ) : null}
        {estado === "analise" ? (
          <>
            <ol className="entrada-linha">
              <li data-estado="concluido">
                <span className="entrada-linha-marco">
                  <Icone nome="check" />
                </span>
                <div className="entrada-linha-texto">
                  <p className="entrada-linha-titulo">Documento enviado</p>
                </div>
              </li>
              <li data-estado="atual" aria-current="step">
                <span className="entrada-linha-marco">2</span>
                <div className="entrada-linha-texto">
                  <p className="entrada-linha-titulo">Em análise</p>
                  <p className="entrada-linha-prazo">Até 2 dias úteis, normalmente no mesmo dia</p>
                </div>
              </li>
              <li data-estado="futuro">
                <span className="entrada-linha-marco">3</span>
                <div className="entrada-linha-texto">
                  <p className="entrada-linha-titulo">Resultado</p>
                  <p className="entrada-linha-prazo">Você recebe um aviso assim que liberar</p>
                </div>
              </li>
            </ol>
            <label className="entrada-etapa-aceite">
              <input
                type="checkbox"
                checked={avisar}
                onChange={(evento) => setAvisar(evento.target.checked)}
              />
              <span>Avise-me quando houver uma atualização.</span>
            </label>
            <Button
              type="button"
              variant="outline"
              className="entrada-etapa-acao"
              onClick={() => irPara("documento")}
            >
              Substituir documento
            </Button>
          </>
        ) : null}
        {estado === "cidade" ? (
          <>
            <div className="entrada-etapa-campo">
              <Campo
                id="cidade"
                rotulo="Cidade"
                valor={cidade}
                aoMudar={setCidade}
                placeholder="Busque sua cidade"
              />
              <Icone nome="place" className="entrada-etapa-campo-icone" />
            </div>
            <fieldset className="entrada-etapa-momento">
              <legend>Seu momento</legend>
              {MOMENTOS.map(([valor, rotulo]) => (
                <label key={valor}>
                  <input
                    type="radio"
                    name="momento"
                    value={valor}
                    checked={momento === valor}
                    onChange={() => setMomento(valor)}
                  />
                  <span className="entrada-etapa-radio" aria-hidden="true" />
                  <span>{rotulo}</span>
                </label>
              ))}
            </fieldset>
            <Campo id="como-chamar" rotulo="Como quer ser chamado" valor={nome} aoMudar={setNome} />
            {momento === "morando" ? null : (
              <Campo
                id="data"
                rotulo={momento === "chegando" ? "Data de chegada" : "Data de saída"}
                valor={data}
                aoMudar={setData}
                type="date"
              />
            )}
            {momento === "saindo" ? (
              <Campo id="destino" rotulo="Cidade de destino" valor={destino} aoMudar={setDestino} />
            ) : null}
            <Button
              type="button"
              className="entrada-etapa-acao"
              onClick={() => irPara("sugestoes-grupos")}
            >
              Continuar
            </Button>
          </>
        ) : null}
        {estado === "sugestoes-grupos" ? (
          <>
            {grupos === null ? (
              <p className="entrada-etapa-vazio" role="status">
                Buscando sugestões…
              </p>
            ) : grupos.length === 0 ? (
              <p className="entrada-etapa-vazio">
                Ainda não há grupos sugeridos para esta cidade. Você pode continuar.
              </p>
            ) : (
              <fieldset className="entrada-etapa-grupos">
                <legend className="sr-only">Grupos sugeridos</legend>
                {grupos.map((grupo) => {
                  const foto = dadosDoApp.imagem(texto(registro(grupo.apresentacao)["img"]))
                  return (
                    <label key={grupo.id} className="entrada-etapa-grupo">
                      {foto === "" ? null : (
                        <img
                          className="entrada-etapa-grupo-foto"
                          src={foto}
                          alt=""
                          loading="lazy"
                        />
                      )}
                      <span className="entrada-etapa-grupo-texto">
                        <input
                          type="checkbox"
                          checked={selecionados.includes(grupo.id)}
                          onChange={(evento) => {
                            const marcado = evento.target.checked
                            setSelecionados((anteriores) =>
                              marcado
                                ? [...anteriores, grupo.id]
                                : anteriores.filter((id) => id !== grupo.id),
                            )
                          }}
                        />
                        <strong>{grupo.name}</strong>
                        {grupo.description ? <small>{grupo.description}</small> : null}
                      </span>
                    </label>
                  )
                })}
              </fieldset>
            )}
            <Button type="button" className="entrada-etapa-acao" onClick={() => irPara("negocio")}>
              Continuar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="entrada-etapa-acao"
              onClick={() => irPara("negocio")}
            >
              Escolher depois
            </Button>
          </>
        ) : null}
      </EntradaEtapa>
    )
  }

  if (estado === "login" || estado === "conta" || estado === "senha") {
    return (
      <EntradaAcesso
        estado={estado}
        nome={nome}
        aoMudarNome={setNome}
        email={email}
        aoMudarEmail={setEmail}
        senha={senha}
        aoMudarSenha={setSenha}
        aceitou={aceitou}
        aoAceitar={setAceitou}
        instrucoesEnviadas={enviado}
        aoEnviarInstrucoes={() => setEnviado(true)}
        aoIrPara={irPara}
        aoEntrar={irInicio}
        aoAbrirPrivacidade={() => void navegacao.irPara("privacidade")}
        aoAbrirConduta={() => void navegacao.irPara("conduta")}
      />
    )
  }

  return (
    <section data-tela="entrar" className="entrada-pagina">
      <Card className="entrada-cartao">
        <CardHeader className="entrada-cabecalho">
          <picture>
            <source
              media="(prefers-color-scheme: dark)"
              srcSet={`${import.meta.env.BASE_URL}brand/bivaque-logo-horizontal-white.svg`}
            />
            <img
              className="entrada-marca"
              src={`${import.meta.env.BASE_URL}brand/bivaque-logo-horizontal.svg`}
              alt="Bivaque"
            />
          </picture>
          <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1}>
            {titulo[estado]}
          </h1>
          <CardDescription>
            Jornada demonstrativa: nenhuma informação é enviada ou verificada.
          </CardDescription>
        </CardHeader>
        <CardContent className="entrada-conteudo">
          {estado === "negocio" && (
            <>
              <p>No Mercado, você pode apresentar seu negócio ou serviço à comunidade.</p>
              <p className="entrada-nota">Esta etapa é opcional. Você pode voltar a ela depois.</p>
              {acao("Divulgar agora", () => {
                setNegocioSalvo(false)
                irPara("negocio-formulario")
              })}
              {acao("Tenho interesse em criar", () => irPara("negocio-interesse"), true)}
              {acao("Decidir depois", () => irPara("boas-vindas"), true)}
            </>
          )}
          {estado === "negocio-formulario" &&
            (negocioSalvo ? (
              <>
                <p role="status">Rascunho salvo nesta sessão. Seu negócio não foi publicado.</p>
                {acao("Continuar", () => irPara("boas-vindas"))}
              </>
            ) : (
              <FormularioNegocio
                cidade={cidade}
                aoCancelar={() => irPara("negocio")}
                aoConcluir={() => setNegocioSalvo(true)}
              />
            ))}
          {estado === "negocio-interesse" && (
            <>
              <p>
                Quando quiser, explore os negócios locais no Mercado e conheça o que a comunidade
                procura.
              </p>
              {acao("Continuar", () => irPara("boas-vindas"))}
              {acao("Voltar", () => irPara("negocio"), true)}
            </>
          )}
          {estado === "boas-vindas" && (
            <>
              <p>Encontre informações e pessoas para acompanhar sua jornada.</p>
              {acao("Ir para o início", irInicio)}
            </>
          )}
          {estado === "retomar" && (
            <>
              <p>Você começou seu cadastro e pode continuar.</p>
              {acao("Continuar cadastro", () => irPara("cpf"))}
              {acao("Usar outra conta", () => irPara("conta"), true)}
            </>
          )}
          {estado === "convite" && (
            <>
              <p>Use o código recebido para aceitar seu convite.</p>
              <Campo
                id="convite-codigo"
                rotulo="Código do convite"
                valor={codigo}
                aoMudar={setCodigo}
              />
              <Campo id="convite-nome" rotulo="Nome completo" valor={nome} aoMudar={setNome} />
              <Campo id="convite-email" rotulo="E-mail do convite" valor={email} readOnly />
              {campoSenha("convite-senha")}
              {aceite()}
              {acao("Aceitar convite", () => irPara("cidade"), false, !aceitou)}
              {acao("Simular convite indisponível", () => irPara("convite-indisponivel"), true)}
            </>
          )}
          {estado === "convite-indisponivel" && (
            <>
              <p>O código não é válido ou não está mais disponível.</p>
              {acao("Tentar outro código", () => irPara("convite"))}
              {acao("Voltar para entrar", () => irPara("login"), true)}
            </>
          )}
          {estado === "apagada" && (
            <>
              <p>Esta é uma demonstração da tela de conta apagada.</p>
              {acao("Voltar ao início", irInicio)}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
