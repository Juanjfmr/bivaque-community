---
id: ADR-20260925-endereco-por-escolha
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-25
accepted_at: 2026-09-25
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Decisão do dono na sessão de 25/09/2026. Revisão independente ainda não rodou.
---

# Endereço é escolha de quem publica: anúncio e encontro

## Problem

O [ADR-20260909-anuncios-mercado-e-moradia](ADR-20260909-anuncios-mercado-e-moradia.md) (D5) limitava
o anúncio a cidade e bairro, nunca endereço. O local do encontro (`events.venue`) tinha uma trava
no banco que recusava "rua", "avenida", "condomínio", "CEP" e nomes de instalação militar. Para o
dono, o endereço é essencial ao anúncio, e as duas travas limitavam uma escolha que é de quem publica.

Palavras do dono em 25/09/2026:
- "O Bivaque não tem que limitar a escolha do usuário. Se ele quiser divulgar o endereço, a
  liberdade é dele, assim como em eventos."
- Sobre instalação militar: "São localizações que são encontradas no Google. Não há por que essa
  super proteção."

## Decision

Migration `20260925174442_endereco_por_escolha`:

- **Anúncio:** `listings.address` passa a existir, opcional, entre 3 e 200 caracteres. Quem
  anuncia decide se informa. Quando informado, é lido por quem lê o anúncio, pela mesma porta
  `private.can_read_listing`; nenhum acesso novo. O formulário avisa que o endereço aparece para
  quem vê o anúncio, inclusive quem consulta a cidade. O bairro continua um campo à parte.
- **Encontro:** `events.venue` aceita qualquer texto de até 200 caracteres. As travas de endereço
  e de instalação militar saem do banco e do contrato (`EventCreateSchema`).
- **Mensagem direta** (migration `20260925181213_mensagem_aceita_endereco`): o filtro de conteúdo
  `dm_message_no_pii` sai inteiro. O dono primeiro liberou endereço ("Também") e depois o resto
  ("Quero revogar tudo"). Com isso, CPF, patente, posto e graduação militar, OM, Portal da
  Transparência e endereço deixam de ser recusados no texto que um membro envia a outro. Só o
  tamanho (1 a 2000) continua limitado. O produto continua sem guardar CPF, posto, OM ou endereço
  como dado de perfil ou de verificação. O que alguém digitar fica na mensagem e sai com ela na
  exclusão de conta.
- **Guarda de regressão:** `rls-or-column-regression` proíbe coluna `address` em tabela pública.
  Agora ela abre exceção só para `listings.address`; a proibição segue valendo para perfil e
  qualquer outra tabela.
- **O que não muda:** o perfil do membro continua sem endereço residencial (AGENTS.md). O endereço
  aqui é de um anúncio ou de um encontro, publicado por decisão de quem publica.

Na prova de runtime apareceu um defeito anterior: publicar anúncio pela tela falhava, porque o
`INSERT … RETURNING` não passava pela policy de leitura. Ele foi corrigido na migration
`20260925175801_anuncio_dono_le_o_que_acabou_de_criar`, e o caso passou a ter teste.

## Alternatives considered

- **Manter as travas** (comportamento anterior): contraria a decisão do dono.
- **Endereço revelado só na conversa:** o dono recusou limitar a escolha.
- **Ponto de retirada no lugar do endereço no Mercado:** o dono recusou pelo mesmo motivo.

## Market or reference baseline

Marketplaces de classificados (OLX, Facebook Marketplace, QuintoAndar) deixam o anunciante
informar o endereço; plataformas de eventos (Meetup, Sympla) publicam o local com endereço.

## Proposed divergence from baseline

None.

## Evidence and sources

- `supabase/tests/endereco-por-escolha.sql`.
- `supabase/tests/events-private-venue-denials.sql`: as recusas viraram aceitação, e o tamanho
  continua recusado.
- `tests/unit/listings/address.test.ts` e `tests/unit/events/prohibited-fields.test.ts`.

## Benefits

Anúncio de imóvel e de item com endereço, e encontro com local preciso.

## Risks

Quem publica pode expor o próprio endereço. Com a consulta a outra cidade
([ADR-20260925-consulta-outra-cidade](ADR-20260925-consulta-outra-cidade.md)), um anúncio de
alcance cidade é lido por membros verificados de todo o país. O aviso no formulário diz isso.

## Reversal cost

Uma migration que recria as travas. Endereços já publicados precisariam ser apagados ou
mantidos, o que exige comunicação com quem anunciou.

## Success metric

Anúncios de imóvel publicados com endereço, e nenhuma denúncia de exposição indesejada.

## Reopen condition

Denúncia de uso indevido de endereço publicado.

## Approval

Juan, na sessão de 25/09/2026.
