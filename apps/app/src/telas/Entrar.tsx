import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Campo } from "@/components/bivaque/campos"
import { FormularioNegocio } from "@/components/bivaque/formulario-negocio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { dadosDoApp } from "@/lib/dados"
import type { Grupo } from "@/lib/dados/contrato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { ESTADOS_DA_ENTRADA, type EstadoDaEntrada } from "@/lib/navegacao/rotas"

// Composição adaptada de Login Form Card, Felipe Menezes, licença MIT:
// https://21st.dev/@felipemenezes098/components/card-06
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
  const link = (destino: EstadoDaEntrada, texto: string) => (
    <button type="button" className="entrada-link" onClick={() => irPara(destino)}>
      {texto}
    </button>
  )
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
  const google = () => acao("Continuar com Google", () => irPara("aceite"), true)
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
          {estado === "conta" && (
            <>
              <p>Crie sua conta para fazer parte da comunidade.</p>
              <Campo
                id="entrar-nome"
                rotulo="Nome completo"
                valor={nome}
                aoMudar={setNome}
                autoComplete="name"
              />
              <Campo
                id="entrar-email"
                rotulo="E-mail"
                valor={email}
                aoMudar={setEmail}
                type="email"
                autoComplete="email"
              />
              {campoSenha("entrar-senha")}
              <p className="entrada-nota">Ao menos 8 caracteres, com letras e números.</p>
              {aceite()}
              {acao("Criar conta", () => irPara("cpf"), false, !aceitou)}
              <div className="entrada-divisor">ou</div>
              {google()}
              <p className="entrada-rodape">Já tem conta? {link("login", "Entrar")}</p>
            </>
          )}
          {estado === "login" && (
            <>
              <p>Entre com o e-mail e a senha da sua conta.</p>
              <Campo
                id="login-email"
                rotulo="E-mail"
                valor={email}
                aoMudar={setEmail}
                type="email"
                autoComplete="email"
              />
              {campoSenha("login-senha")}
              <div className="entrada-direita">{link("senha", "Esqueci minha senha")}</div>
              {acao("Entrar", irInicio)}
              <div className="entrada-divisor">ou</div>
              {google()}
              <p className="entrada-rodape">Ainda não tem conta? {link("conta", "Criar conta")}</p>
            </>
          )}
          {estado === "aceite" && (
            <>
              <p>Leia e aceite para continuar com sua conta Google.</p>
              {aceite()}
              {acao("Aceitar e continuar", () => irPara("cpf"), false, !aceitou)}
            </>
          )}
          {estado === "cpf" && (
            <>
              <p>Vamos conferir seu CPF para confirmar seu vínculo.</p>
              <Campo
                id="entrar-cpf"
                rotulo="CPF"
                valor={cpf}
                aoMudar={setCpf}
                inputMode="numeric"
                autoComplete="off"
              />
              <details>
                <summary>Por que pedimos seu CPF?</summary>
                <p>Para conferir o vínculo com a comunidade.</p>
              </details>
              {acao("Continuar", () => irPara("resultado"))}
              {acao("Simular consulta indisponível", () => irPara("consulta-indisponivel"), true)}
              <p className="entrada-rodape">É familiar? {link("convite", "Usar convite")}</p>
            </>
          )}
          {estado === "resultado" && (
            <>
              <p>Tudo certo na demonstração. Agora escolha sua cidade.</p>
              {acao("Continuar", () => irPara("cidade"))}
            </>
          )}
          {estado === "consulta-indisponivel" && (
            <>
              <p>Tente novamente ou envie sua identidade para análise.</p>
              {acao("Tentar novamente", () => irPara("cpf"))}
              {acao("Enviar identidade", () => irPara("documento"), true)}
            </>
          )}
          {estado === "documento" && (
            <>
              <p>
                Se a consulta por CPF não for concluída, você pode enviar sua identidade militar
                digital.
              </p>
              <label className="entrada-arquivo" htmlFor="documento">
                Selecionar arquivo
                <input
                  id="documento"
                  type="file"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="entrada-nota">
                Envie um único arquivo completo.{arquivo ? ` Selecionado: ${arquivo.name}` : ""}
              </p>
              {acao("Enviar arquivo", () => irPara("analise"), false, !arquivo)}
              {link("cpf", "Voltar")}
            </>
          )}
          {estado === "analise" && (
            <>
              <p>Na demonstração, acompanhe as etapas da análise por aqui.</p>
              <ol className="entrada-etapas">
                <li>Documento enviado</li>
                <li>Em análise</li>
                <li>Resultado</li>
              </ol>
              <label className="entrada-aceite">
                <input
                  type="checkbox"
                  checked={avisar}
                  onChange={(e) => setAvisar(e.target.checked)}
                />{" "}
                Avise-me quando houver uma atualização.
              </label>
              {acao("Substituir documento", () => irPara("documento"), true)}
            </>
          )}
          {estado === "cidade" && (
            <>
              <Campo
                id="cidade"
                rotulo="Cidade"
                valor={cidade}
                aoMudar={setCidade}
                placeholder="Busque sua cidade"
              />
              <fieldset className="entrada-momento">
                <legend>Seu momento</legend>
                {(
                  [
                    ["chegando", "Chegando"],
                    ["morando", "Moro aqui"],
                    ["saindo", "Saindo"],
                  ] as const
                ).map(([valor, texto]) => (
                  <label key={valor}>
                    <input
                      type="radio"
                      name="momento"
                      value={valor}
                      checked={momento === valor}
                      onChange={() => setMomento(valor)}
                    />
                    {texto}
                  </label>
                ))}
              </fieldset>
              <Campo
                id="como-chamar"
                rotulo="Como quer ser chamado"
                valor={nome}
                aoMudar={setNome}
              />
              {momento !== "morando" && (
                <Campo
                  id="data"
                  rotulo={momento === "chegando" ? "Data de chegada" : "Data de saída"}
                  valor={data}
                  aoMudar={setData}
                  type="date"
                />
              )}
              {momento === "saindo" && (
                <Campo
                  id="destino"
                  rotulo="Cidade de destino"
                  valor={destino}
                  aoMudar={setDestino}
                />
              )}
              {acao("Continuar", () => irPara("sugestoes-grupos"))}
            </>
          )}
          {estado === "sugestoes-grupos" && (
            <>
              <p>Conheça alguns grupos de {cidade || "sua cidade"}. Escolher é opcional.</p>
              <p className="entrada-nota">Demonstração: selecionar grupos não cria participação.</p>
              {grupos === null ? (
                <p role="status">Buscando sugestões...</p>
              ) : grupos.length === 0 ? (
                <p>Não há sugestões de demonstração para esta cidade. Você pode continuar.</p>
              ) : (
                <fieldset className="entrada-grupos">
                  <legend>Grupos sugeridos</legend>
                  {grupos.map((grupo) => (
                    <label key={grupo.id} className="entrada-grupo">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(grupo.id)}
                        onChange={(e) => {
                          const marcado = e.target.checked
                          setSelecionados((anteriores) =>
                            marcado
                              ? [...anteriores, grupo.id]
                              : anteriores.filter((id) => id !== grupo.id),
                          )
                        }}
                      />
                      <span>
                        <strong>{grupo.name}</strong>
                        {grupo.description && <small>{grupo.description}</small>}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {acao("Continuar", () => irPara("negocio"))}
              {acao("Escolher depois", () => irPara("negocio"), true)}
            </>
          )}
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
          {estado === "senha" && (
            <>
              <p>Informe o e-mail da sua conta para receber as instruções.</p>
              <Campo
                id="recuperar-email"
                rotulo="E-mail"
                valor={email}
                aoMudar={setEmail}
                type="email"
              />
              {acao("Enviar instruções", () => setEnviado(true))}
              {enviado && <p role="status">Demonstração: nenhum e-mail foi enviado.</p>}
              {link("login", "Voltar para entrar")}
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
