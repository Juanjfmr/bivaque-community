---
id: ADR-20260925-consulta-outra-cidade
status: accepted
risk: R3
owner: Juan
approved_at: 2026-09-25
accepted_at: 2026-09-25
expires_at:
linked_plan:
critic_verdict: pending
critic_review: Aprovação do dono na sessão de 25/09/2026 ("Aprovo a mudança. Inclusive essa regra de privacidade pode ser afrouxada"), sobre a tabela de consulta apresentada na mesma sessão. Revisão independente ainda não rodou.
---

# Consultar outra cidade e mudar a própria pelo perfil

## Problem

A cidade do membro era fixa na interface. O chip do cabeçalho era só texto, e a transferência
(`declare_locality_transfer`, [ADR-20260816-transferencia-e-pertencimento](ADR-20260816-transferencia-e-pertencimento.md))
existia no banco sem nenhuma tela que a chamasse. Quem vai ser transferido não conseguia olhar o
destino antes de chegar: a RLS só deixava ler conteúdo da própria cidade.

## Decision

1. **A cidade muda pelo perfil.** A seção "Sua cidade" chama `declare_locality_transfer` com o
   cliente da sessão. A cidade atual fica de saída até a data escolhida (padrão de 30 dias, teto de
   180). Só a cidade: endereço residencial continua nunca pedido nem guardado.
2. **O chip do cabeçalho abre a consulta a outra cidade** (`/cidade/[id]`), só leitura.
3. **A leitura abre para qualquer membro verificado**, definido como quem tem uma cidade atual
   (migration `20260925161111_consulta_outra_cidade`):
   - catálogo de cidades;
   - Guia aprovado e artigos publicados;
   - encontros de alcance cidade;
   - anúncios ativos de alcance cidade (Mercado e Imóveis), com foto e detalhe.
4. **Continua só de quem é da cidade:**
   - publicações, comentários e perguntas;
   - perfis, roster e grupos;
   - encontros de comunidade e de grupo;
   - quem vai a um encontro, e confirmar presença;
   - perguntar ao organizador;
   - corrigir o Guia e salvar referência do Guia;
   - anúncios de comunidade.
5. **Quem consulta pode chamar o anunciante de um anúncio de alcance cidade e salvar o anúncio.**
   `open_conversation` e `listing_saves` leem por `private.can_read_listing`, e esse é o caso de
   quem compra ou aluga na cidade para onde vai.

Os alertas de anúncio (`private.can_user_read_listing`) não mudam: continuam casando só com a
própria cidade.

## Alternatives considered

- **Manter a cidade fechada** (comportamento anterior): o transferido só vê o destino depois de
  mudar, que é exatamente quando já precisava ter resolvido escola e moradia.
- **Consulta que troca a cidade da sessão inteira** (cookie de contexto): toda tela passaria a ler
  outra cidade, inclusive as de publicar. Isso gera mais superfície de erro e ambiguidade sobre
  onde se publica.
- **Abrir tudo, inclusive posts e perfis:** expõe pessoas a quem não é da cidade, o que contraria
  o modelo de confiança por vila.

## Market or reference baseline

Produtos de comunidade local (Nextdoor, Facebook Marketplace) deixam anúncios e informações
públicas de outra região visíveis para consulta, mas restringem a conversa do bairro a quem é de lá.

## Proposed divergence from baseline

None.

## Evidence and sources

- `supabase/tests/consulta-outra-cidade.sql`: 19 asserções, com positivos e negativos.
- Testes antigos que afirmavam a negação agora aberta foram atualizados de forma deliberada, com o
  comentário "Consulta a outra cidade (20260925161111)": `listing-market`, `listings-moradia`,
  `arrival-guide`, `guide-article`, `events-rsvp`, `authz-*`, `locality-profile-*` e
  `full-regression`.
- `tests/unit/ui/cidade-consulta.test.ts`.

## Benefits

O transferido conhece o destino (Guia, encontros, moradia, mercado) antes de chegar, e a mudança
de cidade finalmente tem uma tela.

## Risks

- **Mais gente lê anúncio de alcance cidade:** qualquer membro verificado do país passa a ler. O
  anunciante escolhe o alcance; o de comunidade continua fechado.
- **Consultas que dependiam só da RLS para escopo de cidade passariam a trazer outras cidades.**
  A varredura de 25/09 achou uma: `searchProperties`, agora com escopo obrigatório.

## Reversal cost

Uma migration que recria as quatro policies e a função com o ramo antigo. Não há dado a migrar.

## Success metric

Membros consultam cidades de destino antes de declarar a transferência (acessos a `/cidade/[id]`
seguidos de mudança).

## Reopen condition

Abuso de contato em anúncios por quem não é da cidade, ou pedido do dono para fechar algum dos
itens abertos.

## Approval

Juan, na sessão de 25/09/2026.
