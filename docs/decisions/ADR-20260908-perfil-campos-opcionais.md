---
id: ADR-20260908-perfil-campos-opcionais
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-17
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review:
---

# Perfil: campos opcionais com visibilidade por campo

## Problem

A prancha 51-web-perfil e a [correção 6 do responsável](../design/visual-guide-2026-09-06/DECISOES-2026-09-07.md)
autorizam campos autodeclarados e opcionais no perfil, cada um com um controle
**"Exibir no perfil" desligado por padrão**, alterável e removível depois.

A autorização de **produto** existe desde 07/09. O **contrato técnico** não. Sem
ele, a tela não pode ser construída: `RECON-005` foi recusado pelo validador de
contrato, que elevou a tarefa para R3 automaticamente por tocar visibilidade de
dado pessoal — corretamente, porque decidir onde o dado mora, quem lê e como
some não é escolha de agente.

Enquanto isso, a tela `/profile` segue com a composição antiga, e o controle de
visibilidade não existe em lugar nenhum do produto.

## Decision

Este ADR pede autorização para **três** decisões técnicas separadas. Elas podem
ser aprovadas em conjunto ou uma a uma; nenhuma delas é implementável antes da
aprovação.

### D1 — Onde a visibilidade mora

A visibilidade é **por campo**, não por perfil. Uma coluna de visibilidade
global não expressa "mostro minha Força Armada mas não minha OM".

Proposta: uma tabela `profile_field_visibility` com `(user_id, field, visible)`,
RLS que só permite ao dono ler e escrever a própria linha, e leitura pelos
outros mediada pela mesma RPC que já filtra o perfil por viewer
(`profile_is_visible_to_viewer`). O padrão de toda linha ausente é **invisível**
— ausência nunca significa "pode mostrar".

**A coluna e a política que a lê entram na mesma migration.** Esta regra já
custou quatro vazamentos de privacidade a este repositório.

**Reconciliação com o que foi implementado (17/09/2026).** A D1 descrevia uma
tabela `profile_field_visibility (user_id, field, visible)` **separada** do valor.
O que existe na `main` — e em produção — é `public.profile_affiliations`
(migration `20260909020733`), com **uma linha por campo** carregando
`(user_id, field, value, is_visible)`. A decisão de produto é a mesma; o lugar do
dado mudou, e por um motivo que este repositório já aprendeu: sob
`profiles_select_visible_in_locality`, que libera a linha inteira de `profiles`
a quem compartilha cidade, um booleano de visibilidade **ao lado do valor** seria
decorativo — RLS é por linha, então o campo oculto continuaria legível pela API. Com
uma linha por campo, ocultar deixa de ser uma coluna que o leitor ignora e passa a
ser uma linha que ele não enxerga.

**Ordem dos fatos, registrada sem maquiagem:** a tabela foi escrita em 09/09 e o
cabeçalho dela cita esta ADR como "aprovado" — mas o frontmatter seguia
`proposed`. A autorização de **produto** existia desde a correção de 07/09; o que
faltava era a formalização, e o efeito prático disso é que o campo chegou a
produção (lote AH, 17/09) antes de a ADR virar `approved`. O conteúdo sempre foi o
que o responsável autorizou; o carimbo é que veio depois — e é exatamente o tipo de
inversão que a regra "nada é implementável antes da aprovação" existe para impedir.

### D2 — Quais campos entram agora

Somente **Força Armada** (Marinha, Exército, Aeronáutica) e **Organização
Militar**, que são os dois que a correção de 07/09 autoriza explicitamente.

O [`ADR-20260811-om-declarada`](ADR-20260811-om-declarada.md) propunha um
conjunto maior — status, turma e outros. Esse escopo **não** é aprovado por
tabela: a correção do responsável nomeia dois campos, e ampliar por conta
própria seria inventar produto.

Continua proibido persistir: CPF cru, payload do Portal, OM **inferida** pela
verificação, posto, patente e endereço residencial. O que a pessoa declara é
categoricamente diferente do que o Estado afirma, e o produto não pode
confundir os dois nem exibir selo de verificação sobre um dado autodeclarado.

### D3 — Como o dado some

Remover o campo apaga a linha, não a esconde. Um campo removido não deixa
resíduo legível por ninguém — nem por operador, nem em log, nem em notificação
já enviada. O teste de remoção é parte da mesma entrega, com prova de que a
leitura por terceiro deixa de retornar o valor.

## Threat model (enumeração)

Escrito em 17/09/2026 como pré-requisito 2 da aprovação. A pergunta que ele
responde: **o que um membro mal-intencionado consegue fazer sabendo a Força
Armada ou a OM de outro?**

