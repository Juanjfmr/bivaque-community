"use client"

import { useEffect, useState } from "react"

import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import { criarGrupo } from "@/lib/dados/grupos"
import {
  type CampoDoGrupo,
  corpoDoGrupo,
  type ErrosDoGrupo,
  errosDoGrupo,
  foiAbortada,
  grupoValido,
  LIMITES_DO_GRUPO,
  mensagemDaCriacao,
  type RascunhoDoGrupo,
} from "@/src/grupos/novo"
import { AreaDeTexto, Botao, Campo, CampoDeEscolha } from "@/src/pecas/pecas"

/**
 * A folha de criar grupo, aberta pelo Diretório.
 *
 * Quem cria vira dono: a RPC `create_group` grava o vínculo `owner` e o grupo é
 * de quem está na sessão. O alcance não está aqui — o grupo nasce na cidade do
 * vínculo `current`, resolvida no servidor —, e o que a folha oferece é a
 * escolha de quem pode entrar: aberto entra na hora, fechado pede aprovação.
 *
 * O erro nasce no campo que o originou, e a ação primária fica desligada
 * enquanto o nome não fecha. Ao gravar, a tela abre o grupo criado: o que
 * aparece depois é o que o banco devolveu.
 */
export function CriarGrupo({
  aoFechar,
  aoSalvar,
}: {
  readonly aoFechar: () => void
  readonly aoSalvar: (id: string) => void
}) {
  const [rascunho, setRascunho] = useState<RascunhoDoGrupo>({
    nome: "",
    descricao: "",
    regras: "",
    fechado: false,
  })
  // O erro de um campo aparece depois que a pessoa passou por ele: não acusa
  // quem ainda não digitou nada, e continua no lugar enquanto não for corrigido.
  const [tocados, setTocados] = useState<ReadonlySet<CampoDoGrupo>>(new Set())
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Fechar a folha cancela a gravação que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])

  const erros: ErrosDoGrupo = errosDoGrupo(rascunho)
  const valido = grupoValido(rascunho)
  const erroDe = (campo: CampoDoGrupo): string | null =>
    tocados.has(campo) ? (erros[campo] ?? null) : null
  const tocar = (campo: CampoDoGrupo): void =>
    setTocados((atual) => (atual.has(campo) ? atual : new Set(atual).add(campo)))
  const mudar = (pedaco: Partial<RascunhoDoGrupo>): void =>
    setRascunho((atual) => ({ ...atual, ...pedaco }))

  async function gravar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (salvando || !valido) return
    setErroDoEnvio(null)
    setSalvando(true)
    try {
      const criado = await criarGrupo(corpoDoGrupo(rascunho), { signal: controle.signal })
      aoSalvar(criado.id)
    } catch (falha: unknown) {
      // O que a pessoa digitou continua na folha.
      if (!foiAbortada(falha)) setErroDoEnvio(mensagemDaCriacao(falha))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Sobreposicao
      id="grupo-novo"
      titulo="Novo grupo"
      descricao="O grupo fica na cidade do seu perfil. Quem cria administra e aprova as entradas."
      aoFechar={aoFechar}
    >
      <form onSubmit={(evento) => void gravar(evento)} noValidate>
        <div className="pc pc-embutido grid gap-4">
          <Campo
            id="grupo-nome"
            rotulo="Nome do grupo"
            value={rascunho.nome}
            onChange={(evento) => mudar({ nome: evento.target.value })}
            onBlur={() => tocar("nome")}
            erro={erroDe("nome")}
            maxLength={LIMITES_DO_GRUPO.nome}
            autoComplete="off"
            required
          />
          <AreaDeTexto
            id="grupo-descricao"
            rotulo="Sobre o grupo"
            value={rascunho.descricao}
            onChange={(evento) => mudar({ descricao: evento.target.value })}
            onBlur={() => tocar("descricao")}
            erro={erroDe("descricao")}
            rows={3}
          />
          <AreaDeTexto
            id="grupo-regras"
            rotulo="Regras do grupo"
            value={rascunho.regras}
            onChange={(evento) => mudar({ regras: evento.target.value })}
            onBlur={() => tocar("regras")}
            erro={erroDe("regras")}
            rows={3}
          />
          <CampoDeEscolha
            id="grupo-entrada"
            rotulo="Quem pode entrar"
            value={rascunho.fechado ? "fechado" : "aberto"}
            onChange={(evento) => mudar({ fechado: evento.target.value === "fechado" })}
            opcoes={[
              { valor: "aberto", rotulo: "Aberto — entra quem quiser" },
              { valor: "fechado", rotulo: "Fechado — pede aprovação" },
            ]}
          />

          {erroDoEnvio === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erroDoEnvio}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Botao tom="texto" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao
              tom="principal"
              type="submit"
              disabled={salvando || !valido}
              carregando={salvando}
            >
              {salvando ? "Criando…" : "Criar grupo"}
            </Botao>
          </div>
        </div>
      </form>
    </Sobreposicao>
  )
}
