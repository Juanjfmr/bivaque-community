---
id: ADR-20260831-mobile-native
status: accepted
risk: R3
owner: Juan
approved_at: 2026-08-31
expires_at:
linked_plan:
critic_verdict: pass
critic_review: "PASS independente em 2026-08-31: R3, guardrail apps/{web,mobile}, fundação sem sessão/dados e fronteiras anon/JWT, RLS e private preservadas."
---

# Cliente nativo React Native + Expo no monorepo

## Problem

O Bivaque precisa chegar às lojas Android e iOS sem substituir o web desktop nem duplicar
regras de produto. A decisão D31 adiava o app nativo e a guarda de escopo proibia
`apps/mobile`, impedindo qualquer fundação executável.

## Decision

Emendar somente a cláusula de app nativo da D31: o Bivaque terá um cliente React Native
com Expo em `apps/mobile`, no mesmo monorepo. Ele será um cliente par do web desktop:
compartilha contratos de domínio e regras de autorização, mas não componentes visuais web
nem WebView.

Esta decisão não reativa IA, DM entre membros, vídeo, push, SMS ou modo escuro. Não muda
RLS, o schema `private`, dados pessoais, verificação ou permissões de backend. A fundação,
sessão, navegação e cada jornada nativa serão entregues por contratos separados.

O app só pode portar a chave pública/anon e o JWT da sessão do próprio usuário. É vedado
incluir `service_role`, qualquer segredo ou acesso ao schema `private`. A autorização
permanece no servidor e nas políticas RLS; a UI nativa nunca é uma barreira de autorização.
Qualquer jornada autenticada precisa de contrato R3 próprio, incluindo armazenamento seguro,
revogação, purge de cache e testes positivos e negativos para o caller móvel.

## Alternatives considered

1. Manter o adiamento e a proibição de `apps/mobile`. Elimina custo imediato, mas impede o
   lançamento nas lojas solicitado pelo dono.
2. Criar um repositório mobile separado. Dá isolamento máximo, mas duplica setup, CI e a
   publicação coordenada de contratos no momento em que o produto ainda é pequeno.
3. Empacotar o web em WebView. Reduz custo inicial, mas não atende à experiência nativa,
   acessibilidade e navegação esperadas para Android e iOS.
4. Adotar React Native + Expo em `apps/mobile` no monorepo. Mantém contratos versionados
   junto ao backend e permite implementação visual realmente nativa; esta é a decisão.

## Market or reference baseline

Produtos com web e app móvel normalmente compartilham contratos, domínio e serviços, mas
mantêm interfaces e padrões de plataforma próprios. Expo oferece o fluxo gerenciado para
React Native com alvos Android e iOS, sem converter o cliente em uma página web embarcada.

## Proposed divergence from baseline

Nenhuma. O monorepo é uma escolha de entrega para o estágio atual; cada app continua um
cliente independente e deve preservar padrões nativos.

## Evidence and sources

- Direção explícita do dono em 2026-08-31: web para desktop e app nativo Android/iOS.
- `docs/BIVAQUE.md` §8 e D31, emendados nesta decisão.
- `AGENTS.md` e `tests/scope/workspace-foundation.test.mjs` continham a restrição a
  `apps/mobile` que esta decisão remove.
- Parecer independente anterior apontou como condições inegociáveis: sem WebView, sem
  ampliação de dados/autorizações e com a fundação entregue em fatias verificáveis.

## Benefits

Cria um caminho direto para distribuição nas lojas sem transformar o web responsivo em
substituto de aplicativo e sem copiar as regras de produto em outro repositório.

## Risks

- Dois clientes podem divergir em comportamento ou autorização.
- Sessões móveis, deep links, cache e logs exigem desenho específico antes de qualquer
  jornada autenticada.
- Expo e dependências nativas acrescentam custo de CI e de publicação.
- Uma tentativa de reutilizar UI web pode degradar acessibilidade e experiência de plataforma.
- Um token, log ou cache mal protegido no aparelho pode expor a sessão do membro.

## Reversal cost

Média antes de publicação: remover o workspace e o CI. Alta depois de publicar, pois exige
compatibilidade para versões instaladas, despublicação coordenada e comunicação aos usuários.

## Success metric

A fundação Expo inicia nativamente no Android e iOS sem WebView. A golden slice só mede
sucesso após seu contrato R3 de sessão e paridade comportamental estar aprovado.

## Reopen condition

Reabrir se a fundação não conseguir manter contratos compatíveis, se surgir incidente de
sessão/dados no cliente ou se o custo de manter o monorepo impedir releases confiáveis.

## Approval

Aprovado explicitamente pelo dono nesta conversa em 2026-08-31: “Eu quero reescrever e
derrubar essas restrições”, após autorizar o card mobile e confirmar a continuidade. A
emenda é limitada ao app nativo; as demais exclusões de D31 permanecem vigentes. A decisão
só fica operável após parecer independente `PASS` registrado acima.
