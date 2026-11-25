# ADR-20261125-textos-legais-v3-e-termo-de-uso

Status: Aceito por delegação — aguarda ratificação

Data: 25/11/2026

## Contexto

A revisão jurídica dos textos legais da entrada (bloco entregue ao dono em 25/11, card
BLOCK-LEGAL-ENTRY) encontrou: aceite do app citando "os Termos" sem documento existente (o link
abria `/ajuda`), nenhuma base legal declarada por finalidade, contradição de versão/data entre os
documentos ("Versão 2 · 31 de agosto de 2026") e as telas ("01/11/2026"), frases de aceite em
contradição com a política ("apagar a conta apaga seus dados" × retenção de registros;
"não guardamos" × "sem guardar em texto aberto"), incidentes sem o prazo da Resolução CD/ANPD
nº 15/2024 e transferência internacional sem tratativa (art. 33 da LGPD, Resolução CD/ANPD
nº 19/2024).

O dono decidiu em 25/11: Termo de Uso completo (decisão 1C), versão datada da publicação (2A),
consentimento como base da consulta de elegibilidade (3A — o dono confirmou que o aceite existente
na entrada é o consentimento), maiores de 18 (4A), cláusulas-padrão dos provedores como mecanismo de
transferência (5A), canal bivaque.suporte@gmail.com (6) e retenção do CPF em forma não reversível
(7B).

Sobre o 7B, o código diz outra coisa: `verifyEligibility`
(`apps/web/lib/onboarding/verifyAndProvision.ts`) grava só status e classe de elegibilidade em
`private.verification_outcomes`, sem coluna de CPF; o número não fica guardado em nenhuma forma, e
o SEC-007 já evita re-consulta de quem está verificado. A política passa a declarar a realidade
(nada retido) em vez de prometer um recurso que não existe.

## Decisão

1. `docs/legal/PRIVACIDADE.md` sobe para a **Versão 3 · 25 de novembro de 2026**: bases legais por
   finalidade (LGPD, art. 7º), papel de operador dos provedores (art. 5º, VIII), transferência
   internacional pelas cláusulas-padrão ou termos equivalentes de cada provedor (art. 33;
   Resolução CD/ANPD nº 19/2024), CPF declarado como não retido em nenhuma forma, prazo de 3 dias
   úteis para comunicação de incidente enquadrado (Resolução CD/ANPD nº 15/2024), direitos do
   titular completos (arts. 18 e 19), seção de crianças e adolescentes (maiores de 18) e canal
   bivaque.suporte@gmail.com.
2. `docs/legal/TERMOS_DE_USO.md` é criado (**Versão 1 · 25 de novembro de 2026**): serviço em alpha,
   conta e elegibilidade, conduta com remissão ao Código, licença de conteúdo limitada ao
   funcionamento do serviço, anúncios e prestadores sem garantia do Bivaque sobre negócios entre
   membros, pagamentos só com nova versão, responsabilidade na extensão da lei (inclusive Marco
   Civil), relação de consumo com foro do domicílio do usuário (CDC).
3. `docs/legal/CODIGO_DE_CONDUTA.md` sobe para a **Versão 3**: mesma data, citação do Estatuto dos
   Militares (Lei nº 6.880/1980) na regra de política partidária e canal
   bivaque.suporte@gmail.com para revisão de decisão.
4. `CONSENT_VERSION` e `CODE_OF_CONDUCT_VERSION` sobem de 2 para 3
   (`packages/domain/src/consent.ts`, fonte única): as mudanças são materiais e todo membro aceita
   de novo na entrada. A linha de aceite continua gravando política e conduta; o Termo de Uso viaja
   no mesmo evento de aceite (v3), porque os três documentos versionam juntos. Coluna própria de
   versão do Termo foi considerada e rejeitada: exigiria migration e mudança nas RPCs sem ganho
   operacional enquanto os documentos sobem juntos.
5. A frase de aceite passa a citar os três documentos, com o link "Termo de Uso" apontando para a
   nova página `/termos-de-uso` (web) em vez de `/ajuda`, e a data unificada 25/11/2026. As frases
   da tela "Antes de começar" passam a dizer a verdade da política: o CPF é usado só na consulta ao
   Portal e não fica guardado; apagar a conta remove os dados conforme a política.
6. O canal do controlador muda para bivaque.suporte@gmail.com nos textos legais. O endereço real em
   código segue vindo de `NEXT_PUBLIC_SUPPORT_EMAIL` (o guarda de `tests/scope/support-channel.test.mjs`
   proíbe endereço real no bundle); definir a variável em produção é ato do dono.

## Desvios das decisões do dono, registrados

- **7B→7A:** o CPF não é retido em forma alguma (o código não guarda o número nem digest dele).
  Implementar o 7B (digest para evitar re-consulta) exigiria migration, nova finalidade e mudança no
  texto prometido ao usuário, sem necessidade conhecida — quem está verificado não re-consulta
  (SEC-007). Recomendação: manter o 7A. Ratificar o desvio ou pedir a implementação.
- **6 (parcial):** o canal novo foi adotado; a constituição de pessoa jurídica do controlador fica
  para antes da ativação de cobranças (BLOCK-ASAAS), como decidido.

## Consequências

- Todo membro existente aceita os três documentos na próxima entrada (CONSENT_VERSION=3).
- O app (SPA) ganhou a rota `termos-de-uso` com um resumo da tela, rotulado como
  resumo: o documento integral é o markdown servido pela web (`/privacidade`,
  `/termos-de-uso`, `/codigo-de-conduta`), que é o texto que o aceite grava. As telas
  de Política e Conduta do app seguem resumos, agora rotulados com a versão que
  cobrem; unificar resumo e integral é pauta da troca das telas antigas, não deste lote.
- E2E que escreve o cookie do aceite à mão usa `CURRENT_CONSENT` do helper (guarda em
  `tests/scope/consent-version.test.mjs`), atualizado junto.
- Resíduos: conferir, provedor por provedor, que o DPA/termos em vigor (Supabase, Vercel, Sentry,
  Google) cobrem os dados do Bivaque; revisão final por advogado habilitado (OAB) é ato do dono e
  pré-requisito da abertura pública; auditoria do `security-auditor` deste lote fica pendente no
  card BLOCK-LEGAL-ENTRY.

## Prova

- Textos: `docs/legal/PRIVACIDADE.md`, `docs/legal/TERMOS_DE_USO.md`,
  `docs/legal/CODIGO_DE_CONDUTA.md` (Versão 3/1 · 25/11/2026).
- Versões: `packages/domain/src/consent.ts` (3/3); `tests/e2e/helpers/session.ts` (`CURRENT_CONSENT
  = "3"`); guarda de escopo `tests/scope/consent-version.test.mjs` verde.
- Página pública do Termo: `/termos-de-uso` na superfície pública do proxy
  (`lib/security/route-surface.ts`, prova em `tests/unit/security/route-surface.test.ts`) e
  rota de resumo no app (`lib/navegacao/rotas.ts` + `telas/Termos.tsx`); E2E de páginas legais
  públicas cobre as três (`tests/e2e/entrada-convite-publica.spec.ts`).
- Não há coluna de CPF em `private.verification_outcomes`
  (`supabase/migrations/20260802000200_private_trust_family_foundation.sql`); `verifyEligibility`
  grava só `p_status` e `p_eligibility_class`.
