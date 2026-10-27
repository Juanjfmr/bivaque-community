import { useParams } from "@tanstack/react-router"
import { useState } from "react"
import { Campo } from "@/components/bivaque/campos"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
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
  const [cidade, setCidade] = useState("")
  const [destino, setDestino] = useState("")
  const [data, setData] = useState("")
  const [momento, setMomento] = useState<"chegando" | "morando" | "saindo">("morando")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [avisar, setAvisar] = useState(false)
  const [aceitou, setAceitou] = useState(false)

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
              {acao("Continuar", () => irPara("boas-vindas"))}
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
