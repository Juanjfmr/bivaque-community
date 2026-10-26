"use client"

import { useParams } from "@tanstack/react-router"
import { useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Icone } from "@/components/bivaque/icone"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"

/**
 * A Entrada da onda 8 (ADR-20261022-entrada-do-prototipo; protótipo:
 * features/entry/*), em versão de demonstração.
 *
 * V1: os doze estados do catálogo, cada um com o texto e o caminho de avanço.
 * O que é de backend — Google, consulta do CPF, envio de documento, convite e
 * exclusão de conta — fica declarado como tal; nada aqui autentica de verdade.
 */

const ORDEM = [
  "conta",
  "aceite",
  "cpf",
  "resultado",
  "cidade",
  "boas-vindas",
  "retomar",
  "analise",
  "login",
  "senha",
  "convite",
  "apagada",
] as const

type Estado = (typeof ORDEM)[number]

function ehEstado(valor: string): valor is Estado {
  return (ORDEM as readonly string[]).includes(valor)
}

export function Entrar() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const bruto = parametros["estado"] ?? "conta"
  const estado: Estado = ehEstado(bruto) ? bruto : "conta"
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [cpf, setCpf] = useState("")
  const [codigo, setCodigo] = useState("")
  const [momento, setMomento] = useState<"chegando" | "morando" | "saindo">("chegando")

  useRolagemEFoco(CARGA_CONCLUIDA)

  const irPara = (destino: Estado) =>
    void navegacao.irPara("entrar", { parametros: { estado: destino } })

  return (
    <section data-tela="entrar" className="mx-auto grid w-full max-w-md gap-4 px-4 py-6">
      {estado === "conta" ? (
        <>
          <Titulo
            titulo="Criar sua conta"
            texto="Seu nome, e-mail e senha. O CPF vem no passo seguinte."
          />
          <Campo id="entrar-nome" rotulo="Nome completo" valor={nome} aoMudar={setNome} />
          <Campo id="entrar-email" rotulo="E-mail" valor={email} aoMudar={setEmail} type="email" />
          <Campo
            id="entrar-senha"
            rotulo="Senha"
            valor={senha}
            aoMudar={setSenha}
            type="password"
            nota="Ao menos 8 caracteres, com letras e números."
          />
          <p className="text-[13px] text-(--on-surface-variant)">
            Li e aceito a{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void navegacao.irPara("privacidade")}
            >
              Política de privacidade
            </button>{" "}
            e o{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void navegacao.irPara("conduta")}
            >
              Código de conduta
            </button>
            .
          </p>
          <Botao onClick={() => irPara("aceite")}>Continuar</Botao>
          <Botao tom="texto" onClick={() => irPara("login")}>
            Já tenho conta
          </Botao>
        </>
      ) : null}

      {estado === "aceite" ? (
        <>
          <Titulo
            titulo="Aceite do Google"
            texto="Sua conta entra pelo Google; falta só aceitar o combinado da comunidade."
          />
          <p className="text-[13px] text-(--on-surface-variant)">
            O aceite fica registrado com data e versão — exigência do Google para apps com conta
            própria.
          </p>
          <Botao onClick={() => irPara("cpf")}>Li e aceito</Botao>
        </>
      ) : null}

      {estado === "cpf" ? (
        <>
          <Titulo
            titulo="Confirme seu vínculo"
            texto="O CPF é conferido na fonte oficial para confirmar o vínculo militar."
          />
          <Campo id="entrar-cpf" rotulo="CPF" valor={cpf} aoMudar={setCpf} inputMode="numeric" />
          <p className="text-[13px] text-(--on-surface-variant)">
            O número só é conferido e não fica salvo no Bivaque.
          </p>
          <Botao onClick={() => irPara("resultado")}>Conferir</Botao>
        </>
      ) : null}

      {estado === "resultado" ? (
        <>
          <Titulo titulo="Vínculo confirmado" texto="Tudo certo com a fonte oficial." />
          <Botao onClick={() => irPara("cidade")}>Continuar</Botao>
        </>
      ) : null}

      {estado === "analise" ? (
        <>
          <Titulo
            titulo="Vínculo em análise"
            texto="Recebemos o seu documento. A equipe responde em até 2 dias úteis e, enquanto isso, o conteúdo fica fechado."
          />
          <Botao tom="contornado" onClick={() => void navegacao.irPara("contato")}>
            Falar com a gente
          </Botao>
        </>
      ) : null}

      {estado === "cidade" ? (
        <>
          <Titulo
            titulo="Sua cidade e seu momento"
            texto={`O conteúdo do Bivaque é da cidade escolhida. A cidade atual é ${casca.cidade}.`}
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["chegando", "Estou chegando"],
                ["morando", "Moro aqui"],
                ["saindo", "Estou saindo"],
              ] as const
            ).map(([valor, rotulo]) => (
              <Botao
                key={valor}
                tom={momento === valor ? "tonal" : "contornado"}
                aria-pressed={momento === valor}
                onClick={() => setMomento(valor)}
              >
                {rotulo}
              </Botao>
            ))}
          </div>
          <Botao onClick={() => irPara("boas-vindas")}>Continuar</Botao>
        </>
      ) : null}

      {estado === "boas-vindas" ? (
        <>
          <Titulo
            titulo="Bem-vindo ao Bivaque"
            texto="O que a comunidade sabe fica disponível para quem chegar depois. Comece pelo Início."
          />
          <Botao onClick={() => void navegacao.irPara("inicio")}>Entrar no Bivaque</Botao>
        </>
      ) : null}

      {estado === "retomar" ? (
        <>
          <Titulo
            titulo="Continue de onde parou"
            texto="Você começou a entrada e ainda não terminou."
          />
          <Botao onClick={() => irPara("conta")}>Retomar</Botao>
        </>
      ) : null}

      {estado === "login" ? (
        <>
          <Titulo titulo="Entrar" texto="Use o e-mail e a senha da sua conta." />
          <Campo
            id="entrar-login-email"
            rotulo="E-mail"
            valor={email}
            aoMudar={setEmail}
            type="email"
          />
          <Campo
            id="entrar-login-senha"
            rotulo="Senha"
            valor={senha}
            aoMudar={setSenha}
            type="password"
          />
          <Botao onClick={() => void navegacao.irPara("inicio")}>Entrar</Botao>
          <Botao tom="texto" onClick={() => irPara("senha")}>
            Esqueci minha senha
          </Botao>
        </>
      ) : null}

      {estado === "senha" ? (
        <>
          <Titulo
            titulo="Esqueci minha senha"
            texto="Informe o e-mail da conta; enviamos o caminho de volta."
          />
          <Campo
            id="entrar-senha-email"
            rotulo="E-mail"
            valor={email}
            aoMudar={setEmail}
            type="email"
          />
          <p className="text-[13px] text-(--on-surface-variant)">
            Demonstração: nenhum e-mail é enviado.
          </p>
          <Botao onClick={() => irPara("login")}>Voltar para Entrar</Botao>
        </>
      ) : null}

      {estado === "convite" ? (
        <>
          <Titulo
            titulo="Convite de família"
            texto="Quem foi convidado entra pelo código de 7 dias, sem CPF."
          />
          <Campo
            id="entrar-convite"
            rotulo="Código do convite"
            valor={codigo}
            aoMudar={setCodigo}
          />
          <Botao onClick={() => irPara("conta")}>Aceitar convite</Botao>
        </>
      ) : null}

      {estado === "apagada" ? (
        <>
          <Titulo
            titulo="Conta apagada"
            texto="Seus dados saíram do Bivaque. Sentiremos sua falta."
          />
          <Botao onClick={() => void navegacao.irPara("inicio")}>Voltar ao início</Botao>
        </>
      ) : null}
    </section>
  )
}

function Titulo({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="grid gap-1">
      <Icone nome="lock" className="size-6 text-(--primary)" />
      <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
        {titulo}
      </h1>
      <p className="text-sm text-(--on-surface-variant)">{texto}</p>
    </div>
  )
}