**O que está em jogo.** Não é só o valor declarado, são dois ativos distintos: (a)
a declaração em si, e (b) **o fato de a pessoa ter declarado algo**. O segundo
vaza sozinho se a mera existência de uma linha for observável.

**Adversários e o que cada um consegue hoje:**

| Adversário | Capacidade | Por que não passa |
|---|---|---|
| Membro legítimo varrendo perfis | lê o perfil de quem compartilha **localidade** (a policy de afiliação só usa `shares_locality_with`; "comunidade" não entra) | a visibilidade é **por campo** e o padrão é invisível: campo sem linha com `visible = true` não é devolvido — mas quando o é, é devolvido em **lote** (ver defeito da regra 3) |
| Membro procurando o que foi escondido | tenta distinguir "invisível" de "não declarado" | a RPC devolve a MESMA resposta nos dois casos (a linha ausente e a linha invisível produzem o mesmo perfil filtrado) — não há oráculo |
| Anônimo (sem sessão) | consulta a Data API | `anon` não tem privilégio na tabela nem EXECUTE na RPC de perfil |
| Conta suspensa ou removida | mantém token antigo | o veto de conta suspensa já corta a leitura de perfil; e remover o campo apaga a linha (D3) |
| Operação (operador/SQL do painel) | acesso legitimamente amplo a denúncias e admissões | a tabela não entra em nenhuma tela de operação, e não há policy de leitura para operador — só o dono e o viewer autorizado |
| Quem já viu antes de o campo ser desligado | memória, print, anotação | **não há mitigação técnica** e o produto não pode prometer o contrário: é exatamente o que o texto de consentimento diz |
| Correlação externa | cruza OM + bairro + nome para identificar alguém | o campo é opcional e desligado por padrão; não há selo de verificação sobre dado autodeclarado; nenhum endpoint novo agrega visibilidades em lote |

**Regras que o modelo impõe ao contrato (e viram teste) — com o estado
VERIFICADO em 17/09/2026 pelo crítico adversarial, não com o estado desejado:**
1. Ausência de linha = **invisível**. Nunca "pode mostrar". — ✅ verdadeiro, por
   RLS de linha.
2. Coluna e policy nascem na **mesma migration** — ✅ verdadeiro (migration
   `20260909020733`).
3. "Leitura por terceiro passa **só** pela RPC de perfil" — ❌ **FALSO no
   código.** `profile_is_visible_to_viewer` devolve `boolean`, não campo; a
   leitura real é consulta direta na Data API com o cliente da sessão
   (`profile/[userId]/page.tsx`), e a RPC é só portão booleano da página. Pior:
   com `GRANT SELECT` a `authenticated` numa tabela do schema `public`, o
   PostgREST expõe o endpoint e **um único request lista todas as declarações
   visíveis de quem compartilha a cidade** — o "todos da OM X" que o produto-mãe
   proibia. RLS limita por linha; **não impede listagem**.
4. Remover **apaga**: sem histórico, sem `deleted_at`, sem log com o valor. —
   ✅ verdadeiro para a aplicação (DELETE real, sem trigger/outbox na tabela).
   Ressalva honesta: `DELETE` não apaga WAL, backup físico nem tupla morta antes
   do vacuum. A promessa correta é "some da API", não "some da infraestrutura";
   apagar de verdade em backup é prazo de LGPD, não de migration.
5. "Nenhum caminho de `service_role` lê a tabela" — ❌ **FALSO: a própria
   migration concede DML total a `service_role`**, que bypassa RLS e enxerga
   `is_visible = false`. A página evita esse caminho de propósito, mas nada trava
   o grant.
6. O valor não entra em log de aplicação nem em payload de notificação — ✅
   verdadeiro (a action não loga valor; não há trigger de notificação).

**Defeitos verificados em 17/09/2026 (crítico adversarial, veredito FAIL) — e
CORRIGIDOS no mesmo dia** pela migration
`20260918011938_profile_affiliations_no_bulk_read.sql`, com o escopo escolhido
pelo responsável (opção 1: revogar a listagem e servir por RPC por-alvo):

