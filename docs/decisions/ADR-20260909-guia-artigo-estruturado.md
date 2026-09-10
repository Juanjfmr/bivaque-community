---
id: ADR-20260909-guia-artigo-estruturado
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e autorizacao humana explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# O Guia tem artigo, e o artigo tem origem

## Problem

A prancha 25 desenha um **artigo editorial**: título, subtítulo, imagem de capa, data de
revisão, corpo em seis seções, índice "Neste guia", o cartão "Origem desta referência" ligando à
conversa que gerou a informação, e o caminho de correção.

A tabela `arrival_guide_entries` guarda `name`, `description`, `phone`, `website_url`,
`category`, `status` e `source_reply_id`. É um **diretório**, não um artigo.

O handoff de 09/09 registra a causa: o contrato RECON-013 foi escrito lendo o esquema da tabela
em vez do desenho, e a tela nasceu diretório. `source_reply_id` já existe — e a tela não usa.

Falta também o ciclo da §4.5 R38–R39: sugestão de correção que chega à curadoria, é decidida e
volta ao solicitante.

## Decision

### D1 — Artigo é uma entidade, o diretório continua sendo outra

`guide_articles` (localidade, categoria, slug, título, subtítulo, imagem de capa, resumo,
autoria de curadoria, `reviewed_at`, `status`) e `guide_article_sections` (artigo, ordem,
âncora, título, corpo). O índice "Neste guia" é gerado das seções — não é um campo separado que
pode divergir do corpo.

`arrival_guide_entries` **permanece** como está e continua sustentando a descoberta por
categoria da prancha 12. Um artigo pode referenciar entradas do diretório; não as substitui.

### D2 — Corpo em seções, não em HTML livre

Cada seção guarda texto simples com formatação mínima. Não guardamos HTML enviado por curadoria:
HTML livre em conteúdo lido por membros é superfície de injeção, e o repositório já mantém
varredura de conteúdo proibido sobre texto de membro.

### D3 — Origem

`source_reply_id` liga o artigo à resposta de recomendação que o originou. A tela mostra o
cartão **quando o dado existe** e o botão "Ver conversa" leva ao destino autorizado. Quando o
leitor não tem acesso àquela conversa, o cartão mostra a origem sem link — nunca vaza título,
autor ou conteúdo da conversa fechada.

### D4 — Versão e correção

`guide_article_revisions` guarda a versão publicada anterior a cada mudança aprovada.
`guide_correction_requests` (artigo, seção opcional, solicitante, descrição, referência
opcional, situação `received → in_review → applied | rejected`, decisão e justificativa).

**Enviar sugestão não publica nada.** A curadoria aplica ou rejeita com justificativa, a
publicação invalida o cache do artigo, e o solicitante recebe retorno pelo mecanismo de
notificação — só a informação permitida.

### D5 — IA não escreve o Guia

O conteúdo é curado e persistido. Nada de gerar texto a cada render; nada de IA aprovando
correção. Erro de fornecedor de IA não bloqueia curadoria humana nem vira conteúdo aprovado —
é o que a §4.5 R39 diz, e o que
[`ADR-20260815-guia-curadoria-ia`](ADR-20260815-guia-curadoria-ia.md) propôs sem aprovação.

## Alternatives considered

1. **Estender `arrival_guide_entries` com um campo de corpo longo.** Recusada: o índice, as
   âncoras e a revisão por seção não cabem num campo, e a tabela já tem a semântica de contato.
2. **Markdown num campo só, renderizado no cliente.** Simples, mas o índice passa a ser
   derivado de parsing e a correção por seção deixa de existir. Recusada.
3. **CMS externo.** Recusada: acrescenta fornecedor, credencial e fronteira de dados nova para
   um conteúdo que já é curado dentro do produto.
4. **Manter o diretório e não fazer artigo.** É o estado atual. Recusada: contradiz a prancha e
   a regra do dono sobre regressão.

## Market or reference baseline

Guias de bairro e wikis de comunidade (Nextdoor Neighborhood Guides, wikis locais) usam artigo
com seções e índice lateral, com sugestão de edição moderada antes de publicar.

## Proposed divergence from baseline

Não há edição aberta por membro. A sugestão vira protocolo para a curadoria; só a curadoria
publica.

## Evidence and sources

- Leitura da prancha 25 em [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md).
- §4.5 R36–R39 da especificação de 08/09.
- [`HANDOFF-2026-09-09-fidelidade-pranchas.md`](../agents/HANDOFF-2026-09-09-fidelidade-pranchas.md):
  "o RECON-013 foi escrito lendo o esquema da tabela em vez do desenho".
- Colunas atuais de `arrival_guide_entries` em `supabase/database.generated.ts`.

## Benefits

A tela do Guia passa a poder existir como desenhada. A origem deixa de ser uma coluna morta.
A correção ganha um ciclo com retorno, que é o que fecha o gate W05.

## Risks

- **Conteúdo:** artigo local com informação legal desatualizada engana quem chega; `reviewed_at`
  e o ciclo de correção são a mitigação.
- **Acesso:** a origem aponta para conversa de comunidade; D3 impede vazamento por essa ponte.
- **Operacional:** invalidação de cache esquecida faz a correção não aparecer — a prova de D4
  precisa observar a versão vigente depois de aplicar.

## Reversal cost

Médio. Artigos são conteúdo próprio, migráveis; as âncoras publicadas viram links quebrados se
o modelo mudar.

## Success metric

Jornada 6 da §10: Guia encontrado, artigo lido com índice funcionando por teclado, sugestão
enviada, curadoria publica, artigo e salvos mostram a versão vigente, solicitante recebe retorno.

## Reopen condition

Se a curadoria passar a ser distribuída (membros editando diretamente), D4 muda.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan), por autorização explícita na sessão de
Claude Code que redigiu este ADR: "Aprovo as adr", referindo-se aos seis ADRs de 09/09/2026
listados em [RECON-WEB-EXECUCAO.md](../agents/RECON-WEB-EXECUCAO.md).

Destrava o contrato RECON-030.

**Nenhum crítico adversarial revisou este ADR.** A aprovação é humana e direta; a revisão
independente continua exigida por lote, sobre o diff que implementar estas decisões.
