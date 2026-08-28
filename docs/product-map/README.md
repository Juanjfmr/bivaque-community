# Bivaque — Product Page Map

Baseline estática do mapa de páginas e navegação do Bivaque.

**Fonte analisada:** `main` @ `53295458b9ad`  
**Páginas de UI registradas:** 40  
**Escopo:** rotas `page.tsx`, shells de navegação, redirects do middleware e transições explícitas relevantes.

## Objetivo

Dar um identificador estável a cada página e transformar a navegação em um grafo auditável. O ID não depende da URL nem do nome do componente, portanto pode ser usado em issues, testes E2E, screenshots, auditorias e documentação.

Exemplos:

- `LOC-01` — Cidade
- `COM-03` — detalhe de uma comunidade
- `EVT-02` — detalhe de evento
- `ME-01` — perfil do próprio membro
- `OWN-04` — prestadores no console da comunidade

## Arquivos

- `PAGE_REGISTRY.yaml` — fonte de verdade do inventário, perfis de navegação, arestas verificadas e flags.
- `FLOW_MAP.md` — visão legível dos principais workflows.
- `DEAD_END_REPORT.md` — achados e candidatos que exigem correção ou prova em browser.

`docs/journeys/MAP.md` continua histórico e não deve voltar a ser usado como fonte atual.

## Convenção dos IDs

`<SEÇÃO>-<NN>`

| Prefixo | Seção |
|---|---|
| `PUB` | Público |
| `AUTH` | Autenticação/consentimento |
| `ONB` | Onboarding |
| `INV` | Convites |
| `LOC` | Localidade |
| `EVT` | Eventos |
| `PRV` | Prestadores vistos por membros |
| `COM` | Comunidades |
| `REC` | Indicações |
| `GRP` | Grupos |
| `ME` | Perfil |
| `MSG` | Mensagens |
| `NOT` | Notificações |
| `PRO` | Portal do prestador |
| `ADM` | Operação/admin |
| `OWN` | Console da comunidade |

## Regra de classificação

Uma rota não é automaticamente um fluxo. O mapa distingue:

- **verified edge** — existe link, `router.push/replace` ou transição explícita inspecionada;
- **system edge** — redirect/gate do middleware;
- **inherited exit** — saída disponível porque a página está dentro de um shell;
- **external entry** — token/callback pode ser o ponto de entrada, então ausência de link interno não implica órfão;
- **dead control** — affordance visível que não executa a navegação/ação esperada;
- **orphan candidate** — página existe, mas não foi encontrada entrada nas superfícies estáticas inspecionadas;
- **confirmed runtime defect** — exige prova em browser; esta baseline não promove candidatos para essa classe sozinha.

## Uso em trabalho futuro

Ao criar ou remover uma página:

1. preserve IDs existentes;
2. atribua um novo ID dentro da seção;
3. registre rota, arquivo, acesso e shell;
4. atualize as arestas;
5. rode a auditoria de navegação/Playwright;
6. só então remova uma flag de órfão ou dead-end.

Este mapa documenta o produto existente; não cria páginas nem altera comportamento.