| Defeito | Correção | Prova |
|---|---|---|
| Enumeração em lote (a tabela era listável) | a policy de SELECT volta a ser **só do dono**; a leitura de terceiro passa por `public.profile_affiliations_for(p_target_user_id)` | T1 no pgTAP: `count(distinct user_id)` de terceiros = 0 |
| Veto de suspensão não corta leitura | a RPC recusa quando `is_account_suspended(auth.uid())` | T4 |
| Titular com exclusão pendente exposto | a RPC recusa quando há `account_deletion_requests` não finalizado para o alvo | T5 |
| OM aceitava posto, patente e endereço | constraint `profile_affiliations_om_no_rank_or_address` (paridade com a bio), declarada `NOT VALID` para não invalidar a migration sobre dado existente | assert de recusa no pgTAP |
| "leitura passa pela RPC" era falso | agora é literalmente o mecanismo: a tela de terceiro consome a RPC | captura `.visual/recon-loteAM-perfil6` mostra "Força Armada: Exército" lida por alvo, 0 achados |
| regra 5 (service_role) | a regra foi **corrigida no texto**, não no código: o grant a `service_role` existe e é operacional. Manter a promessa falsa era o defeito, não o grant | — |

**Os seis testes negativos que faltavam agora existem** (T1 não-enumeração em
lote; T2 oculto indistinguível de não-declarado; T3 `anon` sem SELECT e sem
EXECUTE; T4 suspenso com token válido lê 0; T5 exclusão pendente lê 0; T6 remoção
apaga para o dono **e** para o terceiro). A suíte canônica foi de 1569 para
**1581 asserts PASS**, com `profile-affiliations.sql` em `plan(20)`.

**O que segue aberto, e é de outra natureza:** a governança LGPD de terceiros
(pré-requisito 4, card `BLOCK-LEGAL-AI`) e o **fundamento jurídico** da
exposição — não é trabalho técnico, e é o portão que o responsável mantém. Os
outros quatro pré-requisitos estão satisfeitos.

**Risco residual, declarado e não maquiado:** quem tem o direito de ver pode
guardar o que viu. O produto mitiga por consentimento informado, não por
criptografia — e a governança LGPD de terceiros (pré-requisito 4,
`BLOCK-LEGAL-AI`) segue como portão antes de expor o campo ao público.

## Consequences

- `RECON-005` (tela `/profile`, prancha 51) fica **bloqueado** até D1–D3 serem
  aprovados. A tela pode ser construída depois sem retrabalho, porque a
  composição visual não depende do contrato de dados — só os campos dependem.
- `BLOCK-AFFILIATION` deixa de ser um bloqueio sem saída e passa a ter um
  caminho nomeado.
- Nada aqui autoriza processamento novo enquanto o status for `proposed`.

## Prerequisites

1. Aprovação humana explícita do responsável, campo a campo.
2. Modelo de ameaça: o que um membro mal-intencionado faz sabendo a OM de outro.
3. Texto de consentimento na tela de edição, dizendo o que muda ao ligar o
   controle — quem passa a ver, e que desligar não desfaz o que já foi visto.
4. Governança LGPD (`BLOCK-LEGAL-AI` cobre a parte de terceiros).
5. pgTAP com positivo e negativo por campo: dono lê, terceiro autorizado lê
   quando visível, terceiro não lê quando invisível, remoção apaga.

## Status

**`approved` em 17/09/2026.** Escrito em 08/09/2026 pelo coordenador da
reconstrução web, ao encontrar o bloqueio na prática: o validador de contrato
recusou `RECON-005` por elevação automática a R3, e a recusa estava certa.

**O que o responsável aprovou (17/09/2026), em bloco:** D1 (visibilidade **por
campo**, tabela própria, RLS do dono, padrão invisível, coluna e policy na mesma
migration), D2 (**somente** Força Armada e OM — status, turma e classe seguem
fora, e o `ADR-20260811-om-declarada` continua **não aprovado** para o escopo
maior) e D3 (remover **apaga** a linha, com teste de leitura por terceiro).

**Pré-requisitos, com o estado real de cada um:**

| # | Pré-requisito | Estado |
|---|---|---|
| 1 | Aprovação humana explícita | ✅ 17/09/2026 |
| 2 | Modelo de ameaça | ✅ nesta ADR, seção "Threat model (enumeração)", 17/09/2026 |
| 3 | Texto de consentimento na edição | PENDENTE — entra com a tela; é copy que diz quem passa a ver e que desligar não desfaz o que já foi visto |
| 4 | Governança LGPD de terceiros | PENDENTE e externo — card `BLOCK-LEGAL-AI` |
| 5 | pgTAP positivo e negativo por campo | PENDENTE — entra com a migration |

Os pré-requisitos 3 e 4 governam a **exposição** do campo ao público; o contrato
técnico (1, 2 e 5) pode e deve ser construído agora, com o campo desligado por
padrão, sem que nada seja processado para quem não declarou.
