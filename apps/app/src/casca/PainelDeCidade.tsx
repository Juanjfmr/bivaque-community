"use client"

import { useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { useCasca } from "@/src/contexto/casca"

/**
 * A troca de cidade (inventário §5.2: a ação `city` abre o diálogo de cidade;
 * `apply-city` valida e grava `state.city`; `home-city` volta para a cidade da
 * pessoa).
 *
 * Aqui vive a parte **da casca**: o chip mostra a cidade, este painel grava a
 * cidade que a pessoa está vendo, e a faixa de visita aparece quando ela não é a
 * de casa. A lista de cidades da cidade e o resto do formulário de chegada
 * (`mode`, `arrival`, `leaveDate`, `dest`) são dado da jornada de entrada, que
 * chega na onda 1d/8.
 */
export function PainelDeCidade({ aoFechar }: { readonly aoFechar: () => void }) {
  const casca = useCasca()
  const [cidade, definirCidade] = useState(casca.cidade)

  return (
    <div className="grid gap-4">
      <Campo
        id="cidade-destino"
        rotulo="Cidade"
        valor={cidade}
        aoMudar={definirCidade}
        data-campo="cidade"
        autoComplete="address-level2"
        nota="Escreva a cidade que você quer ver agora."
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Botao tom="texto" onClick={aoFechar}>
          Cancelar
        </Botao>
        {casca.vendoOutraCidade ? (
          <Botao
            tom="texto"
            data-acao="voltar-para-casa"
            onClick={() => {
              casca.voltarParaCasa()
              aoFechar()
            }}
          >
            {`Voltar para ${casca.cidadeDeCasa}`}
          </Botao>
        ) : null}
        <Botao
          data-acao="aplicar-cidade"
          onClick={() => {
            casca.trocarCidade(cidade)
            aoFechar()
          }}
        >
          Ver esta cidade
        </Botao>
      </div>
    </div>
  )
}
