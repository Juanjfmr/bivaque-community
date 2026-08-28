# Bivaque — Product Page Map

Mapa executável das páginas e da navegação do Bivaque.

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

## Arquivos e gates

- `PAGE_REGISTRY.yaml` — fonte de verdade do inventário, perfis de navegação, arestas e flags.
- `FLOW_MAP.md` — visão legível dos principais workflows.
- `DEAD_END_REPORT.md` — achados, candidatos e estado de prova.
- `tests/scope/product-page-map.test.mjs` — gate estrutural rápido, incluído em `test:scope`/`pnpm test`.
- `tests/e2e/product-page-map-navigation.spec.ts` — prova em navegador das arestas seguras declaradas.

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
- **confirmed runtime defect** — exige prova em browser; análise estática sozinha não promove candidato para essa classe.

## Como a automação funciona

### 1. Gate estrutural

O teste de `tests/scope/` compara `PAGE_REGISTRY.yaml` com a árvore real de `apps/web/app/**/page.tsx` e falha se houver drift. Também valida unicidade dos IDs/rotas/arquivos e integridade das referências do grafo.

Esse gate não precisa de browser, Supabase ou dependência YAML adicional: o parser é propositalmente restrito ao schema simples deste registry.

### 2. Gate runtime

O Playwright autentica uma conta seeded e percorre apenas arestas explicitamente consideradas seguras. Não existe crawler que “clica em tudo”: botões de moderação, exclusão, revogação, RSVP ou outras mutações nunca entram automaticamente no grafo.

A primeira fatia cobre o `member_shell` nos três projetos Playwright existentes: 375, 768 e 1440 px.

## Uso em trabalho futuro

Ao criar ou remover uma página:

1. preserve IDs existentes;
2. atribua um novo ID dentro da seção;
3. registre rota, arquivo, acesso e shell;
4. atualize as arestas/flags;
5. rode `npx pnpm@11.18.0 test:scope`;
6. quando a mudança tocar navegação real, rode o spec Playwright correspondente;
7. só então remova uma flag de órfão ou dead-end.

O registry documenta o produto existente; os gates impedem que ele volte a divergir silenciosamente do runtime.
