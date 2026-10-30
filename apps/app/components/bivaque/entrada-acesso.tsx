import { useState } from "react"

import { Campo } from "@/components/bivaque/campos"
import { Icone } from "@/components/bivaque/icone"
import { IconeGoogle } from "@/components/bivaque/icone-google"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { EstadoDaEntrada } from "@/lib/navegacao/rotas"

/**
 * Composição A do acesso (login, criar conta, recuperar senha): o painel da foto
 * à esquerda e a coluna do formulário à direita; no celular a foto vira faixa e
 * o formulário vem abaixo.
 *
 * Anatomia adaptada do Split Sign In Form
 * (https://21st.dev/@diarmuradi/components/sign-in-3), reproduzida com os
 * componentes do app e sem copiar o código do bloco.
 *
 * Os outros estados da entrada continuam no cartão de `telas/Entrar.tsx`.
 */

export type EstadoDeAcesso = Extract<EstadoDaEntrada, "login" | "conta" | "senha">

const TITULOS: Readonly<Record<EstadoDeAcesso, string>> = {
  conta: "Vamos começar.",
  login: "Que bom ter você de volta.",
  senha: "Esqueci minha senha.",
}

const APOIOS: Readonly<Record<EstadoDeAcesso, string>> = {
  conta: "Crie sua conta para fazer parte da comunidade.",
  login: "Entre com o e-mail e a senha da sua conta.",
  senha: "Informe o e-mail da sua conta para receber as instruções.",
}

const FOTOS: Readonly<Record<EstadoDeAcesso, string>> = {
  conta: "demo/chegada.webp",
  login: "demo/landing-hero.webp",
  senha: "demo/mesa.webp",
}

// "curto" é o rótulo do celular e "longo" o do desktop; quando são iguais, o
// item entra uma vez só para o texto não existir duas vezes no DOM.
const ITENS_DE_VALOR = [
  { icone: "map", longo: "Guia da cidade", curto: "Guia da cidade" },
  { icone: "groups", longo: "Comunidades da sua cidade", curto: "Comunidades" },
  {
    icone: "verified_user",
    longo: "Serviços indicados por quem já mora lá",
    curto: "Serviços indicados",
  },
] as const

