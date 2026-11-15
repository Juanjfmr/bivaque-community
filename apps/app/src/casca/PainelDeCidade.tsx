import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Selecao } from "@/components/bivaque/campos"
import { CIDADE_ATUAL, type CidadeDoCatalogo, lerCidadesDaUf, lerEstados } from "@/lib/dados/cidade"
import { useNavegacao } from "@/lib/navegacao/react"
import { useCasca } from "@/src/contexto/casca"

/**
 * O painel do chip de cidade (inventário §5.2: a ação `city` abre o diálogo de
 * cidade; `home-city` volta para a cidade da pessoa).
 *
 * Ele CONSULTA, não muda nada: escolher uma cidade abre `/app/cidade/<id>`,
 * onde a pessoa lê o Guia, os encontros e os anúncios de lá (regra aprovada em
 * 25/09/2026), e "a minha cidade" abre `/app/cidade/atual`. A cidade da sessão
 * só muda pelo perfil — mudar de cidade tem consequência, e essa jornada é do
 * F10-TROCA-PERFIL-PROPRIO.
 *
 * As cidades vêm do catálogo público que a entrada já usa
 * (`/api/localities`), porque navegar exige o id: nome de cidade não é
 * endereço.
 */
export function PainelDeCidade({ aoFechar }: { readonly aoFechar: () => void }) {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [ufs, setUfs] = useState<readonly string[]>([])
  const [uf, setUf] = useState("")
  const [cidades, setCidades] = useState<readonly CidadeDoCatalogo[]>([])
  const [cidadeId, setCidadeId] = useState("")
  const [falha, setFalha] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const leitura = new AbortController()
    void lerEstados({ signal: leitura.signal })
      .then((lista) => {
        if (!leitura.signal.aborted) setUfs(lista)
      })
      .catch(() => {
        if (!leitura.signal.aborted) setFalha("Não foi possível carregar os estados.")
      })
    return () => leitura.abort()
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: a UF é o que muda a lista
  useEffect(() => {
    if (uf === "") {
      setCidades([])
      return
    }
    const leitura = new AbortController()
    setCarregando(true)
    setCidadeId("")
    void lerCidadesDaUf(uf, { signal: leitura.signal })
      .then((lista) => {
        if (!leitura.signal.aborted) setCidades(lista)
      })
      .catch(() => {
        if (!leitura.signal.aborted) setFalha(`Não foi possível carregar as cidades de ${uf}.`)
      })
      .finally(() => {
        if (!leitura.signal.aborted) setCarregando(false)
      })
    return () => leitura.abort()
  }, [uf])

  // Navegar com a sobreposição aberta substitui a entrada (transicoes.ts), então
  // o painel não fecha "na mão": fechar antes com history.back() desfazia a
  // navegação que acabou de começar.
  const abrir = (id: string) => {
    void navegacao.irPara("cidade", { parametros: { id } })
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-(--on-surface-variant)">
        Você lê o Guia, os encontros e os anúncios da cidade escolhida. Publicar e participar
        continuam em {casca.cidadeDeCasa}.
      </p>
      {falha === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {falha}
        </p>
      )}
      <Selecao
        id="cidade-uf"
        rotulo="Estado (UF)"
        valor={uf}
        opcoes={ufs.map((sigla) => ({ valor: sigla, titulo: sigla }))}
        aoMudar={setUf}
      />
      <Selecao
        id="cidade-municipio"
        rotulo="Cidade"
        valor={cidadeId}
        opcoes={cidades.map((cidade) => ({ valor: cidade.id, titulo: cidade.nome }))}
        aoMudar={setCidadeId}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Botao tom="texto" onClick={aoFechar}>
          Cancelar
        </Botao>
        <Botao data-acao="abrir-minha-cidade" tom="texto" onClick={() => abrir(CIDADE_ATUAL)}>
          {`Minha cidade (${casca.cidadeDeCasa})`}
        </Botao>
        <Botao
          data-acao="abrir-cidade"
          disabled={cidadeId === "" || carregando}
          onClick={() => abrir(cidadeId)}
        >
          Ver esta cidade
        </Botao>
      </div>
    </div>
  )
}
