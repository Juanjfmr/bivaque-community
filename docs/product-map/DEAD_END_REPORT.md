# Bivaque — Dead End Report

Baseline estática de navegação. Achados confirmados por leitura direta do código são separados de candidatos que ainda exigem prova em browser ou busca runtime.

## Resumo

| ID | Tipo | Severidade | Página/controle | Estado |
|---|---|---:|---|---|
| `NAV-001` | dead control | alta | `NOT-01` / controle Notificações | confirmado estaticamente |
| `NAV-002` | orphan candidate | média | `OWN-04` | candidato |
| `NAV-003` | orphan candidate | média | `COM-05` | candidato |

## NAV-001 — controle de Notificações não navega

**Página alvo:** `NOT-01` — `/notifications`  
**Estado:** confirmado estaticamente.

A rota existe, mas o controle “Notificações” no `AppShell` é renderizado como `<button>` sem `href`, `onClick` ou `onPress`. Portanto o usuário recebe uma affordance de navegação que não leva à tela existente.

**Impacto:** a rota pode ser acessível por URL direta ou outra entrada não inspecionada, mas o caminho principal apresentado pelo shell está quebrado.

**Correção esperada:** transformar o controle em navegação real para `NOT-01` e cobrir a transição em Playwright.

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

## O que não é marcado como dead-end

- páginas do `member_shell` herdam Cidade, Comunidade, Grupos, Perfil e Indicações;
- páginas do portal de prestador herdam Painel, Ficha e Catálogo;
- páginas do operador herdam as quatro seções administrativas;
- páginas por token/callback são entradas externas/sistêmicas;
- estados de loading/error/empty não foram tratados como páginas separadas nesta baseline.

## Próxima prova recomendada

Adicionar uma auditoria E2E que percorra o grafo por persona e registre:

1. IDs alcançados;
2. controle usado para cada aresta;
3. URL final;
4. páginas registradas nunca visitadas;
5. controles clicáveis que não mudam estado/rota;
6. exceções intencionais por token, callback ou terminal explícito.

Isso transforma esta baseline documental em um detector de regressão de navegação.