export function EntradaAcesso({
  estado,
  nome,
  aoMudarNome,
  email,
  aoMudarEmail,
  senha,
  aoMudarSenha,
  aceitou,
  aoAceitar,
  instrucoesEnviadas,
  aoEnviarInstrucoes,
  aoIrPara,
  aoEntrar,
  aoAbrirPrivacidade,
  aoAbrirConduta,
}: {
  estado: EstadoDeAcesso
  nome: string
  aoMudarNome: (valor: string) => void
  email: string
  aoMudarEmail: (valor: string) => void
  senha: string
  aoMudarSenha: (valor: string) => void
  aceitou: boolean
  aoAceitar: (valor: boolean) => void
  instrucoesEnviadas: boolean
  aoEnviarInstrucoes: () => void
  aoIrPara: (destino: EstadoDaEntrada) => void
  aoEntrar: () => void
  aoAbrirPrivacidade: () => void
  aoAbrirConduta: () => void
}) {
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const base = import.meta.env.BASE_URL

  // O "Esqueci minha senha" fica na linha do rótulo e, por isso, antes do campo
  // na ordem do DOM e do Tab.
  const campoDeSenha = (id: string, comLink: boolean, nota?: string) => (
    <div className="entrada-acesso-senha">
      <div className="entrada-acesso-rotulo-linha">
        <label htmlFor={id}>Senha</label>
        {comLink ? (
          <button type="button" className="entrada-acesso-link" onClick={() => aoIrPara("senha")}>
            Esqueci minha senha
          </button>
        ) : null}
      </div>
      <div className="entrada-acesso-senha-campo">
        <Input
          id={id}
          type={mostrarSenha ? "text" : "password"}
          value={senha}
          onChange={(evento) => aoMudarSenha(evento.target.value)}
          autoComplete={estado === "login" ? "current-password" : "new-password"}
          aria-describedby={nota === undefined ? undefined : `${id}-nota`}
        />
        <button
          type="button"
          className="entrada-acesso-mostrar"
          onClick={() => setMostrarSenha(!mostrarSenha)}
        >
          {mostrarSenha ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {nota === undefined ? null : (
        <p id={`${id}-nota`} className="entrada-acesso-nota">
          {nota}
        </p>
      )}
    </div>
  )

  const googleEDivisor = (
    <>
      <Button
        type="button"
        variant="outline"
        className="entrada-acesso-botao entrada-acesso-google"
        onClick={() => aoIrPara("aceite")}
      >
        <IconeGoogle />
        Continuar com Google
      </Button>
      <div className="entrada-acesso-divisor">ou continue com e-mail</div>
    </>
  )

  return (
    <section data-tela="entrar" data-composicao="acesso" className="entrada-acesso">
      <div className="entrada-acesso-marca">
        <picture>
          <source
            media="(prefers-color-scheme: dark)"
            srcSet={`${base}brand/bivaque-logo-horizontal-white.svg`}
          />
          <img src={`${base}brand/bivaque-logo-horizontal.svg`} alt="Bivaque" />
        </picture>
      </div>

      <div className="entrada-acesso-painel">
        {/* Foto decorativa: a frase da marca é texto real, não imagem. */}
        <img className="entrada-acesso-foto" src={`${base}${FOTOS[estado]}`} alt="" />
        <span className="entrada-acesso-veu" data-topo={estado === "conta" ? "sim" : "nao"} />
        <div className="entrada-acesso-faixa">
          {estado === "conta" ? (
            <p className="entrada-acesso-etiqueta">
              Militares federais, veteranos, pensionistas e famílias
            </p>
          ) : null}
          <p className="entrada-acesso-frase">
            Muda a cidade.
            <br />
            Fica a sua rede.
          </p>
        </div>
        {estado === "conta" ? (
          <div className="entrada-acesso-valor">
            <ul className="entrada-acesso-itens">
              {ITENS_DE_VALOR.map((item) => (
                <li key={item.icone}>
                  <span className="entrada-acesso-icone">
                    <Icone nome={item.icone} className="size-5" />
                  </span>
                  {item.curto === item.longo ? (
                    <span>{item.longo}</span>
                  ) : (
                    <>
                      <span className="entrada-acesso-longo">{item.longo}</span>
                      <span className="entrada-acesso-curto">{item.curto}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="entrada-acesso-vinculo">Só entra quem tem o vínculo confirmado.</p>
          </div>
        ) : null}
      </div>

      <div className="entrada-acesso-formulario">
        {estado === "senha" && !instrucoesEnviadas ? (
          <button type="button" className="entrada-acesso-voltar" onClick={() => aoIrPara("login")}>
            <Icone nome="arrow_back" className="size-4" />
            Voltar para entrar
          </button>
        ) : null}

        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1}>
          {TITULOS[estado]}
        </h1>
        <p className="entrada-acesso-apoio">{APOIOS[estado]}</p>

        {estado === "conta" ? (
          <p className="entrada-acesso-tempo">
            <Icone nome="schedule" className="size-5" />
            Leva cerca de 2 minutos.
          </p>
        ) : null}

        {estado === "senha" ? null : googleEDivisor}

        {estado === "conta" ? (
          <>
            <Campo
              id="entrar-nome"
              rotulo="Nome completo"
              valor={nome}
              aoMudar={aoMudarNome}
              autoComplete="name"
            />
            <Campo
              id="entrar-email"
              rotulo="E-mail"
              valor={email}
              aoMudar={aoMudarEmail}
              type="email"
              autoComplete="email"
            />
            {campoDeSenha("entrar-senha", false, "Ao menos 8 caracteres, com letras e números.")}
            <div className="entrada-acesso-aceite">
              <input
                id="aceite-entrada"
                type="checkbox"
                checked={aceitou}
                onChange={(evento) => aoAceitar(evento.target.checked)}
              />
              <span>
                <label htmlFor="aceite-entrada">Li e concordo com a</label>{" "}
                <button type="button" className="entrada-acesso-link" onClick={aoAbrirPrivacidade}>
                  Política de privacidade
                </button>{" "}
                e o{" "}
                <button type="button" className="entrada-acesso-link" onClick={aoAbrirConduta}>
                  Código de conduta
                </button>
                .
              </span>
            </div>
            <Button
              type="button"
              className="entrada-acesso-botao"
              onClick={() => aoIrPara("cpf")}
              disabled={!aceitou}
            >
              Criar conta
            </Button>
            <p className="entrada-acesso-rodape">
              Já tem conta?{" "}
              <button
                type="button"
                className="entrada-acesso-link"
                onClick={() => aoIrPara("login")}
              >
                Entrar
              </button>
            </p>
          </>
        ) : null}

        {estado === "login" ? (
          <>
            <Campo
              id="login-email"
              rotulo="E-mail"
              valor={email}
              aoMudar={aoMudarEmail}
              type="email"
              autoComplete="email"
            />
            {campoDeSenha("login-senha", true)}
            <Button type="button" className="entrada-acesso-botao" onClick={aoEntrar}>
              Entrar
            </Button>
            <p className="entrada-acesso-rodape">
              Ainda não tem conta?{" "}
              <button
                type="button"
                className="entrada-acesso-link"
                onClick={() => aoIrPara("conta")}
              >
                Criar conta
              </button>
            </p>
          </>
        ) : null}

        {estado === "senha" ? (
          <>
            <Campo
              id="senha-email"
              rotulo="E-mail"
              valor={email}
              aoMudar={aoMudarEmail}
              type="email"
              autoComplete="email"
            />
            {instrucoesEnviadas ? (
              <p role="status" className="entrada-acesso-status">
                <IconeEnvelope />
                <span>
                  Se houver uma conta com este e-mail, as instruções chegam em instantes. Confira
                  também o spam.
                </span>
              </p>
            ) : null}
            <Button
              type="button"
              className="entrada-acesso-botao"
              onClick={instrucoesEnviadas ? () => aoIrPara("login") : aoEnviarInstrucoes}
            >
              {instrucoesEnviadas ? "Voltar para entrar" : "Enviar instruções"}
            </Button>
          </>
        ) : null}
      </div>
    </section>
  )
}

/** O envelope do aviso de instruções: traço, sem ser Material Symbol do app. */
function IconeEnvelope() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="entrada-acesso-envelope"
    >
      <path
        d="M3 6.5h18v11H3zM3.6 6.9 12 13.2l8.4-6.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="18"
        cy="18.2"
        r="3.3"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="m16.6 18.1.9.9 1.8-1.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
