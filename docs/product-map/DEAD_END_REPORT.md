# Bivaque — Dead End Report

Baseline de navegação com duas classes de evidência: análise estática e prova em browser.

## Resumo

| ID | Tipo | Severidade | Página/controle | Estado |
|---|---|---:|---|---|
| `NAV-001` | dead control | alta | `NOT-01` / controle Notificações | corrigido estaticamente; prova runtime pendente |
| `NAV-002` | orphan candidate | média | `OWN-04` | candidato |
| `NAV-003` | orphan candidate | média | `COM-05` | candidato |

## NAV-001 — controle de Notificações

**Página alvo:** `NOT-01` — `/notifications`  
**Estado:** corrigido no código; incluído no gate Playwright.

A baseline inicial encontrou a rota existente e um controle “Notificações” no `AppShell` renderizado como `<button>` sem `href`, `onClick` ou `onPress`. O shell agora expõe um link real para `/notifications` preservando a mesma aparência e nome acessível.

A aresta `member_shell → NOT-01` faz parte de `tests/e2e/product-page-map-navigation.spec.ts`. O status só deve ser promovido para prova runtime depois de execução Playwright verde contra banco seeded.

## NAV-002 — `OWN-04` sem entrada observada

**Página:** `OWN-04` — `/communities/[id]/admin/providers`  
**Estado:** candidato estático.

A página existe e o shell administrativo da comunidade garante saídas para Pedidos de entrada e retorno à comunidade. Porém:

- o layout do console expõe apenas Pedidos de entrada + Voltar à comunidade;
- `OWN-01` expõe Pedidos de entrada + Moderadores;
- o detalhe da comunidade inspecionado leva moderadores a Pedidos de entrada.

Nenhuma dessas superfícies aponta para `OWN-04`.

**Impacto:** a tela não é um dead-end de saída, mas pode ser uma rota órfã de entrada.

**Prova necessária:** browser/navigation trace de um moderador/dono ou busca runtime completa antes de promover para defeito confirmado.

## NAV-003 — `COM-05` sem entrada observada

**Página:** `COM-05` — `/communities/[id]/indicar-prestador`  
**Estado:** candidato estático.

A rota contém um formulário funcional de convite de prestador. Nas superfícies de Cidade, lista de Comunidades e detalhe de Comunidade inspecionadas, não foi observada uma entrada para essa rota.

**Impacto:** funcionalidade implementada pode ficar invisível ao usuário.

**Prova necessária:** trace de navegação de membro aprovado e busca runtime completa. Se nenhuma entrada existir, a correção deve criar um caminho contextual a partir da comunidade, sem promover a funcionalidade a uma nova aba global.

## Guardrails automatizados

`tests/scope/product-page-map.test.mjs` bloqueia:

1. página `page.tsx` nova/removida sem atualização do registry;
2. IDs, rotas ou arquivos duplicados;
3. rota declarada incompatível com a estrutura real do App Router;
4. arestas, external entries, audit flags ou inherited exits apontando para IDs inexistentes;
5. `inbound_status` sem flag de auditoria correspondente;
6. qualquer `dead_control` mantido como `confirmed_static` na baseline aceita.

`tests/e2e/product-page-map-navigation.spec.ts` prova as saídas seguras do shell do membro em 375, 768 e 1440 px, usando apenas navegação — sem clicar em ações destrutivas.

## O que não é marcado como dead-end

- páginas do `member_shell` herdam Cidade, Comunidade, Grupos, Perfil, Indicações e Notificações;
- páginas do portal de prestador herdam Painel, Ficha e Catálogo;
- páginas do operador herdam as quatro seções administrativas;
- páginas por token/callback são entradas externas/sistêmicas;
- estados de loading/error/empty não são páginas separadas nesta baseline.

## Próximas extensões

Depois da baseline do membro ficar verde, o mesmo contrato pode crescer por persona: prestador, operador e moderador/dono. Cada nova aresta deve ser segura, explícita e coberta sem crawler indiscriminado.
