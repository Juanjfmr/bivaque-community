---
id: ADR-20260909-midia-de-membro
status: approved
risk: R3
owner: Juan
approved_at: 2026-09-09
expires_at:
linked_plan: docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md
critic_verdict:
critic_review: Sem critico adversarial nesta rodada. A aprovacao registrada e autorizacao humana explicita do dono (Juan) na sessao de 09/09/2026 — ver a secao Approval.
---

# Um contrato só para a imagem que o membro envia

## Problem

Quatro telas das pranchas restantes precisam guardar imagem enviada por membro, e nenhuma tem
contrato: fotos de anúncio (pranchas 13, 63, 64, 21), fotos de imóvel (19, 65), banner e
miniatura de comunidade (43, e o handoff de 09/09 registra a ausência), e foto em publicação
(45). Existem hoje três buckets — `avatars`, `event-photos`, `verification-documents` — cada um
com a sua política, escritos em ondas diferentes.

Sem uma decisão única, cada lote inventa o seu bucket, o seu limite e a sua regra de leitura.
Foi assim que este repositório produziu quatro vazamentos de privacidade: a coluna de escopo e
a policy que a lê chegaram em migrations diferentes.

## Decision

**Um bucket privado por domínio, nunca público, e a leitura sempre derivada do acesso ao objeto
que a imagem ilustra.**

### D1 — Buckets

Três novos, `public: false`: `listing-photos` (Mercado e Moradia), `community-images` (banner e
miniatura) e `post-photos` (publicação). Limite de 10 MB por arquivo e
`allowed_mime_types = {image/jpeg, image/png, image/webp}`, iguais aos das pranchas.

### D2 — Quem lê

A policy de `storage.objects` para cada bucket **repete a autorização do recurso**: quem pode
ler o anúncio pode ler a foto dele; quem é membro da comunidade pode ler a imagem dela; quem
pode ler a publicação pode ler a foto dela. Nada de URL pública, nada de "por obscuridade".
O caminho do objeto começa pelo id do recurso, de modo que a policy consegue fazer o `join`.

### D3 — Quem escreve

Só o dono do recurso, e só enquanto o recurso existir. Upload interrompido deixa objeto órfão:
o job de limpeza remove objeto sem recurso correspondente com mais de 24 h. Remover a imagem do
recurso **remove o objeto** — o produto não pode dizer "removida" e manter o arquivo alcançável.

### D4 — Limites por recurso

Anúncio: até 6 fotos (a prancha 63 diz isso na tela). Imóvel: até 12. Comunidade: um banner e
uma miniatura. Publicação: uma foto. O limite é validado no servidor, não só no formulário.

### D5 — O que não entra

Nenhuma imagem de documento de identidade fora de `verification-documents`, que continua com o
contrato próprio. Nenhum EXIF preservado: metadado de câmera carrega coordenada geográfica, e
a §4.7 proíbe expor endereço residencial. O arquivo é reescrito sem EXIF na entrada.

## Alternatives considered

1. **Um bucket único para tudo.** Mais simples de criar, mas a policy vira uma cadeia de `or`
   sobre quatro domínios, e um erro num ramo vaza os outros três. Recusada.
2. **Bucket público com nome imprevisível.** É o que a maioria dos produtos de classificados
   faz. Recusada: o anúncio da prancha 63 é visível **apenas para membros de uma comunidade**;
   um link público derruba esse escopo.
3. **Guardar a imagem em coluna `bytea`.** Evita a policy de storage, mas destrói o desempenho
   da listagem e não tem CDN. Recusada.
4. **Adiar as imagens e entregar as telas sem foto.** É o que a entrega anterior fez com a bio.
   Recusada pela regra do dono: o backend entra junto da tela.

## Market or reference baseline

Classificados e marketplaces comunitários (OLX, Facebook Marketplace, Nextdoor) servem mídia
por CDN pública com URL não adivinhável. Produtos com conteúdo restrito a grupo (Slack, Discord,
Notion) servem por URL assinada de vida curta derivada da permissão do recurso.

## Proposed divergence from baseline

Divergimos do padrão de classificados e seguimos o padrão de conteúdo restrito, porque o
Bivaque tem anúncio com público de comunidade. URL assinada de vida curta, emitida pelo
servidor depois de checar o acesso ao recurso.

## Evidence and sources

- Pranchas 13, 19, 21, 43, 45, 63, 64, 65 — leitura em
  [`PRANCHAS-WEB-RESTANTES.md`](../agents/PRANCHAS-WEB-RESTANTES.md).
- Buckets existentes: `supabase/migrations/` (`avatars`, `event-photos`,
  `verification-documents`).
- §4.7 R49/R53 da especificação: "Não expor endereço residencial".
- `AGENTS.md` §"Scope column and the policies that read it land in the same migration".

## Benefits

Um contrato de mídia em vez de quatro. A policy de leitura passa a ser derivada, o que faz a
revogação de acesso ao recurso revogar a imagem no mesmo ato.

## Risks

- **Privacidade:** EXIF com coordenada é o vazamento mais provável; D5 o remove na entrada.
- **Operacional:** URL assinada de vida curta invalida cache de navegador; a listagem precisa
  de assinatura em lote para não virar N+1.
- **Custo:** storage cresce com anúncio encerrado; o expurgo entra com o ciclo de vida do
  anúncio, não depois.

## Reversal cost

Alto depois que houver imagem de membro no ar: mudar de bucket privado para público exige
migrar objetos e reescrever URLs persistidas. Baixo antes da primeira publicação.

## Success metric

Uma conta sem acesso ao recurso recebe negativa ao pedir a imagem por URL direta, provado por
pgTAP e por chamada sem UI. Remover a imagem torna o objeto inalcançável na mesma transação.

## Reopen condition

Se o produto passar a ter anúncio realmente público (fora de comunidade e fora de cidade), o
D2 precisa de um ramo novo e este ADR é reaberto.

## Approval

Aprovado em 09/09/2026 pelo dono do produto (Juan), por autorização explícita na sessão de
Claude Code que redigiu este ADR: "Aprovo as adr", referindo-se aos seis ADRs de 09/09/2026
listados em [RECON-WEB-EXECUCAO.md](../agents/RECON-WEB-EXECUCAO.md).

Destrava os contratos que criam bucket e policy de midia: RECON-025, RECON-026, RECON-027 e RECON-034.

**Nenhum crítico adversarial revisou este ADR.** A aprovação é humana e direta; a revisão
independente continua exigida por lote, sobre o diff que implementar estas decisões.
